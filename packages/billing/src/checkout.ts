// @repo/billing - what a payment buys: start a checkout, confirm it (from a return OR a webhook - whichever comes
// first wins, the other changes nothing), renewals, auto-renew on/off. Server only.
//
// Exactly-once, without transactions (neon-http):
// - credits: the ledger row's idempotency key is `purchase:<paymentId>` / `plan:<paymentId>` - a repeat inserts nothing;
// - a plan period: ONE statement claims the payment (`fulfilled_at IS NULL` -> now) and extends the subscription from
//   that claim (a CTE), so two racers cannot both extend it;
// - a renewal charge: a payment row unique on (provider, provider_payment_id) is inserted once, then fulfilled as above.
import { and, db, eq, sql } from '@repo/db'
import { payment, subscription, user, type PaymentStatus } from '@repo/db/schema'
import {
    getProvider, PaymentError, providersFor, type CheckoutStart, type Currency, type ExpectedPayment, type PaymentProvider,
    type PaymentState, type ProviderId, type ReturnHint, type VerifiedPayment, type WebhookNotice,
} from '@repo/payments'
import { accountForUser, addCredits, creditsToMicro } from './ledger'
import { accountForWorkspace } from './workspace'
import {
    ADD_CREDITS_MAX, ADD_CREDITS_MIN, findPack, isBillingCurrency, isPurchasableCredits, isTermMonths, PAISA_PER_CREDIT, PLANS, planPrice,
    recurringPlanKey, type BillingCurrency, type PlanCode, type TermMonths,
} from './plans'

export type PaymentRow = typeof payment.$inferSelect

/** The app's own origin for return URLs. Never falls back to a live domain (on staging that would send people to
 * production) - a missing value is an error naming the variable. */
export function appBaseUrl(): string {
    const v = (process.env.MAIN_APP_URL ?? process.env.BETTER_AUTH_URL ?? '').trim().replace(/\/+$/, '')
    if (!v) throw new PaymentError('not_configured', 'MAIN_APP_URL is not set')
    return v
}

export type CheckoutRequest =
    | { kind: 'plan'; plan: Exclude<PlanCode, 'free'>; months: TermMonths; autoRenew: boolean }
    | { kind: 'credits'; pack: string }
    /** Any whole number of credits, ADD_CREDITS_MIN..ADD_CREDITS_MAX, NPR only (1 credit = Rs 1). */
    | { kind: 'custom_credits'; credits: number }

export interface StartCheckoutInput {
    user: { id: string; email: string; name?: string | null }
    provider: ProviderId
    currency: BillingCurrency
    /** Cashfree requires one; others ignore it. */
    phone?: string | null
    request: CheckoutRequest
    /** The app origin the gateway returns to (defaults to MAIN_APP_URL). */
    appUrl?: string
    /** The workspace whose account is credited (the caller checked the person may pay for it); default: their personal one. */
    workspaceId?: string
}

export interface StartedCheckout {
    paymentId: string
    start: CheckoutStart
}

function priceOf(req: CheckoutRequest, currency: BillingCurrency): { amountMinor: number; description: string; credits: number | null } {
    if (req.kind === 'plan') {
        if (!isTermMonths(req.months)) throw new PaymentError('invalid', 'Choose 1, 3 or 12 months.')
        const months = req.autoRenew ? 1 : req.months
        const amount = planPrice(req.plan, currency, months)
        if (!amount) throw new PaymentError('invalid', `${PLANS[req.plan].name} is not sold in ${currency}.`)
        const description = req.autoRenew ? `${PLANS[req.plan].name} plan, renews monthly` : `${PLANS[req.plan].name} plan, ${months} month${months === 1 ? '' : 's'}`
        return { amountMinor: amount, description, credits: null }
    }
    if (req.kind === 'custom_credits') {
        if (currency !== 'NPR') throw new PaymentError('invalid', 'Credits are sold in Nepali rupees (NPR) only.')
        if (!isPurchasableCredits(req.credits)) {
            throw new PaymentError('invalid', `Choose a whole number of credits from ${ADD_CREDITS_MIN.toLocaleString('en')} to ${ADD_CREDITS_MAX.toLocaleString('en')}.`)
        }
        return { amountMinor: req.credits * PAISA_PER_CREDIT, description: `${req.credits.toLocaleString('en')} Boli credits`, credits: req.credits }
    }
    const pack = findPack(req.pack)
    if (!pack) throw new PaymentError('invalid', 'That credit pack does not exist.')
    const amount = pack.price[currency]
    if (!amount) throw new PaymentError('invalid', `Credit packs are not sold in ${currency}.`)
    return { amountMinor: amount, description: `${pack.credits.toLocaleString('en')} credits`, credits: pack.credits }
}

/**
 * Create the payment row, then the gateway checkout. The row exists BEFORE the gateway is called, so a gateway that
 * answers but whose answer we lose still has a row to verify against. Inline (the person waits a second or two).
 */
export async function startCheckout(input: StartCheckoutInput): Promise<StartedCheckout> {
    if (!isBillingCurrency(input.currency)) throw new PaymentError('invalid', 'Choose a currency.')
    const req = input.request
    const wantsAuto = req.kind === 'plan' && req.autoRenew
    const offered = providersFor(input.currency as Currency, { subscriptions: wantsAuto })
    const provider = offered.find((p) => p.id === input.provider)
    if (!provider) {
        throw new PaymentError('unsupported', wantsAuto
            ? 'That payment method cannot renew automatically. Pick another, or pay for a set number of months.'
            : 'That payment method is not available for this currency.')
    }
    const price = priceOf(req, input.currency)
    const account = input.workspaceId ? await accountForWorkspace(input.workspaceId) : await accountForUser(input.user.id)
    const paymentId = crypto.randomUUID()
    await db.insert(payment).values({
        id: paymentId,
        accountId: account.id,
        userId: input.user.id,
        kind: req.kind === 'custom_credits' ? 'credits' : req.kind,
        status: 'created',
        provider: provider.id,
        currency: input.currency,
        amountMinor: price.amountMinor,
        planCode: req.kind === 'plan' ? req.plan : null,
        termMonths: req.kind === 'plan' ? (req.autoRenew ? 1 : req.months) : null,
        autoRenew: wantsAuto,
        packCode: req.kind === 'credits' ? req.pack : null,
        credits: price.credits,
        livemode: provider.mode() === 'live',
    })

    const base = input.appUrl ?? appBaseUrl()
    const checkoutInput = {
        paymentId,
        amountMinor: price.amountMinor,
        currency: input.currency as Currency,
        description: price.description,
        customer: { id: input.user.id, email: input.user.email, name: input.user.name ?? null, phone: input.phone ?? null },
        // Our id rides in the PATH: eSewa appends `?data=` even to a URL that has a query, so a query would break.
        returnUrl: `${base}/api/payments/${provider.id}/return/${paymentId}`,
        cancelUrl: `${base}/api/payments/${provider.id}/cancel/${paymentId}`,
        appUrl: base,
    }
    try {
        const created = wantsAuto && req.kind === 'plan' && provider.createSubscription
            ? await provider.createSubscription({ ...checkoutInput, planKey: recurringPlanKey(req.plan, input.currency, price.amountMinor), planName: `${PLANS[req.plan].name} (monthly)` })
            : await provider.createCheckout(checkoutInput)
        await db.update(payment).set({
            status: 'pending',
            providerOrderId: created.providerOrderId,
            providerSubscriptionId: created.providerSubscriptionId ?? null,
            updatedAt: new Date(),
        }).where(eq(payment.id, paymentId))
        return { paymentId, start: created.start }
    } catch (err) {
        await db.update(payment).set({ status: 'failed', failureReason: err instanceof Error ? err.message.slice(0, 500) : 'checkout failed', updatedAt: new Date() })
            .where(eq(payment.id, paymentId)).catch(() => undefined)
        throw err
    }
}

export interface CreditPurchaseInput {
    userId: string
    /**
     * What to buy: a custom whole number of credits (= rupees, ADD_CREDITS_MIN..ADD_CREDITS_MAX), or a pack by its code
     * (CREDIT_PACKS). A pack's price and credits come from the server-side table only - never from the caller.
     */
    purchase: { kind: 'custom'; credits: number } | { kind: 'pack'; pack: string }
    provider: 'esewa' | 'khalti'
    /**
     * Optional; must be on this app (MAIN_APP_URL), relative paths allowed. The gateway always returns through
     * `/api/payments/<provider>/return/<paymentId>`, which shows `/checkout/<paymentId>` (the result page links on).
     */
    returnUrl?: string
    /** The workspace to credit (the caller checked the person is its owner); default: their personal workspace. */
    workspaceId?: string
}

/**
 * Buy a custom number of credits with eSewa or Khalti (NPR; test mode while ESEWA_ENV / KHALTI_ENV say so). Returns
 * the same as startCheckout: `start.type === 'form'` for eSewa (POST `fields` to `action`), `'redirect'` for Khalti.
 * The caller checks the session and passes its user id. N credits add N * 1,000,000 micro-credits once paid; a pack
 * stores its code and its credits (bonus included) on the payment row, and confirmPayment grants exactly `row.credits`
 * under the key `purchase:<paymentId>` (one ledger row per payment).
 */
export async function startCreditPurchase(input: CreditPurchaseInput): Promise<StartedCheckout> {
    if (input.provider !== 'esewa' && input.provider !== 'khalti') throw new PaymentError('invalid', 'Pay with eSewa or Khalti.')
    const [buyer] = await db.select({ id: user.id, email: user.email, name: user.name }).from(user).where(eq(user.id, input.userId)).limit(1)
    if (!buyer) throw new PaymentError('invalid', 'Sign in again, then add credits.')
    if (input.returnUrl) {
        // Never let a caller-supplied URL steer the gateway elsewhere: it must be this app's own origin.
        let origin = ''
        try { origin = new URL(input.returnUrl, appBaseUrl()).origin } catch { origin = '' }
        if (origin !== new URL(appBaseUrl()).origin) throw new PaymentError('invalid', 'The return address must be on this app.')
    }
    return startCheckout({
        user: buyer,
        workspaceId: input.workspaceId,
        provider: input.provider,
        currency: 'NPR',
        request: input.purchase.kind === 'pack'
            ? { kind: 'credits', pack: input.purchase.pack }
            : { kind: 'custom_credits', credits: input.purchase.credits },
    })
}

/** The result a return page (or an admin recheck) shows. */
export interface ConfirmOutcome {
    paymentId: string
    kind: PaymentRow['kind']
    /** `mismatch` = the gateway charged a different amount or currency; nothing was added. */
    state: PaymentState | 'mismatch'
    /** True when THIS call applied the purchase (false when it was already applied, or nothing was paid). */
    appliedNow: boolean
}

function expectedOf(row: PaymentRow): ExpectedPayment {
    return {
        paymentId: row.id,
        providerOrderId: row.providerOrderId,
        providerSubscriptionId: row.providerSubscriptionId,
        amountMinor: row.amountMinor,
        currency: row.currency as Currency,
    }
}

const STATUS_FOR: Record<Exclude<PaymentState, 'paid'>, PaymentStatus> = {
    pending: 'pending', failed: 'failed', cancelled: 'cancelled', expired: 'cancelled', refunded: 'refunded',
}

function amountMatches(v: VerifiedPayment, amountMinor: number, currency: string): boolean {
    return v.amountMinor === amountMinor && (v.currency ?? currency).toUpperCase() === currency.toUpperCase()
}

/** Mark a not-yet-fulfilled payment with a non-paid state. Never touches a fulfilled one. */
async function markUnpaid(row: PaymentRow, status: PaymentStatus, reason: string | null, raw: unknown): Promise<void> {
    await db.update(payment).set({ status, failureReason: reason, raw, updatedAt: new Date() })
        .where(and(eq(payment.id, row.id), sql`${payment.fulfilledAt} IS NULL`))
}

/**
 * Apply what a verified payment bought - idempotent, safe to call from a return and a webhook at the same moment.
 * Credits first (keyed, so a retry adds nothing), then the claim + period extension in one statement.
 */
async function fulfil(row: PaymentRow, v: VerifiedPayment): Promise<boolean> {
    if (row.fulfilledAt) return false
    // The owner deleted their account while the payment was in flight: nothing to credit (the payment row stays).
    const accountId = row.accountId
    if (!accountId) return false
    const ppid = v.providerPaymentId
    const psid = v.providerSubscriptionId ?? row.providerSubscriptionId
    if (row.kind === 'credits') {
        const credits = row.credits ?? 0
        const r = credits > 0
            ? await addCredits(accountId, { kind: 'purchase', amountMicro: creditsToMicro(credits), key: `purchase:${row.id}`, description: `${credits.toLocaleString('en')} credits`, paymentId: row.id })
            : { applied: false }
        await db.update(payment).set({
            status: 'succeeded', fulfilledAt: sql`COALESCE(${payment.fulfilledAt}, now())`, providerPaymentId: sql`COALESCE(${payment.providerPaymentId}, ${ppid})`,
            raw: v.raw, failureReason: null, updatedAt: new Date(),
        }).where(eq(payment.id, row.id))
        return r.applied
    }

    // A plan (first payment) or a renewal: credits for every month bought, then the period.
    const plan = PLANS[(row.planCode as PlanCode) ?? 'pro'] ?? PLANS.pro
    const months = row.termMonths ?? 1
    if (plan.monthlyCredits > 0) {
        await addCredits(accountId, {
            kind: 'grant', amountMicro: creditsToMicro(plan.monthlyCredits * months), key: `plan:${row.id}`,
            description: `${plan.name} plan credits, ${months} month${months === 1 ? '' : 's'}`, paymentId: row.id,
        })
    }
    const periodEnd = v.periodEnd ? v.periodEnd.toISOString() : null
    const res = await db.execute(sql`
        WITH claim AS (
            UPDATE payment
               SET status = 'succeeded', fulfilled_at = now(), failure_reason = NULL, updated_at = now(),
                   provider_payment_id = COALESCE(provider_payment_id, ${ppid}),
                   provider_subscription_id = COALESCE(provider_subscription_id, ${psid}),
                   raw = ${JSON.stringify(v.raw ?? null)}::jsonb
             WHERE id = ${row.id} AND fulfilled_at IS NULL
         RETURNING account_id, plan_code, term_months, currency, amount_minor, provider, provider_subscription_id, auto_renew
        )
        INSERT INTO subscription (id, account_id, plan_code, status, provider, provider_subscription_id, currency, amount_minor,
                                  term_months, current_period_start, current_period_end, auto_renew, created_at, updated_at)
        SELECT ${crypto.randomUUID()}, account_id, COALESCE(plan_code, 'pro'), 'active', provider,
               CASE WHEN auto_renew THEN provider_subscription_id ELSE NULL END, currency, amount_minor, COALESCE(term_months, 1),
               now(), COALESCE(${periodEnd}::timestamptz, now() + make_interval(months => COALESCE(term_months, 1))), auto_renew, now(), now()
          FROM claim
        ON CONFLICT (account_id) DO UPDATE SET
               plan_code = EXCLUDED.plan_code,
               status = 'active',
               provider = EXCLUDED.provider,
               provider_subscription_id = CASE WHEN EXCLUDED.auto_renew THEN EXCLUDED.provider_subscription_id ELSE subscription.provider_subscription_id END,
               currency = EXCLUDED.currency,
               amount_minor = EXCLUDED.amount_minor,
               term_months = EXCLUDED.term_months,
               current_period_start = CASE WHEN subscription.current_period_end > now() THEN subscription.current_period_start ELSE now() END,
               current_period_end = COALESCE(${periodEnd}::timestamptz,
                   GREATEST(subscription.current_period_end, now()) + make_interval(months => EXCLUDED.term_months)),
               auto_renew = CASE WHEN EXCLUDED.auto_renew THEN true ELSE subscription.auto_renew END,
               reminder_sent_for = NULL,
               updated_at = now()
        RETURNING id
    `)
    return res.rows.length > 0
}

/** Apply a gateway's verified answer to our payment row. The one function both the return and the webhook end in. */
export async function applyVerified(row: PaymentRow, v: VerifiedPayment): Promise<ConfirmOutcome> {
    const base = { paymentId: row.id, kind: row.kind }
    if (row.fulfilledAt) return { ...base, state: 'paid', appliedNow: false }
    if (v.state !== 'paid') {
        if (v.state !== 'pending' || row.status === 'created') await markUnpaid(row, STATUS_FOR[v.state], v.state === 'pending' ? null : v.providerStatus, v.raw)
        return { ...base, state: v.state, appliedNow: false }
    }
    if (!amountMatches(v, row.amountMinor, row.currency)) {
        console.error(`[billing] amount mismatch on payment ${row.id}: expected ${row.amountMinor} ${row.currency}, gateway said ${v.amountMinor} ${v.currency}`)
        await markUnpaid(row, 'failed', `amount_mismatch: ${v.amountMinor ?? 'none'} ${v.currency ?? ''}`.trim(), v.raw)
        return { ...base, state: 'mismatch', appliedNow: false }
    }
    try {
        const applied = await fulfil(row, v)
        return { ...base, state: 'paid', appliedNow: applied }
    } catch (err) {
        // The same gateway payment id already sits on another row (a duplicate notice for a renewal we recorded).
        if (err instanceof Error && /payment_provider_payment_uq/.test(err.message)) return { ...base, state: 'paid', appliedNow: false }
        throw err
    }
}

async function paymentById(id: string): Promise<PaymentRow | null> {
    const [row] = await db.select().from(payment).where(eq(payment.id, id)).limit(1)
    return row ?? null
}

/**
 * Confirm one payment with its gateway (server to server) and apply it. Called by the return endpoint (with the
 * return's hint), by "Check again" on the result page, and by an admin recheck (no hint). Idempotent.
 */
export async function confirmPayment(providerId: ProviderId, paymentId: string, hint: ReturnHint | null = null): Promise<ConfirmOutcome> {
    const provider = getProvider(providerId)
    const row = await paymentById(paymentId)
    if (!row || row.provider !== provider.id) throw new PaymentError('invalid', 'That payment could not be found.')
    if (hint?.paymentId && hint.paymentId !== row.id && hint.paymentId !== row.providerOrderId && hint.paymentId !== row.providerSubscriptionId) {
        throw new PaymentError('invalid', 'That return belongs to a different payment.')
    }
    if (row.fulfilledAt) return { paymentId: row.id, kind: row.kind, state: 'paid', appliedNow: false }
    const verified = await provider.verifyReturn(expectedOf(row), hint)
    return applyVerified(row, verified)
}

/** The buyer came back through the cancel URL. Only a payment that is still open is marked; a paid one is never
 * touched (the gateway may have taken the money before the buyer pressed back - the webhook or a recheck settles it). */
export async function markCancelled(providerId: ProviderId, paymentId: string): Promise<PaymentRow | null> {
    const row = await paymentById(paymentId)
    if (!row || row.provider !== providerId) return null
    if (!row.fulfilledAt && (row.status === 'created' || row.status === 'pending')) {
        await db.update(payment).set({ status: 'cancelled', updatedAt: new Date() })
            .where(and(eq(payment.id, row.id), sql`${payment.fulfilledAt} IS NULL`))
    }
    return paymentById(paymentId)
}

/** A payment row as the result page shows it (owner checked by the caller). */
export function getPayment(id: string): Promise<PaymentRow | null> {
    return paymentById(id)
}

// --------------------------------------------------------------------------------------------------------------------
// Webhook notices
// --------------------------------------------------------------------------------------------------------------------

async function findByOrder(provider: ProviderId, orderId: string): Promise<PaymentRow | null> {
    const [row] = await db.select().from(payment).where(and(eq(payment.provider, provider), eq(payment.providerOrderId, orderId))).limit(1)
    return row ?? null
}

async function findByProviderPayment(provider: ProviderId, ppid: string): Promise<PaymentRow | null> {
    const [row] = await db.select().from(payment).where(and(eq(payment.provider, provider), eq(payment.providerPaymentId, ppid))).limit(1)
    return row ?? null
}

/** One subscription charge: the first (matches our payment row) or a renewal (a new row, inserted once). */
async function applySubscriptionCharge(provider: PaymentProvider, n: Extract<WebhookNotice, { kind: 'subscription_charge' }>): Promise<'processed' | 'ignored'> {
    const v = n.verified
    if (v.state !== 'paid' || !v.providerPaymentId) return 'ignored'
    const already = await findByProviderPayment(provider.id, v.providerPaymentId)
    if (already) { await applyVerified(already, v); return 'processed' }

    if (n.paymentId) {
        const first = await paymentById(n.paymentId)
        if (first && first.provider === provider.id && !first.fulfilledAt) { await applyVerified(first, v); return 'processed' }
    }
    // The first payment matched by subscription id (gateways that do not echo our id on the first charge).
    const [firstBySub] = await db.select().from(payment).where(and(
        eq(payment.provider, provider.id), eq(payment.providerSubscriptionId, n.providerSubscriptionId), eq(payment.kind, 'plan'), sql`${payment.fulfilledAt} IS NULL`,
    )).limit(1)
    if (firstBySub) { await applyVerified(firstBySub, v); return 'processed' }

    const [sub] = await db.select().from(subscription)
        .where(and(eq(subscription.provider, provider.id), eq(subscription.providerSubscriptionId, n.providerSubscriptionId))).limit(1)
    if (!sub) {
        console.warn(`[billing] ${provider.id} charge for unknown subscription ${n.providerSubscriptionId} - ignored`)
        return 'ignored'
    }
    const renewalId = crypto.randomUUID()
    await db.insert(payment).values({
        id: renewalId,
        accountId: sub.accountId,
        userId: null,
        kind: 'renewal',
        status: 'pending',
        provider: provider.id,
        currency: sub.currency ?? v.currency ?? 'USD',
        // The renewal must be charged at the subscription's price; applyVerified compares it to the gateway's amount.
        amountMinor: sub.amountMinor ?? v.amountMinor ?? 0,
        planCode: sub.planCode,
        termMonths: 1,
        autoRenew: true,
        providerPaymentId: v.providerPaymentId,
        providerSubscriptionId: n.providerSubscriptionId,
        livemode: provider.mode() === 'live',
    }).onConflictDoNothing()
    const row = await findByProviderPayment(provider.id, v.providerPaymentId)
    if (row) await applyVerified(row, v)
    return 'processed'
}

/**
 * Handle the notices of one verified webhook. Returns 'processed' when anything changed or was confirmed, 'ignored'
 * for events we do not use. Throws on a database failure (the route answers 5xx and the gateway redelivers - safe,
 * because every step is idempotent).
 */
export async function applyWebhookNotices(providerId: ProviderId, notices: WebhookNotice[]): Promise<'processed' | 'ignored'> {
    const provider = getProvider(providerId)
    let processed = false
    for (const n of notices) {
        if (n.kind === 'payment') {
            const row = (n.paymentId ? await paymentById(n.paymentId) : null) ?? (n.providerOrderId ? await findByOrder(provider.id, n.providerOrderId) : null)
            if (!row || row.provider !== provider.id) continue
            await applyVerified(row, n.verified)
            processed = true
        } else if (n.kind === 'subscription_charge') {
            if ((await applySubscriptionCharge(provider, n)) === 'processed') processed = true
        } else {
            const set = n.status === 'cancelled'
                ? { autoRenew: false, providerSubscriptionId: null, updatedAt: new Date() }
                : { status: n.status, updatedAt: new Date() }
            const rows = await db.update(subscription).set(set)
                .where(and(eq(subscription.provider, provider.id), eq(subscription.providerSubscriptionId, n.providerSubscriptionId)))
                .returning({ id: subscription.id })
            if (rows.length) processed = true
        }
    }
    return processed ? 'processed' : 'ignored'
}

// --------------------------------------------------------------------------------------------------------------------
// The plan the person is on, and auto-renew
// --------------------------------------------------------------------------------------------------------------------

export type SubscriptionRow = typeof subscription.$inferSelect

export interface EffectivePlan {
    plan: PlanCode
    subscription: SubscriptionRow | null
    /** The paid period is still running. */
    active: boolean
}

/** Pro while a paid period runs (active or past_due - the gateway is retrying), else Free. Computed, never stored. */
export async function effectivePlan(accountId: string, now: Date = new Date()): Promise<EffectivePlan> {
    const [sub] = await db.select().from(subscription).where(eq(subscription.accountId, accountId)).limit(1)
    const active = !!sub && sub.currentPeriodEnd > now && (sub.status === 'active' || sub.status === 'past_due')
    return { plan: active ? (sub.planCode as PlanCode) : 'free', subscription: sub ?? null, active }
}

/**
 * Turn auto-renew off: the gateway stops charging at the end of the paid period; the period stays. (Turning it ON
 * is a new checkout with `autoRenew: true` - the gateway needs the buyer to authorise a mandate.)
 */
export async function cancelAutoRenew(accountId: string): Promise<SubscriptionRow | null> {
    const [sub] = await db.select().from(subscription).where(eq(subscription.accountId, accountId)).limit(1)
    if (!sub) return null
    if (sub.provider && sub.providerSubscriptionId) {
        const p = getProvider(sub.provider)
        if (p.cancelSubscription) await p.cancelSubscription(sub.providerSubscriptionId, { atPeriodEnd: true })
    }
    const [row] = await db.update(subscription).set({ autoRenew: false, providerSubscriptionId: null, updatedAt: new Date() })
        .where(eq(subscription.id, sub.id)).returning()
    return row ?? null
}
