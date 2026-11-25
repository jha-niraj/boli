import "server-only"

import { and, count, db, desc, eq, gte, inArray, lt, or, sql } from "@repo/db"
import { adminAuditLog, jawafBot, jawafJob } from "@repo/db/schema"
import { adminCan, type AdminPermissions } from "./permissions"

/**
 * System > Health (plan/admin/jawaf/admin-v1.md task 1). Server only. The database check is a timed `select 1`; the
 * rest is one `db.batch`. Jawaf's background jobs show only to admins who hold `jawaf`.
 */

const DAY = 24 * 60 * 60 * 1000
const STUCK_QUEUED_MS = 15 * 60 * 1000
const JOB_ROWS = 10

export interface HealthJob {
    id: string
    botName: string
    kind: string
    status: string
    error: string | null
    at: string
}

export interface HealthData {
    database: { ok: boolean; latencyMs: number | null }
    errors: { last7: number; allTime: number } | null
    /** null = this admin cannot read Jawaf. */
    jobs: { running: number; queued: number; stuck: number; failed24h: number; recent: HealthJob[] } | null
    checkedAt: string
}

export async function loadHealthData(admin: { role: string; permissions: AdminPermissions }): Promise<HealthData> {
    const now = new Date()
    const started = Date.now()
    let ok = true
    try {
        await db.execute(sql`select 1`)
    } catch (err) {
        console.error("[health] database check failed:", err)
        ok = false
    }
    const latencyMs = ok ? Date.now() - started : null
    if (!ok) return { database: { ok, latencyMs }, errors: null, jobs: null, checkedAt: now.toISOString() }

    const since7 = new Date(now.getTime() - 7 * DAY)
    const since24h = new Date(now.getTime() - DAY)
    const stuck = or(
        and(eq(jawafJob.status, "running"), lt(jawafJob.leaseUntil, now)),
        and(eq(jawafJob.status, "queued"), lt(jawafJob.createdAt, new Date(now.getTime() - STUCK_QUEUED_MS))),
    )

    const [errors7, errorsAll] = await db.batch([
        db.select({ n: count() }).from(adminAuditLog).where(and(eq(adminAuditLog.action, "ERROR"), gte(adminAuditLog.createdAt, since7))),
        db.select({ n: count() }).from(adminAuditLog).where(eq(adminAuditLog.action, "ERROR")),
    ])

    let jobs: HealthData["jobs"] = null
    if (adminCan(admin, "jawaf")) {
        const [running, queued, stuckN, failed, recent] = await db.batch([
            db.select({ n: count() }).from(jawafJob).where(eq(jawafJob.status, "running")),
            db.select({ n: count() }).from(jawafJob).where(eq(jawafJob.status, "queued")),
            db.select({ n: count() }).from(jawafJob).where(and(inArray(jawafJob.status, ["queued", "running"]), stuck)),
            db.select({ n: count() }).from(jawafJob).where(and(eq(jawafJob.status, "failed"), gte(jawafJob.updatedAt, since24h))),
            // Stuck jobs first, then the latest failures.
            db.select({
                id: jawafJob.id, kind: jawafJob.kind, status: jawafJob.status, error: jawafJob.error, updatedAt: jawafJob.updatedAt,
                botName: jawafBot.name,
            }).from(jawafJob).innerJoin(jawafBot, eq(jawafBot.id, jawafJob.botId))
                .where(or(and(inArray(jawafJob.status, ["queued", "running"]), stuck), and(eq(jawafJob.status, "failed"), gte(jawafJob.updatedAt, since24h))))
                .orderBy(desc(jawafJob.updatedAt)).limit(JOB_ROWS),
        ])
        jobs = {
            running: Number(running[0]?.n ?? 0),
            queued: Number(queued[0]?.n ?? 0),
            stuck: Number(stuckN[0]?.n ?? 0),
            failed24h: Number(failed[0]?.n ?? 0),
            recent: recent.map((j) => ({ id: j.id, botName: j.botName, kind: j.kind, status: j.status, error: j.error, at: j.updatedAt.toISOString() })),
        }
    }

    return {
        database: { ok, latencyMs },
        errors: { last7: Number(errors7[0]?.n ?? 0), allTime: Number(errorsAll[0]?.n ?? 0) },
        jobs,
        checkedAt: now.toISOString(),
    }
}
