import "server-only"

import { and, count, db, desc, eq, gt, gte, ne, sql, type SQL } from "@repo/db"
import { aiConversations, apiKey, billingAccount, creditLedger, inferenceRequest as ir, payment, user } from "@repo/db/schema"
import { formatDayKey, nepalDayKeys, nepalDayStart, REQUEST_LOG_PAGE_SIZE, windowDays, EMPTY_TOTALS, NEPAL_OFFSET_MS } from "@/lib/platform-display"
import type {
    ActivityItem, BillingData, BillingHistoryRow, BillingPaymentRow, HomeData, KeyBreakdownRow, KuraActivity, LedgerKind,
    RequestRow, UsageBuckets, UsageBucketsBySource, UsageData, UsageDay, UsageSource, UsageSourceFilter, UsageTotals, UsageWindow,
} from "@/types/platform"
import { getBalanceMicro } from "./credits"

/**
 * The platform pages' reads (Home, Usage, Billing), all for ONE workspace (the current one, lib/workspace.ts) and
 * always filtered by its id: usage and credits are the workspace's, whoever made the call. Home's recent Kura chats are
 * the signed-in person's own within it.
 * Every page's reads go out together (one `db.batch` plus the balance in a `Promise.all`), never a query in a loop.
 * Reads never write. Days are Nepal days (UTC+05:45, see lib/platform-display.ts); windows are named (today, last 7,
 * last 30, last 90). Credits are integer micro-credits.
 */

const DAY_EXPR = sql<string>`to_char(${ir.createdAt} + interval '5 hours 45 minutes', 'YYYY-MM-DD')`
const RECENT_EACH = 6
const RECENT_TOTAL = 8
const HISTORY_LIMIT = 100
const SPEND_DAYS_LIMIT = 120
const PAYMENTS_LIMIT = 50

function num(v: unknown): number {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0
    return Number.isFinite(n) ? n : 0
}

/** A `json_build_object` of totals, parsed whether the driver hands back an object or a string. */
function toTotals(v: unknown): UsageTotals {
    const o = typeof v === "string" ? (JSON.parse(v) as unknown) : v
    if (!o || typeof o !== "object") return { ...EMPTY_TOTALS }
    const r = o as Record<string, unknown>
    return { requests: num(r.requests), inputTokens: num(r.inputTokens), outputTokens: num(r.outputTokens), costMicro: num(r.costMicro) }
}

function totalsSince(after: SQL) {
    return sql<UsageTotals>`json_build_object(
        'requests', count(*) filter (where ${after}),
        'inputTokens', coalesce(sum(${ir.inputTokens}) filter (where ${after}), 0),
        'outputTokens', coalesce(sum(${ir.outputTokens}) filter (where ${after}), 0),
        'costMicro', coalesce(sum(${ir.costMicro}) filter (where ${after}), 0)
    )`.mapWith(toTotals)
}

const SUM_COLS = {
    requests: sql<number>`count(*)`.mapWith(Number),
    inputTokens: sql<number>`coalesce(sum(${ir.inputTokens}), 0)`.mapWith(Number),
    outputTokens: sql<number>`coalesce(sum(${ir.outputTokens}), 0)`.mapWith(Number),
    costMicro: sql<number>`coalesce(sum(${ir.costMicro}), 0)`.mapWith(Number),
}

function sourceWhere(workspaceId: string, since: Date, source: UsageSourceFilter): SQL | undefined {
    return and(eq(ir.workspaceId, workspaceId), gte(ir.createdAt, since), source === "all" ? undefined : eq(ir.source, source))
}

// ---------------------------------------------------------------------------------------------------------------------
// Query builders (not awaited here - they go into one batch)
// ---------------------------------------------------------------------------------------------------------------------

function bucketsQuery(workspaceId: string, now: Date) {
    return db
        .select({
            source: ir.source,
            today: totalsSince(gte(ir.createdAt, nepalDayStart(0, now))),
            last7: totalsSince(gte(ir.createdAt, nepalDayStart(6, now))),
            last30: totalsSince(gte(ir.createdAt, nepalDayStart(29, now))),
            last90: totalsSince(gte(ir.createdAt, nepalDayStart(89, now))),
        })
        .from(ir)
        .where(and(eq(ir.workspaceId, workspaceId), gte(ir.createdAt, nepalDayStart(89, now))))
        .groupBy(ir.source)
}

function dailyQuery(workspaceId: string, since: Date, source: UsageSourceFilter) {
    return db
        .select({ day: DAY_EXPR, source: ir.source, ...SUM_COLS })
        .from(ir)
        .where(sourceWhere(workspaceId, since, source))
        .groupBy(DAY_EXPR, ir.source)
}

function keysQuery(workspaceId: string, since: Date, source: UsageSourceFilter) {
    return db
        .select({
            source: ir.source,
            keyId: ir.apiKeyId,
            name: apiKey.name,
            prefix: apiKey.prefix,
            revokedAt: apiKey.revokedAt,
            ...SUM_COLS,
        })
        .from(ir)
        .leftJoin(apiKey, eq(apiKey.id, ir.apiKeyId))
        .where(sourceWhere(workspaceId, since, source))
        .groupBy(ir.source, ir.apiKeyId, apiKey.name, apiKey.prefix, apiKey.revokedAt)
        .orderBy(desc(sql`coalesce(sum(${ir.costMicro}), 0)`), desc(sql`count(*)`))
}

const LOG_COLS = {
    id: ir.id,
    createdAt: ir.createdAt,
    source: ir.source,
    model: ir.model,
    keyId: ir.apiKeyId,
    keyName: apiKey.name,
    keyPrefix: apiKey.prefix,
    conversationId: ir.conversationId,
    conversationTitle: aiConversations.title,
    inputTokens: ir.inputTokens,
    outputTokens: ir.outputTokens,
    reasoningTokens: ir.reasoningTokens,
    costMicro: ir.costMicro,
    latencyMs: ir.latencyMs,
    firstTokenMs: ir.firstTokenMs,
    stream: ir.stream,
    status: ir.status,
    errorCode: ir.errorCode,
}

function logQuery(where: SQL | undefined, limit: number, offset: number) {
    return db
        .select(LOG_COLS)
        .from(ir)
        .leftJoin(apiKey, eq(apiKey.id, ir.apiKeyId))
        .leftJoin(aiConversations, eq(aiConversations.id, ir.conversationId))
        .where(where)
        .orderBy(desc(ir.createdAt))
        .limit(limit)
        .offset(offset)
}

type LogRaw = {
    id: string; createdAt: Date; source: UsageSource; model: string; keyId: string | null; keyName: string | null
    keyPrefix: string | null; conversationId: string | null; conversationTitle: string | null; inputTokens: number
    outputTokens: number; reasoningTokens: number; costMicro: number; latencyMs: number | null; firstTokenMs: number | null
    stream: number; status: "ok" | "error"; errorCode: string | null
}

function toRequestRow(r: LogRaw): RequestRow {
    return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        source: r.source,
        model: r.model,
        keyId: r.keyId,
        keyName: r.keyName,
        keyPrefix: r.keyPrefix,
        conversationId: r.conversationId,
        conversationTitle: r.conversationTitle,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        reasoningTokens: r.reasoningTokens,
        costMicro: num(r.costMicro),
        latencyMs: r.latencyMs,
        firstTokenMs: r.firstTokenMs,
        stream: r.stream === 1,
        status: r.status,
        errorCode: r.errorCode,
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Shaping
// ---------------------------------------------------------------------------------------------------------------------

function emptyBuckets(): UsageBuckets {
    return { today: { ...EMPTY_TOTALS }, last7: { ...EMPTY_TOTALS }, last30: { ...EMPTY_TOTALS }, last90: { ...EMPTY_TOTALS } }
}

function shapeBuckets(rows: { source: UsageSource; today: UsageTotals; last7: UsageTotals; last30: UsageTotals; last90: UsageTotals }[]): UsageBucketsBySource {
    const out: UsageBucketsBySource = { kura: emptyBuckets(), api: emptyBuckets() }
    for (const r of rows) {
        if (r.source !== "kura" && r.source !== "api") continue
        out[r.source] = { today: r.today, last7: r.last7, last30: r.last30, last90: r.last90 }
    }
    return out
}

function shapeDaily(rows: ({ day: string; source: UsageSource } & UsageTotals)[], days: number, now: Date): UsageDay[] {
    const byDay = new Map<string, UsageDay>()
    for (const day of nepalDayKeys(days, now)) byDay.set(day, { day, kura: { ...EMPTY_TOTALS }, api: { ...EMPTY_TOTALS } })
    for (const r of rows) {
        const d = byDay.get(r.day)
        if (!d || (r.source !== "kura" && r.source !== "api")) continue
        d[r.source] = { requests: r.requests, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costMicro: r.costMicro }
    }
    return [...byDay.values()]
}

// ---------------------------------------------------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------------------------------------------------

/** /usage: the named-window band, the daily series and the per-key breakdown for the window, one page of the log. */
export async function getUsage(workspaceId: string, window: UsageWindow, source: UsageSourceFilter, page: number): Promise<UsageData> {
    const now = new Date()
    const days = windowDays(window)
    const since = nepalDayStart(days - 1, now)
    const where = sourceWhere(workspaceId, since, source)
    const safePage = Math.max(1, Math.floor(page) || 1)
    const [buckets, daily, keys, log, [total]] = await db.batch([
        bucketsQuery(workspaceId, now),
        dailyQuery(workspaceId, since, source),
        keysQuery(workspaceId, since, source),
        logQuery(where, REQUEST_LOG_PAGE_SIZE, (safePage - 1) * REQUEST_LOG_PAGE_SIZE),
        db.select({ n: count() }).from(ir).where(where),
    ])
    const totalRows = total?.n ?? 0
    const keyRows: KeyBreakdownRow[] = keys.map((k) => ({
        keyId: k.keyId,
        source: k.source,
        name: k.source === "kura" ? "Kura" : k.name ?? "Deleted key",
        prefix: k.prefix,
        revoked: !!k.revokedAt,
        totals: { requests: k.requests, inputTokens: k.inputTokens, outputTokens: k.outputTokens, costMicro: k.costMicro },
    }))
    return {
        window,
        source,
        buckets: shapeBuckets(buckets),
        daily: shapeDaily(daily, days, now),
        keys: keyRows,
        log: {
            rows: log.map(toRequestRow),
            page: safePage,
            pageSize: REQUEST_LOG_PAGE_SIZE,
            total: totalRows,
            pages: Math.max(1, Math.ceil(totalRows / REQUEST_LOG_PAGE_SIZE)),
        },
    }
}

/**
 * /home: the workspace's balance, named-window totals, active keys, 30 days of spend by source and recent API calls,
 * plus the person's own recent Kura chats in it.
 */
export async function getHomeOverview(workspaceId: string, userId: string): Promise<HomeData> {
    const now = new Date()
    const since30 = nepalDayStart(29, now)
    const convStats = sql<UsageTotals>`(
        select json_build_object(
            'requests', count(*),
            'inputTokens', coalesce(sum(${ir.inputTokens}), 0),
            'outputTokens', coalesce(sum(${ir.outputTokens}), 0),
            'costMicro', coalesce(sum(${ir.costMicro}), 0)
        ) from ${ir} where ${ir.conversationId} = ${aiConversations.id} and ${ir.workspaceId} = ${workspaceId}
    )`.mapWith(toTotals)

    const [balanceMicro, [buckets, daily, [active], convs, calls, [started]]] = await Promise.all([
        getBalanceMicro(workspaceId),
        db.batch([
            bucketsQuery(workspaceId, now),
            dailyQuery(workspaceId, since30, "all"),
            db.select({ n: count() }).from(apiKey).where(and(eq(apiKey.workspaceId, workspaceId), sql`${apiKey.revokedAt} is null`)),
            db
                .select({ id: aiConversations.id, title: aiConversations.title, createdAt: aiConversations.createdAt, updatedAt: aiConversations.updatedAt, stats: convStats })
                .from(aiConversations)
                .where(and(eq(aiConversations.workspaceId, workspaceId), eq(aiConversations.userId, userId)))
                .orderBy(desc(aiConversations.updatedAt))
                .limit(RECENT_EACH),
            logQuery(and(eq(ir.workspaceId, workspaceId), eq(ir.source, "api")), RECENT_EACH, 0),
            // Get started: has this workspace ever made a key, called the API, used Kura? (Any row, revoked keys included.)
            db.select({
                key: sql<boolean>`exists (select 1 from ${apiKey} where ${apiKey.workspaceId} = ${workspaceId})`.mapWith(Boolean),
                apiCall: sql<boolean>`exists (select 1 from ${ir} where ${ir.workspaceId} = ${workspaceId} and ${ir.source} = 'api')`.mapWith(Boolean),
                kura: sql<boolean>`exists (select 1 from ${ir} where ${ir.workspaceId} = ${workspaceId} and ${ir.source} = 'kura')`.mapWith(Boolean),
            }).from(user).where(eq(user.id, userId)).limit(1),
        ]),
    ])

    const kura: ActivityItem[] = convs.map((c): KuraActivity => ({
        kind: "kura",
        id: c.id,
        at: c.updatedAt.toISOString(),
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        ...c.stats,
    }))
    const api: ActivityItem[] = calls.map((r) => {
        const request = toRequestRow(r)
        return { kind: "api", id: request.id, at: request.createdAt, request }
    })
    const recent = [...kura, ...api].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, RECENT_TOTAL)

    return {
        balanceMicro: num(balanceMicro),
        buckets: shapeBuckets(buckets),
        activeKeys: active?.n ?? 0,
        daily: shapeDaily(daily, 30, now),
        recent,
        started: { key: !!started?.key, apiCall: !!started?.apiCall, kura: !!started?.kura },
    }
}

const LEDGER_LABEL: Record<LedgerKind, string> = {
    grant: "Free credits",
    purchase: "Credits bought",
    refund: "Refund",
    expiry: "Expired",
    spend: "Usage",
}

/** /billing: the workspace's balance, purchases and grants (ledger, spends excluded), spending per Nepal day, payments. */
export async function getBillingSummary(workspaceId: string): Promise<BillingData> {
    const ownedBy = and(eq(billingAccount.ownerType, "workspace"), eq(billingAccount.ownerId, workspaceId))
    const [balanceMicro, [ledger, spendDays, payments]] = await Promise.all([
        getBalanceMicro(workspaceId),
        db.batch([
            db
                .select({ id: creditLedger.id, kind: creditLedger.kind, amountMicro: creditLedger.amountMicro, description: creditLedger.description, createdAt: creditLedger.createdAt })
                .from(creditLedger)
                .innerJoin(billingAccount, eq(billingAccount.id, creditLedger.accountId))
                .where(and(ownedBy, ne(creditLedger.kind, "spend")))
                .orderBy(desc(creditLedger.createdAt))
                .limit(HISTORY_LIMIT),
            db
                .select({ day: DAY_EXPR, requests: sql<number>`count(*)`.mapWith(Number), costMicro: sql<number>`coalesce(sum(${ir.costMicro}), 0)`.mapWith(Number) })
                .from(ir)
                .where(and(eq(ir.workspaceId, workspaceId), gt(ir.costMicro, 0)))
                .groupBy(DAY_EXPR)
                .orderBy(desc(DAY_EXPR))
                .limit(SPEND_DAYS_LIMIT),
            db
                .select({
                    id: payment.id, createdAt: payment.createdAt, provider: payment.provider, status: payment.status,
                    credits: payment.credits, amountMinor: payment.amountMinor, currency: payment.currency,
                })
                .from(payment)
                .innerJoin(billingAccount, eq(billingAccount.id, payment.accountId))
                .where(and(ownedBy, eq(payment.kind, "credits")))
                .orderBy(desc(payment.createdAt))
                .limit(PAYMENTS_LIMIT),
        ]),
    ])

    const entries: BillingHistoryRow[] = ledger.map((l) => ({
        id: l.id,
        at: l.createdAt.toISOString(),
        kind: l.kind,
        description: l.description || LEDGER_LABEL[l.kind],
        amountMicro: num(l.amountMicro),
        requests: null,
    }))
    // A spend day sorts at the END of its Nepal day, so a grant made that morning lists below it.
    const spends: BillingHistoryRow[] = spendDays.map((d) => ({
        id: `spend:${d.day}`,
        at: new Date(Date.parse(`${d.day}T23:59:59Z`) - NEPAL_OFFSET_MS).toISOString(),
        kind: "spend",
        description: `Usage on ${formatDayKey(d.day)}`,
        amountMicro: -num(d.costMicro),
        requests: d.requests,
    }))
    const history = [...entries, ...spends].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    const paymentRows: BillingPaymentRow[] = payments.map((p) => ({
        id: p.id,
        createdAt: p.createdAt.toISOString(),
        provider: p.provider,
        status: p.status,
        credits: p.credits,
        amountMinor: p.amountMinor,
        currency: p.currency,
    }))
    return { balanceMicro: num(balanceMicro), history, payments: paymentRows }
}
