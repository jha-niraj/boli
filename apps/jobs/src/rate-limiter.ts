import { DurableObject } from "cloudflare:workers"
import type { LimitDecision, LimitRule } from "@repo/jobs"
import type { Env } from "./env"

/**
 * EXACT sliding-window rate limits. One object per key (`RATE_LIMITER.idFromName(key)`), so every hit on a key - from
 * any isolate, any region - is counted in one place, and a Durable Object runs one request at a time, so check-then-
 * record cannot race. SQLite storage: one row per counted hit (rule, at, window). An alarm deletes rows whose window has
 * passed, and the whole object once it is empty, so idle keys cost nothing.
 *
 * Used for: the public Jawaf page (asks, voice, contact cards, ratings; per visitor and per IP hash) and the account
 * limit shared by /v1 and Kura (`api:<userId>`). Callers: packages/jobs limiter via JobsService.hit.
 */
export class RateLimiter extends DurableObject<Env> {
    private sql: SqlStorage
    private ready = false

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env)
        this.sql = ctx.storage.sql
    }

    /** The table (again after a cleanup's deleteAll emptied the object). */
    private ensureTable(): void {
        if (this.ready) return
        this.sql.exec("CREATE TABLE IF NOT EXISTS hits (rule TEXT NOT NULL, at INTEGER NOT NULL, win INTEGER NOT NULL)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS hits_rule_at ON hits (rule, at)")
        this.ready = true
    }

    /** Allowed only when every rule has room; then the hit counts against all of them. */
    async hit(rules: LimitRule[]): Promise<LimitDecision> {
        this.ensureTable()
        const now = Date.now()
        for (const r of rules) {
            const row = this.sql.exec<{ n: number; oldest: number | null }>("SELECT count(*) AS n, min(at) AS oldest FROM hits WHERE rule = ? AND at > ?", r.id, now - r.windowMs).one()
            if (row.n >= r.limit) {
                const oldest = row.oldest ?? now
                return { ok: false, rule: r.id, retryAfterSec: Math.max(1, Math.ceil((oldest + r.windowMs - now) / 1000)) }
            }
        }
        for (const r of rules) this.sql.exec("INSERT INTO hits (rule, at, win) VALUES (?, ?, ?)", r.id, now, r.windowMs)
        await this.scheduleCleanup(now)
        return { ok: true }
    }

    async alarm(): Promise<void> {
        this.ensureTable()
        const now = Date.now()
        this.sql.exec("DELETE FROM hits WHERE at + win <= ?", now)
        const left = this.sql.exec<{ n: number }>("SELECT count(*) AS n FROM hits").one().n
        if (left === 0) {
            // Nothing left to count: drop the object's storage entirely (an idle IP costs nothing).
            await this.ctx.storage.deleteAll()
            this.ready = false
            return
        }
        await this.scheduleCleanup(now)
    }

    /** Wake when the earliest row expires (never sooner than a minute from now: cleanup is not urgent). */
    private async scheduleCleanup(now: number): Promise<void> {
        const next = this.sql.exec<{ t: number | null }>("SELECT min(at + win) AS t FROM hits").one().t
        if (next === null) return
        const at = Math.max(next, now + 60_000)
        const current = await this.ctx.storage.getAlarm()
        if (current === null || current > at) await this.ctx.storage.setAlarm(at)
    }
}
