import "server-only"

import { and, count, db, desc, eq, gte, isNotNull, sql, sum } from "@repo/db"
import { billingAccount, creditLedger, inferenceRequest, jawafMessage, payment, paymentEvent, user, workspace } from "@repo/db/schema"
import { CREDIT_PACKS, CURRENCY } from "@repo/boli"
import { nepalDayKeys, nepalDaySql, nepalDaysAgo, nepalStartOfMonth } from "./nepal-time"

/**
 * Boli's money picture for Money > Billing and Money > Reports > Financial. Server only: the pages and the actions in
 * actions/billing.action.ts / actions/analytics.action.ts call these. Admin sees every workspace, so nothing filters
 * by one.
 *
 * Boli is credits only (apps/main/CLAUDE.md): 1 credit = Rs 1, sold as the @repo/boli CREDIT_PACKS or a custom top-up,
 * paid in NPR. Rupees are integer paisa (`amount_minor`) from SUCCEEDED NPR payments; credits are micro-credits from
 * the ledger (`purchase` = sold, bonus included; `grant` = welcome credits and admin grants, net of take-backs).
 * Credits spent per day come from the same sources as Home's chart (inference_request by source, Jawaf answers).
 * Windows are Nepal days / the Nepal month (lib/nepal-time.ts). Each loader is ONE db.batch.
 */

/** Days on the financial report's chart and its "last 30 days" cells. */
export const FINANCIAL_DAYS = 30
const TOP_BUYERS = 10

/** When the money arrived: the confirm stamp, else the row's creation. */
const paidAt = sql`coalesce(${payment.fulfilledAt}, ${payment.createdAt})`
const succeededNpr = and(eq(payment.status, "succeeded"), eq(payment.currency, CURRENCY))
const since = (from: Date) => sql`${paidAt} >= ${from.toISOString()}::timestamp`

export interface SpendDay {
    /** YYYY-MM-DD, Nepal time */
    day: string
    kuraMicro: number
    apiMicro: number
    jawafMicro: number
}

export interface PaymentEventRow {
    id: string
    type: string
    status: string
    amountMinor: number | null
    currency: string | null
    livemode: boolean
    receivedAt: string
    error: string | null
}

export interface FinancialReport {
    /** Succeeded NPR payments, paisa. */
    received: { last30Minor: number; allTimeMinor: number; paymentsLast30: number; paymentsAllTime: number }
    /** Micro-credits from the ledger. */
    credits: { soldLast30Micro: number; soldAllTimeMicro: number; grantedLast30Micro: number; grantedAllTimeMicro: number }
    /** Payments that failed in the last 30 days, of every payment started in that window. */
    failed: { last30: number; startedLast30: number }
    /** Credits spent per Nepal day, oldest first, zero days included. */
    spend: SpendDay[]
    recentEvents: PaymentEventRow[]
    generatedAt: string
}

export async function loadFinancialReport(): Promise<FinancialReport> {
    const now = new Date()
    const from = nepalDaysAgo(now, FINANCIAL_DAYS)
    const received = (window: Date | null) => db.select({
        minor: sql<number>`coalesce(sum(${payment.amountMinor}), 0)::bigint`,
        n: count(),
    }).from(payment).where(window ? and(succeededNpr, since(window)) : succeededNpr)
    const ledger = (kind: "purchase" | "grant", window: Date | null) => db.select({ micro: sum(creditLedger.amountMicro) }).from(creditLedger)
        .where(window ? and(eq(creditLedger.kind, kind), gte(creditLedger.createdAt, window)) : eq(creditLedger.kind, kind))
    const irDay = nepalDaySql(inferenceRequest.createdAt)
    const jmDay = nepalDaySql(jawafMessage.createdAt)

    const [rec30, recAll, sold30, soldAll, granted30, grantedAll, [failed30], [started30], irDays, jawafDays, events] = await db.batch([
        received(from),
        received(null),
        ledger("purchase", from),
        ledger("purchase", null),
        ledger("grant", from),
        ledger("grant", null),
        db.select({ n: count() }).from(payment).where(and(eq(payment.status, "failed"), gte(payment.createdAt, from))),
        db.select({ n: count() }).from(payment).where(gte(payment.createdAt, from)),
        db.select({ day: irDay, source: inferenceRequest.source, micro: sum(inferenceRequest.costMicro) })
            .from(inferenceRequest).where(gte(inferenceRequest.createdAt, from)).groupBy(sql`1`, inferenceRequest.source),
        db.select({ day: jmDay, micro: sum(jawafMessage.costMicro) })
            .from(jawafMessage).where(and(gte(jawafMessage.createdAt, from), eq(jawafMessage.role, "assistant"))).groupBy(sql`1`),
        db.select({
            id: paymentEvent.id, type: paymentEvent.type, status: paymentEvent.status, amountMinor: paymentEvent.amountMinor,
            currency: paymentEvent.currency, livemode: paymentEvent.livemode, receivedAt: paymentEvent.receivedAt, error: paymentEvent.error,
        }).from(paymentEvent).orderBy(desc(paymentEvent.receivedAt)).limit(50),
    ])

    const days = new Map<string, SpendDay>(nepalDayKeys(FINANCIAL_DAYS, now).map((day) => [day, { day, kuraMicro: 0, apiMicro: 0, jawafMicro: 0 }]))
    for (const r of irDays) {
        const d = days.get(r.day)
        if (!d) continue
        if (r.source === "kura") d.kuraMicro += Number(r.micro ?? 0)
        else d.apiMicro += Number(r.micro ?? 0)
    }
    for (const r of jawafDays) { const d = days.get(r.day); if (d) d.jawafMicro = Number(r.micro ?? 0) }

    return {
        received: {
            last30Minor: Number(rec30[0]?.minor ?? 0), allTimeMinor: Number(recAll[0]?.minor ?? 0),
            paymentsLast30: Number(rec30[0]?.n ?? 0), paymentsAllTime: Number(recAll[0]?.n ?? 0),
        },
        credits: {
            soldLast30Micro: Number(sold30[0]?.micro ?? 0), soldAllTimeMicro: Number(soldAll[0]?.micro ?? 0),
            grantedLast30Micro: Number(granted30[0]?.micro ?? 0), grantedAllTimeMicro: Number(grantedAll[0]?.micro ?? 0),
        },
        failed: { last30: Number(failed30?.n ?? 0), startedLast30: Number(started30?.n ?? 0) },
        spend: [...days.values()],
        recentEvents: events.map((e) => ({ ...e, receivedAt: e.receivedAt.toISOString() })),
        generatedAt: now.toISOString(),
    }
}

// ─── Money > Billing ───────────────────────────────────────────────────────────

export interface SalesWindow {
    count: number
    /** Paisa. */
    minor: number
    /** Whole credits the payments bought (bonus included). */
    credits: number
}

export interface PackSales {
    /** A CREDIT_PACKS id, or "custom" for a custom top-up. */
    id: string
    name: string
    /** The pack's price and credits; null for a custom top-up (any amount, 1 rupee = 1 credit). */
    rupees: number | null
    packCredits: number | null
    month: SalesWindow
    allTime: SalesWindow
}

export interface TopBuyer {
    accountId: string
    /** The workspace name, or the person for an old person-owned account; null when the owner is gone. */
    name: string | null
    email: string | null
    ownerType: string
    allTime: SalesWindow
    monthMinor: number
    lastPaidAt: string | null
}

export interface BillingOverview {
    /** This Nepal month. */
    month: { receivedMinor: number; payments: number; creditsSoldMicro: number; creditsGrantedMicro: number; adminGrantedMicro: number }
    packs: PackSales[]
    topBuyers: TopBuyer[]
    generatedAt: string
}

export async function loadBillingOverview(): Promise<BillingOverview> {
    const now = new Date()
    const month = nepalStartOfMonth(now)
    const inMonth = since(month)
    const minorAll = sql<number>`coalesce(sum(${payment.amountMinor}), 0)::bigint`
    const minorMonth = sql<number>`coalesce(sum(${payment.amountMinor}) filter (where ${inMonth}), 0)::bigint`
    const creditsAll = sql<number>`coalesce(sum(${payment.credits}), 0)::bigint`
    const creditsMonth = sql<number>`coalesce(sum(${payment.credits}) filter (where ${inMonth}), 0)::bigint`
    const countAll = sql<number>`count(*)::int`
    const countMonth = sql<number>`(count(*) filter (where ${inMonth}))::int`

    const [[monthPaid], [soldMonth], [grantedMonth], [adminGrantedMonth], packRows, buyers] = await db.batch([
        db.select({ minor: minorMonth, n: countMonth }).from(payment).where(succeededNpr),
        db.select({ micro: sum(creditLedger.amountMicro) }).from(creditLedger).where(and(eq(creditLedger.kind, "purchase"), gte(creditLedger.createdAt, month))),
        db.select({ micro: sum(creditLedger.amountMicro) }).from(creditLedger).where(and(eq(creditLedger.kind, "grant"), gte(creditLedger.createdAt, month))),
        db.select({ micro: sum(creditLedger.amountMicro) }).from(creditLedger)
            .where(and(eq(creditLedger.kind, "grant"), gte(creditLedger.createdAt, month), isNotNull(creditLedger.grantedBy))),
        db.select({ pack: payment.packCode, countAll, countMonth, minorAll, minorMonth, creditsAll, creditsMonth })
            .from(payment).where(and(succeededNpr, eq(payment.kind, "credits"))).groupBy(payment.packCode),
        db.select({
            accountId: billingAccount.id, ownerType: billingAccount.ownerType, workspaceName: workspace.name, userName: user.name, userEmail: user.email,
            countAll, minorAll, creditsAll, minorMonth, lastAt: sql<string | null>`to_char(max(${paidAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        })
            .from(payment)
            .innerJoin(billingAccount, eq(billingAccount.id, payment.accountId))
            .leftJoin(workspace, and(eq(billingAccount.ownerType, "workspace"), eq(workspace.id, billingAccount.ownerId)))
            .leftJoin(user, and(eq(billingAccount.ownerType, "user"), eq(user.id, billingAccount.ownerId)))
            .where(succeededNpr)
            .groupBy(billingAccount.id, billingAccount.ownerType, workspace.name, user.name, user.email)
            .orderBy(desc(minorAll))
            .limit(TOP_BUYERS),
    ])

    const win = (n: unknown, minor: unknown, credits: unknown): SalesWindow => ({ count: Number(n ?? 0), minor: Number(minor ?? 0), credits: Number(credits ?? 0) })
    const byPack = new Map(packRows.map((r) => [r.pack ?? "custom", r]))
    const known = new Set<string>(CREDIT_PACKS.map((p) => p.id))
    const packs: PackSales[] = CREDIT_PACKS.map((p) => {
        const r = byPack.get(p.id)
        return {
            id: p.id, name: p.name, rupees: p.rupees, packCredits: p.credits,
            month: win(r?.countMonth, r?.minorMonth, r?.creditsMonth),
            allTime: win(r?.countAll, r?.minorAll, r?.creditsAll),
        }
    })
    // A custom top-up has no pack code; a pack code no longer in CREDIT_PACKS is counted with it rather than lost.
    const custom = packRows.filter((r) => !r.pack || !known.has(r.pack))
    const add = (k: "countMonth" | "minorMonth" | "creditsMonth" | "countAll" | "minorAll" | "creditsAll") => custom.reduce((t, r) => t + Number(r[k] ?? 0), 0)
    packs.push({
        id: "custom", name: "Custom top-up", rupees: null, packCredits: null,
        month: win(add("countMonth"), add("minorMonth"), add("creditsMonth")),
        allTime: win(add("countAll"), add("minorAll"), add("creditsAll")),
    })

    return {
        month: {
            receivedMinor: Number(monthPaid?.minor ?? 0),
            payments: Number(monthPaid?.n ?? 0),
            creditsSoldMicro: Number(soldMonth?.micro ?? 0),
            creditsGrantedMicro: Number(grantedMonth?.micro ?? 0),
            adminGrantedMicro: Number(adminGrantedMonth?.micro ?? 0),
        },
        packs,
        topBuyers: buyers.map((b) => ({
            accountId: b.accountId,
            ownerType: b.ownerType,
            name: b.ownerType === "workspace" ? b.workspaceName : b.userName,
            email: b.ownerType === "workspace" ? null : b.userEmail,
            allTime: win(b.countAll, b.minorAll, b.creditsAll),
            monthMinor: Number(b.minorMonth ?? 0),
            lastPaidAt: b.lastAt ? new Date(b.lastAt).toISOString() : null,
        })),
        generatedAt: now.toISOString(),
    }
}
