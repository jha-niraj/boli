/**
 * Display formatting for the console's figures. A fixed locale and a fixed time zone (Nepal time, Asia/Kathmandu - Boli
 * counts and shows time in Nepal) so the server render and the first client paint print the same text (no hydration
 * mismatch); `RelativeTime` covers "2h ago".
 */
const NEPAL_TZ = "Asia/Kathmandu"
const NUM = new Intl.NumberFormat("en-US")
const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: NEPAL_TZ, day: "numeric", month: "short", year: "numeric" })
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
    timeZone: NEPAL_TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
})
/** For YYYY-MM-DD day keys that are ALREADY Nepal days: read at UTC midnight and printed in UTC, so the date never moves. */
const DAY_SHORT = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" })

export const fmtNumber = (n: number) => NUM.format(n)

export function fmtDate(value: string | Date | null | undefined): string {
    if (!value) return "-"
    const d = typeof value === "string" ? new Date(value) : value
    return Number.isNaN(d.getTime()) ? "-" : DATE.format(d)
}

/** "3 Nov 2026, 19:50 Nepal time" */
export function fmtDateTime(value: string | Date | null | undefined): string {
    if (!value) return "-"
    const d = typeof value === "string" ? new Date(value) : value
    return Number.isNaN(d.getTime()) ? "-" : `${DATE_TIME.format(d)} Nepal time`
}

/** A chart label for a YYYY-MM-DD bucket: "3 Nov". */
export function dayLabel(day: string): string {
    const d = new Date(`${day}T00:00:00Z`)
    return Number.isNaN(d.getTime()) ? day : DAY_SHORT.format(d)
}

/** Integer minor units in the currency a provider event carries: 123456 NPR -> "NPR 1,234.56". Boli money is fmtRupees. */
export function fmtMoneyMinor(minor: number, currency: string): string {
    const code = currency.toUpperCase()
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "code" }).format(minor / 100)
    } catch {
        return `${code} ${NUM.format(minor / 100)}`
    }
}

/** Rupees from integer paisa: 150000 -> "Rs 1,500"; 12345 -> "Rs 123.45" (Boli sells credits in NPR, 1 credit = Rs 1). */
export function fmtRupees(minor: number): string {
    const whole = minor % 100 === 0
    return `Rs ${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** "admin_management" -> "Admin management" */
export function humanize(value: string): string {
    const s = value.replace(/_/g, " ").toLowerCase()
    return s.charAt(0).toUpperCase() + s.slice(1)
}
