import "server-only"
import { and, count, db, eq, gte, min } from "@repo/db"
import { inferenceRequest } from "@repo/db/schema"
import { RATE_LIMIT_PER_MIN } from "@/lib/boli"

/** Requests per minute per account (every key and Kura share it). API_RATE_LIMIT_PER_MIN overrides the constant. */
function limitPerMin(): number {
    const raw = (process.env.API_RATE_LIMIT_PER_MIN ?? "").trim()
    const n = raw ? Number(raw) : NaN
    return Number.isInteger(n) && n > 0 ? n : RATE_LIMIT_PER_MIN
}

/**
 * A sliding 60-second window over the user's `inference_request` rows (one per call, Kura and API). One read; no
 * extra table. When over the limit, `retryAfterSec` is when the oldest call in the window leaves it.
 */
export async function checkRateLimit(userId: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
    const limit = limitPerMin()
    const since = new Date(Date.now() - 60_000)
    const [row] = await db.select({ n: count(), oldest: min(inferenceRequest.createdAt) })
        .from(inferenceRequest)
        .where(and(eq(inferenceRequest.userId, userId), gte(inferenceRequest.createdAt, since)))
    if (Number(row?.n ?? 0) < limit) return { ok: true }
    const oldest = row?.oldest ? new Date(row.oldest).getTime() : Date.now()
    const retryAfterSec = Math.min(60, Math.max(1, Math.ceil((oldest + 60_000 - Date.now()) / 1000)))
    return { ok: false, retryAfterSec }
}
