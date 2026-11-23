// @repo/billing/plans - the price list, in CODE (not the database): a price change is a reviewed commit, never a row
// someone edited. Pure: no env, no database - the browser imports it too (`@repo/billing/plans`).
//
// Money is integer MINOR units (paisa / cents). Credits (Boli): 1 credit = Rs 1 = 100 paisa, stored as integer
// MICRO-credits (1 credit = 1,000,000). These mirror apps/main/lib/boli.ts (the source) - keep them equal.

/** Micro-credits per credit. */
export const MICRO_PER_CREDIT = 1_000_000
/** Paisa per credit (1 credit = Rs 1). */
export const PAISA_PER_CREDIT = 100
/** The one-time welcome grant, on email verification. */
export const WELCOME_CREDITS = 100
/** A custom credit purchase (credits = rupees). */
export const ADD_CREDITS_MIN = 100
export const ADD_CREDITS_MAX = 100_000

export const BILLING_CURRENCIES = ['NPR', 'INR', 'USD'] as const
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number]

export function isBillingCurrency(v: unknown): v is BillingCurrency {
    return typeof v === 'string' && (BILLING_CURRENCIES as readonly string[]).includes(v)
}

export const CURRENCY_LABELS: Record<BillingCurrency, string> = {
    NPR: 'Nepali rupee (NPR)',
    INR: 'Indian rupee (INR)',
    USD: 'US dollar (USD)',
}

export type PlanCode = 'free' | 'pro'

export interface Plan {
    code: PlanCode
    name: string
    /** One line on what it is for. */
    summary: string
    /** Whole credits added with each paid month (Pro). The Free plan's welcome grant is WELCOME_CREDITS, not this. */
    monthlyCredits: number
    /** Price of ONE month, minor units per currency. Null = free. */
    monthlyPrice: Record<BillingCurrency, number> | null
    features: string[]
}

export const PLANS: Record<PlanCode, Plan> = {
    free: {
        code: 'free',
        name: 'Free',
        summary: 'Try everything with a starter balance of credits.',
        monthlyCredits: 0,
        monthlyPrice: null,
        features: [`${WELCOME_CREDITS} credits when you verify your email`, 'Top up credits any time'],
    },
    pro: {
        code: 'pro',
        name: 'Pro',
        summary: 'For everyday use, with credits added every month.',
        monthlyCredits: 5000,
        monthlyPrice: { NPR: 99900, INR: 49900, USD: 900 },
        features: ['5,000 credits every month', 'Top up credits any time', 'Pay for 1, 3 or 12 months, or renew automatically'],
    },
}

/** Prepaid terms. Auto-renew is always monthly. */
export const TERMS = [
    { months: 1, discountPercent: 0, label: '1 month' },
    { months: 3, discountPercent: 10, label: '3 months' },
    { months: 12, discountPercent: 20, label: '12 months' },
] as const
export type TermMonths = (typeof TERMS)[number]['months']

export function isTermMonths(v: unknown): v is TermMonths {
    return typeof v === 'number' && TERMS.some((t) => t.months === v)
}

/**
 * Price of `months` of a plan in `currency`, minor units: monthly x months, less the term's discount, rounded to a
 * whole major unit (Rs 2,697.30 -> Rs 2,697) so a price never shows odd paisa. Integer math only.
 */
export function planPrice(plan: PlanCode, currency: BillingCurrency, months: TermMonths): number | null {
    const monthly = PLANS[plan].monthlyPrice?.[currency]
    if (!monthly) return null
    const term = TERMS.find((t) => t.months === months)
    if (!term) return null
    const gross = monthly * months
    const net = Math.round((gross * (100 - term.discountPercent)) / 100)
    return Math.round(net / 100) * 100
}

export interface CreditPack {
    code: string
    credits: number
    /** Minor units. Credits are sold in NPR only (1 credit = Rs 1). */
    price: Partial<Record<BillingCurrency, number>>
}

export const CREDIT_PACKS: CreditPack[] = [100, 500, 1000].map((credits) => ({
    code: String(credits),
    credits,
    price: { NPR: credits * PAISA_PER_CREDIT },
}))

export function findPack(code: string): CreditPack | null {
    return CREDIT_PACKS.find((p) => p.code === code) ?? null
}

/** Whether `credits` is a whole number a person may buy (ADD_CREDITS_MIN..ADD_CREDITS_MAX). */
export function isPurchasableCredits(credits: unknown): credits is number {
    return typeof credits === 'number' && Number.isInteger(credits) && credits >= ADD_CREDITS_MIN && credits <= ADD_CREDITS_MAX
}

/** The stable key a gateway plan is created under (a price change makes a new gateway plan). */
export function recurringPlanKey(plan: PlanCode, currency: BillingCurrency, amountMinor: number): string {
    return `${plan}:${currency}:${amountMinor}:monthly`
}

/** "Rs 999", "$9", "$9.50" - currency formatting for every screen and email. */
export function formatMoney(minor: number, currency: string): string {
    const whole = minor % 100 === 0
    try {
        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            minimumFractionDigits: whole ? 0 : 2,
            maximumFractionDigits: 2,
        }).format(minor / 100)
    } catch {
        return `${currency} ${(minor / 100).toFixed(whole ? 0 : 2)}`
    }
}

/** Whole credits: 1,000. */
export function formatCredits(n: number): string {
    return n.toLocaleString('en')
}

/** Micro-credits as credits with 2 decimals: 99_960_000 -> "99.96". */
export function formatMicroCredits(micro: number): string {
    return (micro / MICRO_PER_CREDIT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
