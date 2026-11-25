import { sql, type SQL } from "@repo/db"
import type { adminAuditLog, creditLedger, inferenceRequest, jawafMessage, payment, user } from "@repo/db/schema"

type TimeColumn =
    | typeof user.createdAt | typeof adminAuditLog.createdAt | typeof creditLedger.createdAt | typeof inferenceRequest.createdAt
    | typeof jawafMessage.createdAt | typeof payment.createdAt | SQL

/**
 * Nepal time for every per-day count in the console (apps/main/CLAUDE.md: Boli counts in Nepal time). Asia/Kathmandu is
 * a fixed UTC+05:45 with no daylight saving, so a Nepal day is `created_at + 5h45m` as a date and its start is a plain
 * offset from UTC midnight. Used by the server loaders (it builds SQL); lib/home-data.ts keeps its own copy of the
 * same helpers.
 */

export const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000

/** The UTC instant today's Nepal day started. */
export function nepalStartOfDay(now: Date): Date {
    const local = new Date(now.getTime() + NEPAL_OFFSET_MS)
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - NEPAL_OFFSET_MS)
}

/** The UTC instant this Nepal month started. */
export function nepalStartOfMonth(now: Date): Date {
    const local = new Date(now.getTime() + NEPAL_OFFSET_MS)
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - NEPAL_OFFSET_MS)
}

/** The start of the Nepal day `days - 1` days before today: the window "the last N days" (today included). */
export function nepalDaysAgo(now: Date, days: number): Date {
    return new Date(nepalStartOfDay(now).getTime() - (days - 1) * DAY_MS)
}

/** The last `n` Nepal days as YYYY-MM-DD, oldest first. */
export function nepalDayKeys(n: number, now: Date): string[] {
    const today = nepalStartOfDay(now).getTime() + NEPAL_OFFSET_MS
    return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i) * DAY_MS).toISOString().slice(0, 10))
}

/** SQL: the Nepal day (YYYY-MM-DD) of a UTC timestamp column. */
export function nepalDaySql(col: TimeColumn): SQL<string> {
    return sql<string>`to_char(${col} + interval '5 hours 45 minutes', 'YYYY-MM-DD')`
}

/** Fill a day series: every key present, missing days a real 0 (a day with none is an answer, AGENTS.md section 9). */
export function fillNepalDays(keys: string[], rows: { day: string; value: number | string | null }[]): { day: string; value: number }[] {
    const by = new Map(rows.map((r) => [r.day, Number(r.value ?? 0)]))
    return keys.map((day) => ({ day, value: by.get(day) ?? 0 }))
}
