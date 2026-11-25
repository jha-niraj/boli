import "server-only"
import { and, count, db, eq, gte, min } from "@repo/db"
import { inferenceRequest } from "@repo/db/schema"
import { RATE_LIMIT_PER_MIN } from "@repo/boli"
import { jobs } from "@/lib/jobs"

/** Requests per minute per account (every key and Kura share it). API_RATE_LIMIT_PER_MIN overrides the constant. */
function limitPerMin(): number {
    const raw = (process.env.API_RATE_LIMIT_PER_MIN ?? "").trim()
    const n = raw ? Number(raw) : NaN
    return Number.isInteger(n) && n > 0 ? n : RATE_LIMIT_PER_MIN
}

/**
 * The per-account limit (every API key and Kura share it).
 *
 * JOBS_RUNNER=workflow: EXACT, counted at the door by the RateLimiter Durable Object in boli-jobs (one object per
 * account; packages/jobs limiter). If the limiter cannot be reached it falls back to the database window below.
 * JOBS_RUNNER=local: a sliding 60-second window over the user's `inference_request` rows (one per call, Kura and API).
 * One read; no extra table. When over the limit, `retryAfterSec` is when the oldest call in the window leaves it.
 */
export async function checkRateLimit(userId: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
    const limit = limitPerMin()
    if (jobs.exactLimits()) {
        try {
            const d = await (await jobs.rpc()).hit(`api:${userId}`, [{ id: "minute", limit, windowMs: 60_000 }])
            return d.ok ? { ok: true } : { ok: false, retryAfterSec: Math.min(60, d.retryAfterSec) }
        } catch (err) {
            console.error("[ratelimit] limiter unavailable, using the database window", err instanceof Error ? err.message : err)
        }
    }
    const since = new Date(Date.now() - 60_000)
    const [row] = await db.select({ n: count(), oldest: min(inferenceRequest.createdAt) })
        .from(inferenceRequest)
        .where(and(eq(inferenceRequest.userId, userId), gte(inferenceRequest.createdAt, since)))
    if (Number(row?.n ?? 0) < limit) return { ok: true }
    const oldest = row?.oldest ? new Date(row.oldest).getTime() : Date.now()
    const retryAfterSec = Math.min(60, Math.max(1, Math.ceil((oldest + 60_000 - Date.now()) / 1000)))
    return { ok: false, retryAfterSec }
}
