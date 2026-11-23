import type { UsageSource, UsageSourceFilter, UsageTotals, UsageWindow } from "@/types/platform"

/**
 * Browser-safe helpers shared by the platform pages (Home, API keys, Usage, Billing) and their server queries: query
 * keys, the windows and sources, and date formatting. Days are Nepal days: Asia/Kathmandu is a fixed UTC+05:45 (no
 * daylight saving), so the server buckets and the browser labels agree. Dates are always formatted with a fixed locale
 * AND time zone (no hydration mismatch).
 */

export const TIME_ZONE = "Asia/Kathmandu"
export const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60_000

export const PLATFORM_KEYS = {
    home: ["home", "overview"] as const,
    keys: ["keys", "list"] as const,
    usageAll: ["usage"] as const,
    usage: (window: UsageWindow, source: UsageSourceFilter, page: number) => ["usage", "summary", window, source, page] as const,
    /** Same key as the checkout result page invalidates after a payment lands. */
    billing: ["billing", "overview"] as const,
}

export const USAGE_WINDOWS: { value: UsageWindow; label: string; days: number }[] = [
    { value: "7d", label: "7 days", days: 7 },
    { value: "30d", label: "30 days", days: 30 },
    { value: "90d", label: "90 days", days: 90 },
]

export const USAGE_SOURCES: { value: UsageSourceFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "kura", label: "Kura" },
    { value: "api", label: "API" },
]

export const SOURCE_LABEL: Record<UsageSource, string> = { kura: "Kura", api: "API" }

export const REQUEST_LOG_PAGE_SIZE = 25

export function windowDays(w: UsageWindow): number {
    return USAGE_WINDOWS.find((x) => x.value === w)?.days ?? 30
}

export function isUsageWindow(v: unknown): v is UsageWindow {
    return v === "7d" || v === "30d" || v === "90d"
}

export function isSourceFilter(v: unknown): v is UsageSourceFilter {
    return v === "all" || v === "kura" || v === "api"
}

/** The UTC instant at which the Nepal day `daysAgo` days before `now` began. */
export function nepalDayStart(daysAgo: number, now: Date = new Date()): Date {
    const local = new Date(now.getTime() + NEPAL_OFFSET_MS)
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
    return new Date(midnight - daysAgo * 86_400_000 - NEPAL_OFFSET_MS)
}

/** Nepal day keys (`YYYY-MM-DD`) for the last `days` days, oldest first, today last. */
export function nepalDayKeys(days: number, now: Date = new Date()): string[] {
    const local = new Date(now.getTime() + NEPAL_OFFSET_MS)
    const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
    return Array.from({ length: days }, (_, i) => new Date(today - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10))
}

export const EMPTY_TOTALS: UsageTotals = { requests: 0, inputTokens: 0, outputTokens: 0, costMicro: 0 }

export function addTotals(a: UsageTotals, b: UsageTotals): UsageTotals {
    return {
        requests: a.requests + b.requests,
        inputTokens: a.inputTokens + b.inputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        costMicro: a.costMicro + b.costMicro,
    }
}

/** "24 Nov 2026" in Nepal time. */
export function formatDay(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE })
}

/** "24 Nov, 14:05" in Nepal time. */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE })
}

/** "24 Nov 2026, 14:05:09" in Nepal time - the detail sheets. */
export function formatFullDateTime(iso: string | null | undefined): string {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: TIME_ZONE,
    })
}

/** A Nepal day key (`YYYY-MM-DD`) as "24 Nov 2026". */
export function formatDayKey(key: string): string {
    const d = new Date(`${key}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return key
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

export function formatLatency(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return "-"
    if (ms < 1000) return `${ms} ms`
    return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
}

/** Integer minor units (paisa) as rupees: 50000 -> "Rs 500.00". */
export function formatRupeesMinor(minor: number): string {
    return `Rs ${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const PROVIDER_NAMES: Record<string, string> = {
    esewa: "eSewa",
    khalti: "Khalti",
    razorpay: "Razorpay",
    cashfree: "Cashfree",
    stripe: "Card",
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    created: "Started",
    pending: "Waiting",
    succeeded: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
    refunded: "Refunded",
}
