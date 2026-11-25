/**
 * Rate limits behind one interface. EXACT: the RateLimiter Durable Object in apps/jobs (one object per key, so every
 * hit on a key is counted in one place, across every isolate and region). FALLBACK: a sliding window in this isolate's
 * memory (best effort) - what the app used before, and what it uses with JOBS_RUNNER=local.
 *
 * A key names who is limited ("jawaf:ask:ip:<hash>", "api:<userId>"); its rules name the windows. A hit is allowed only
 * when EVERY rule has room, and then counts against all of them.
 */

export interface LimitRule {
    /** Unique within the key: "minute", "day". */
    id: string
    limit: number
    windowMs: number
}

export type LimitDecision = { ok: true } | { ok: false; rule: string; retryAfterSec: number }

export interface Limiter {
    hit(key: string, rules: LimitRule[]): Promise<LimitDecision>
}

const windows = new Map<string, number[]>()

/**
 * The per-isolate sliding window (moved from apps/main lib/jawaf/public.ts). True = allowed (and counted). Rules are
 * checked one by one, each counting when it passes - exactly the old behaviour.
 */
export function memoryHit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const list = (windows.get(key) ?? []).filter((t) => now - t < windowMs)
    if (list.length >= limit) {
        windows.set(key, list)
        return false
    }
    list.push(now)
    windows.set(key, list)
    if (windows.size > 20_000) {
        for (const [k, v] of windows) if (!v.length || now - v[v.length - 1]! > 86_400_000) windows.delete(k)
    }
    return true
}

export const memoryLimiter: Limiter = {
    async hit(key, rules) {
        for (const r of rules) {
            if (!memoryHit(`${key}:${r.id}`, r.limit, r.windowMs)) {
                const list = windows.get(`${key}:${r.id}`) ?? []
                const oldest = list[0] ?? Date.now()
                return { ok: false, rule: r.id, retryAfterSec: retryAfter(oldest, r.windowMs) }
            }
        }
        return { ok: true }
    },
}

export function retryAfter(oldestMs: number, windowMs: number, now = Date.now()): number {
    return Math.max(1, Math.ceil((oldestMs + windowMs - now) / 1000))
}
