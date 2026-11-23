/**
 * View types for the platform pages (Home, API keys, Usage, Billing). Plain data: every date is an ISO string and every
 * credit amount is integer MICRO-credits (display with `formatCredits` from lib/boli.ts).
 */

export type UsageSource = "kura" | "api"
export type UsageSourceFilter = "all" | UsageSource
export type UsageWindow = "7d" | "30d" | "90d"

export interface ApiKeyRow {
    id: string
    name: string
    prefix: string
    createdAt: string
    lastUsedAt: string | null
    revokedAt: string | null
}

export interface CreatedApiKey {
    id: string
    /** The full secret. Shown once, never stored. */
    key: string
    prefix: string
    createdAt: string
}

/** One window's totals. `requests` counts calls; tokens and cost are sums. */
export interface UsageTotals {
    requests: number
    inputTokens: number
    outputTokens: number
    costMicro: number
}

/** Named windows (AGENTS.md section 9). Days are Nepal days (Asia/Kathmandu). */
export interface UsageBuckets {
    today: UsageTotals
    last7: UsageTotals
    last30: UsageTotals
    last90: UsageTotals
}

export interface UsageBucketsBySource {
    kura: UsageBuckets
    api: UsageBuckets
}

/** One Nepal day. Oldest first; every day of the window is present (a day with no calls is all zeros). */
export interface UsageDay {
    day: string
    kura: UsageTotals
    api: UsageTotals
}

export interface KeyBreakdownRow {
    /** null = Kura (no key). */
    keyId: string | null
    source: UsageSource
    name: string
    prefix: string | null
    revoked: boolean
    totals: UsageTotals
}

export interface RequestRow {
    id: string
    createdAt: string
    source: UsageSource
    model: string
    keyId: string | null
    keyName: string | null
    keyPrefix: string | null
    conversationId: string | null
    conversationTitle: string | null
    inputTokens: number
    outputTokens: number
    reasoningTokens: number
    costMicro: number
    latencyMs: number | null
    firstTokenMs: number | null
    stream: boolean
    status: "ok" | "error"
    errorCode: string | null
}

export interface RequestLogPage {
    rows: RequestRow[]
    page: number
    pageSize: number
    total: number
    pages: number
}

export interface UsageData {
    window: UsageWindow
    source: UsageSourceFilter
    buckets: UsageBucketsBySource
    daily: UsageDay[]
    keys: KeyBreakdownRow[]
    log: RequestLogPage
}

export interface KuraActivity {
    kind: "kura"
    id: string
    at: string
    title: string
    createdAt: string
    requests: number
    inputTokens: number
    outputTokens: number
    costMicro: number
}

export interface ApiActivity {
    kind: "api"
    id: string
    at: string
    request: RequestRow
}

export type ActivityItem = KuraActivity | ApiActivity

export interface HomeData {
    balanceMicro: number
    buckets: UsageBucketsBySource
    activeKeys: number
    daily: UsageDay[]
    recent: ActivityItem[]
}

export type LedgerKind = "grant" | "purchase" | "refund" | "expiry" | "spend"

/** A Billing history line: a ledger entry, or one day of spending summed. */
export interface BillingHistoryRow {
    id: string
    at: string
    kind: LedgerKind
    description: string
    amountMicro: number
    /** Spend days: how many requests the day's total covers. */
    requests: number | null
}

export interface BillingPaymentRow {
    id: string
    createdAt: string
    provider: string
    status: string
    credits: number | null
    amountMinor: number
    currency: string
}

export interface BillingData {
    balanceMicro: number
    history: BillingHistoryRow[]
    payments: BillingPaymentRow[]
}
