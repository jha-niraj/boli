// @repo/billing - read models for the billing screens (the person's own page and the admin console). Server only.
// Reads never write - except `billingOverview`, which creates the person's account on first visit (one insert,
// idempotent) so the page always has a balance to show.
import { and, count, db, desc, eq, gte, ilike, or, sql, type SQL } from '@repo/db'
import { billingAccount, creditLedger, payment, subscription, user, type PaymentStatus } from '@repo/db/schema'
import { providersFor, summarize, type ProviderSummary } from '@repo/payments'
import { accountForUser, addCredits, creditsSpentThisMonth, creditsToMicro, startOfUtcMonth } from './ledger'
import { effectivePlan } from './checkout'
import { accountForWorkspace, findAccountForUser } from './workspace'
import { BILLING_CURRENCIES, type BillingCurrency, type PlanCode } from './plans'

export interface PaymentView {
    id: string
    kind: 'plan' | 'credits' | 'renewal'
    status: PaymentStatus
    provider: string
    currency: string
    amountMinor: number
    planCode: string | null
    termMonths: number | null
    credits: number | null
    autoRenew: boolean
    createdAt: string
}

export interface SubscriptionView {
    planCode: PlanCode
    status: string
    provider: string | null
    currency: string | null
    amountMinor: number | null
    termMonths: number
    currentPeriodStart: string
    currentPeriodEnd: string
    autoRenew: boolean
    /** Auto-renew can be turned off here (a live gateway subscription exists). */
    canCancelAutoRenew: boolean
}

export interface BillingOverview {
    plan: PlanCode
    active: boolean
    subscription: SubscriptionView | null
    /** Micro-credits. */
    balanceMicro: number
    /** Micro-credits spent this UTC month (positive). */
    spentThisMonthMicro: number
    currency: BillingCurrency | null
    /** Per currency, the providers with keys set - the only ones the picker may show. */
    providers: Record<BillingCurrency, ProviderSummary[]>
    payments: PaymentView[]
}

function paymentView(p: typeof payment.$inferSelect): PaymentView {
    return {
        id: p.id, kind: p.kind, status: p.status, provider: p.provider, currency: p.currency, amountMinor: p.amountMinor,
        planCode: p.planCode, termMonths: p.termMonths, credits: p.credits, autoRenew: p.autoRenew, createdAt: p.createdAt.toISOString(),
    }
}

function subscriptionView(s: typeof subscription.$inferSelect): SubscriptionView {
    return {
        planCode: s.planCode as PlanCode, status: s.status, provider: s.provider, currency: s.currency, amountMinor: s.amountMinor,
        termMonths: s.termMonths, currentPeriodStart: s.currentPeriodStart.toISOString(), currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        autoRenew: s.autoRenew, canCancelAutoRenew: s.autoRenew && !!s.providerSubscriptionId,
    }
}

/** Everything the billing page shows, in parallel reads: the given workspace's account, else the person's personal one. */
export async function billingOverview(userId: string, opts?: { workspaceId?: string }): Promise<BillingOverview> {
    const account = opts?.workspaceId ? await accountForWorkspace(opts.workspaceId) : await accountForUser(userId)
    const [plan, spent, rows] = await Promise.all([
        effectivePlan(account.id),
        creditsSpentThisMonth(account.id),
        db.select().from(payment).where(and(eq(payment.accountId, account.id), sql`${payment.status} <> 'created'`)).orderBy(desc(payment.createdAt)).limit(100),
    ])
    const providers = Object.fromEntries(BILLING_CURRENCIES.map((c) => [c, providersFor(c).map(summarize)])) as Record<BillingCurrency, ProviderSummary[]>
    return {
        plan: plan.plan,
        active: plan.active,
        subscription: plan.subscription ? subscriptionView(plan.subscription) : null,
        balanceMicro: account.balanceMicro,
        spentThisMonthMicro: spent,
        currency: (account.currency as BillingCurrency | null) ?? null,
        providers,
        payments: rows.map(paymentView),
    }
}

/** Remember the currency the person chose (shown first next time), on the workspace's account when one is given. */
export async function setPreferredCurrency(userId: string, currency: BillingCurrency, opts?: { workspaceId?: string }): Promise<void> {
    const account = opts?.workspaceId ? await accountForWorkspace(opts.workspaceId) : await accountForUser(userId)
    await db.update(billingAccount).set({ currency, updatedAt: new Date() }).where(eq(billingAccount.id, account.id))
}

// --------------------------------------------------------------------------------------------------------------------
// Admin
// --------------------------------------------------------------------------------------------------------------------

export interface AdminPaymentRow extends PaymentView {
    userId: string | null
    userName: string | null
    userEmail: string | null
    providerOrderId: string | null
    providerPaymentId: string | null
    failureReason: string | null
    fulfilledAt: string | null
    livemode: boolean
}

export interface AdminPaymentFilters {
    provider?: string
    status?: string
    search?: string
}

export interface Paged<T> {
    items: T[]
    total: number
    page: number
    pages: number
}

export async function adminListPayments(filters: AdminPaymentFilters, page = 1, limit = 25): Promise<Paged<AdminPaymentRow>> {
    const where: SQL[] = [sql`${payment.status} <> 'created'`]
    if (filters.provider) where.push(eq(payment.provider, filters.provider))
    if (filters.status) where.push(eq(payment.status, filters.status as PaymentStatus))
    const q = filters.search?.trim()
    if (q) {
        const like = `%${q}%`
        const match = or(ilike(user.email, like), ilike(user.name, like), eq(payment.id, q), eq(payment.providerPaymentId, q), eq(payment.providerOrderId, q))
        if (match) where.push(match)
    }
    const cond = and(...where)
    const offset = (Math.max(1, page) - 1) * limit
    const [rows, [{ n } = { n: 0 }]] = await Promise.all([
        db.select({ p: payment, name: user.name, email: user.email, ownerUserId: billingAccount.contactUserId }).from(payment)
            .innerJoin(billingAccount, eq(billingAccount.id, payment.accountId))
            .leftJoin(user, eq(user.id, billingAccount.contactUserId))
            .where(cond).orderBy(desc(payment.createdAt)).limit(limit).offset(offset),
        db.select({ n: count() }).from(payment)
            .innerJoin(billingAccount, eq(billingAccount.id, payment.accountId))
            .leftJoin(user, eq(user.id, billingAccount.contactUserId))
            .where(cond),
    ])
    return {
        items: rows.map((r) => ({
            ...paymentView(r.p),
            userId: r.p.userId ?? r.ownerUserId,
            userName: r.name,
            userEmail: r.email,
            providerOrderId: r.p.providerOrderId,
            providerPaymentId: r.p.providerPaymentId,
            failureReason: r.p.failureReason,
            fulfilledAt: r.p.fulfilledAt ? r.p.fulfilledAt.toISOString() : null,
            livemode: r.p.livemode,
        })),
        total: Number(n),
        page,
        pages: Math.max(1, Math.ceil(Number(n) / limit)),
    }
}

export interface AdminSubscriptionRow extends SubscriptionView {
    id: string
    userId: string
    userName: string | null
    userEmail: string | null
    balanceMicro: number
}

export async function adminListSubscriptions(page = 1, limit = 25): Promise<Paged<AdminSubscriptionRow>> {
    const offset = (Math.max(1, page) - 1) * limit
    const [rows, [{ n } = { n: 0 }]] = await Promise.all([
        db.select({ s: subscription, name: user.name, email: user.email, ownerId: billingAccount.contactUserId, balance: billingAccount.balanceMicro })
            .from(subscription)
            .innerJoin(billingAccount, eq(billingAccount.id, subscription.accountId))
            .leftJoin(user, eq(user.id, billingAccount.contactUserId))
            .orderBy(desc(subscription.currentPeriodEnd)).limit(limit).offset(offset),
        db.select({ n: count() }).from(subscription),
    ])
    return {
        // The account's contact user (the person, for a personal workspace) - ownerId is a workspace id since workspaces.
        items: rows.map((r) => ({ ...subscriptionView(r.s), id: r.s.id, userId: r.ownerId ?? '', userName: r.name, userEmail: r.email, balanceMicro: r.balance })),
        total: Number(n),
        page,
        pages: Math.max(1, Math.ceil(Number(n) / limit)),
    }
}

export interface AdminBillingStats {
    /** Succeeded payments, per currency, minor units - this month (UTC) and all time. Never summed across currencies. */
    revenueThisMonth: Record<string, number>
    revenueAllTime: Record<string, number>
    paymentsThisMonth: number
    activeSubscriptions: number
    autoRenewing: number
    /** Micro-credits granted by admins this month. */
    creditsGrantedThisMonthMicro: number
}

export async function adminBillingStats(now: Date = new Date()): Promise<AdminBillingStats> {
    const month = startOfUtcMonth(now)
    const [byMonth, byAll, [{ n: paid } = { n: 0 }], [subs], [grants]] = await Promise.all([
        db.select({ currency: payment.currency, total: sql<string>`sum(${payment.amountMinor})` }).from(payment)
            .where(and(eq(payment.status, 'succeeded'), gte(payment.createdAt, month))).groupBy(payment.currency),
        db.select({ currency: payment.currency, total: sql<string>`sum(${payment.amountMinor})` }).from(payment)
            .where(eq(payment.status, 'succeeded')).groupBy(payment.currency),
        db.select({ n: count() }).from(payment).where(and(eq(payment.status, 'succeeded'), gte(payment.createdAt, month))),
        db.select({
            active: sql<string>`count(*) filter (where ${subscription.currentPeriodEnd} > now() and ${subscription.status} in ('active', 'past_due'))`,
            auto: sql<string>`count(*) filter (where ${subscription.autoRenew} and ${subscription.currentPeriodEnd} > now())`,
        }).from(subscription),
        db.select({ total: sql<string | null>`sum(${creditLedger.amountMicro})` }).from(creditLedger)
            .where(and(eq(creditLedger.kind, 'grant'), sql`${creditLedger.grantedBy} IS NOT NULL`, gte(creditLedger.createdAt, month))),
    ])
    const toMap = (rows: { currency: string; total: string }[]) => Object.fromEntries(rows.map((r) => [r.currency, Number(r.total)]))
    return {
        revenueThisMonth: toMap(byMonth),
        revenueAllTime: toMap(byAll),
        paymentsThisMonth: Number(paid),
        activeSubscriptions: Number(subs?.active ?? 0),
        autoRenewing: Number(subs?.auto ?? 0),
        creditsGrantedThisMonthMicro: Number(grants?.total ?? 0),
    }
}

/**
 * An admin's manual grant (or, with a negative amount, a correction) in WHOLE credits, stored as micro-credits.
 * `requestId` comes from the form, so a double submit is one grant. The audit row is the caller's job (the admin app
 * owns admin_audit_log writes). Returns the balance after in micro-credits.
 */
export async function adminGrantCredits(input: { userId: string; credits: number; reason: string; adminAccessId: string; requestId: string }): Promise<{ applied: boolean; balanceMicro: number }> {
    const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, input.userId)).limit(1)
    if (!target) throw new Error('No user with that id')
    const account = await accountForUser(input.userId)
    return addCredits(account.id, {
        kind: input.credits >= 0 ? 'grant' : 'expiry',
        amountMicro: creditsToMicro(input.credits),
        key: `grant:${input.requestId}`,
        description: input.reason,
        grantedBy: input.adminAccessId,
    })
}

export interface AdminLedgerRow {
    id: string
    kind: string
    /** Signed micro-credits. */
    amountMicro: number
    description: string | null
    grantedBy: string | null
    createdAt: string
}

/** One user's balance and latest ledger rows (the admin grant sheet). */
export async function adminUserCredits(userId: string): Promise<{ balanceMicro: number; entries: AdminLedgerRow[] }> {
    // A read: an account that does not exist yet is a zero balance, not a new row. The user's PERSONAL workspace account
    // (or their pre-workspace one until the backfill has run).
    const account = await findAccountForUser(userId)
    if (!account) return { balanceMicro: 0, entries: [] }
    const rows = await db.select().from(creditLedger).where(eq(creditLedger.accountId, account.id)).orderBy(desc(creditLedger.createdAt)).limit(30)
    return {
        balanceMicro: account.balanceMicro,
        entries: rows.map((r) => ({ id: r.id, kind: r.kind, amountMicro: r.amountMicro, description: r.description, grantedBy: r.grantedBy, createdAt: r.createdAt.toISOString() })),
    }
}
