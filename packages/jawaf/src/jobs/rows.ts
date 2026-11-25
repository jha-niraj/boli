import { and, asc, db, eq, inArray, isNull, lt, or, sql } from "@repo/db"
import { jawafBot, jawafJob, jawafPage, jawafSource } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import type { JawafJobKind, JawafJobStatus } from "@repo/boli/jawaf"
import type { JawafJobProgress, JawafJobView } from "../types"

/**
 * The jawaf_job row: the ONE record of a job in both runners (local slices and Workflows). Progress, cursor and the
 * lease live here; a Workflow keeps no state of its own beyond "which step is next".
 */

export type JobRow = typeof jawafJob.$inferSelect

/** A lease long enough for one slice (local) or one step (Workflow). A crashed holder's lease simply expires. */
export const LEASE_SECONDS = 60

export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

export const isActive = (status: string) => status === "queued" || status === "running"

export function toJobView(j: JobRow): JawafJobView {
    const p = obj(j.progress)
    const progress: JawafJobProgress = {
        done: typeof p.done === "number" ? p.done : 0,
        total: typeof p.total === "number" ? p.total : 0,
        label: typeof p.label === "string" ? p.label : "Waiting to start",
    }
    const code = j.errorCode === "credits" || j.errorCode === "limit" || j.errorCode === "provider" ? j.errorCode : null
    return {
        id: j.id,
        botId: j.botId,
        kind: j.kind as JawafJobKind,
        status: j.status as JawafJobStatus,
        progress,
        error: j.error,
        errorCode: code,
        createdAt: j.createdAt.toISOString(),
        startedAt: j.startedAt?.toISOString() ?? null,
        finishedAt: j.finishedAt?.toISOString() ?? null,
    }
}

/**
 * Queue a job, or return the one already active for (bot, kind, source) - the partial unique index makes "Train now"
 * pressed twice one job. The caller then DISPATCHES it (packages/jobs client): nothing more locally, a Workflow
 * instance (id = job id) under JOBS_RUNNER=workflow.
 */
export async function enqueueJob(input: { workspaceId: string; botId: string; kind: JawafJobKind; sourceId?: string | null; createdById?: string | null; cursor?: object; label?: string }): Promise<JobRow> {
    const inserted = await db.insert(jawafJob).values({
        workspaceId: input.workspaceId,
        botId: input.botId,
        kind: input.kind,
        sourceId: input.sourceId ?? null,
        createdById: input.createdById ?? null,
        cursor: input.cursor ?? {},
        progress: { done: 0, total: 0, label: input.label ?? "Waiting to start" },
    }).onConflictDoNothing().returning()
    if (inserted[0]) return inserted[0]
    const [active] = await db.select().from(jawafJob).where(and(
        eq(jawafJob.botId, input.botId),
        eq(jawafJob.kind, input.kind),
        input.sourceId ? eq(jawafJob.sourceId, input.sourceId) : isNull(jawafJob.sourceId),
        inArray(jawafJob.status, ["queued", "running"]),
    )).limit(1)
    if (!active) throw new AppError("conflict", "That job could not be started. Try again.")
    return active
}

export async function loadJob(workspaceId: string, jobId: string): Promise<JobRow> {
    const [j] = await db.select().from(jawafJob).where(and(eq(jawafJob.id, jobId), eq(jawafJob.workspaceId, workspaceId))).limit(1)
    if (!j) throw new AppError("notfound", "That job could not be found.")
    return j
}

/** A job by id with no tenant filter - server-to-server only (the jobs Worker, the admin bridge). */
export async function loadJobById(jobId: string): Promise<JobRow | null> {
    const [j] = await db.select().from(jawafJob).where(eq(jawafJob.id, jobId)).limit(1)
    return j ?? null
}

/** The newest job of a bot that is still running (for the Knowledge page's progress bar). */
export async function activeJobFor(botId: string): Promise<JobRow | null> {
    const [j] = await db.select().from(jawafJob)
        .where(and(eq(jawafJob.botId, botId), inArray(jawafJob.status, ["queued", "running"])))
        .orderBy(asc(jawafJob.createdAt)).limit(1)
    return j ?? null
}

/** Take the lease with one conditional UPDATE. null = someone else holds it, or the job already finished. */
export async function claimJob(jobId: string): Promise<JobRow | null> {
    const rows = await db.update(jawafJob)
        .set({
            leaseUntil: sql`now() + make_interval(secs => ${LEASE_SECONDS})`,
            status: "running",
            startedAt: sql`coalesce(${jawafJob.startedAt}, now())`,
            slices: sql`${jawafJob.slices} + 1`,
            updatedAt: new Date(),
        })
        .where(and(eq(jawafJob.id, jobId), inArray(jawafJob.status, ["queued", "running"]), or(isNull(jawafJob.leaseUntil), lt(jawafJob.leaseUntil, sql`now()`))))
        .returning()
    return rows[0] ?? null
}

export async function saveProgress(jobId: string, cursor: object, progress: JawafJobProgress): Promise<void> {
    await db.update(jawafJob).set({ cursor, progress, updatedAt: new Date() }).where(eq(jawafJob.id, jobId))
}

export async function releaseJob(jobId: string, cursor: object, progress: JawafJobProgress): Promise<JobRow | null> {
    const [released] = await db.update(jawafJob).set({ leaseUntil: null, cursor, progress, updatedAt: new Date() }).where(eq(jawafJob.id, jobId)).returning()
    return released ?? null
}

export async function finishJob(jobId: string, status: JawafJobStatus, o: { error?: string; code?: string | null; progress: JawafJobProgress; cursor: object }): Promise<JobRow> {
    const label = status === "done" ? "Done" : status === "cancelled" ? "Stopped" : o.progress.label
    const [row] = await db.update(jawafJob).set({
        status,
        error: o.error ?? null,
        errorCode: o.code ?? null,
        progress: { ...o.progress, label },
        cursor: o.cursor,
        leaseUntil: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
    }).where(eq(jawafJob.id, jobId)).returning()
    if (!row) throw new AppError("notfound", "That job could not be found.")
    if (status !== "done") await settleEndedRead(row)
    return row
}

/**
 * A read that ends WITHOUT its finish step (failed, cancelled, a Workflow that died) must not leave the bot stuck: the
 * setup moves from "reading" to "review" (the owner sees what was read and can read again from Knowledge), and the
 * site sources leave "reading" - ready when some page was read, else failed with the job's sentence. Idempotent; a
 * no-op for other kinds and for a bot already past reading.
 */
export async function settleEndedRead(job: JobRow): Promise<void> {
    if (job.kind !== "read") return
    const now = new Date()
    const anyRead = sql`EXISTS (SELECT 1 FROM ${jawafPage} WHERE ${jawafPage.botId} = ${job.botId} AND ${jawafPage.readStatus} = 'read')`
    await db.batch([
        db.update(jawafSource).set({
            status: sql`CASE WHEN ${anyRead} THEN 'ready' ELSE 'failed' END`,
            error: sql`CASE WHEN ${anyRead} THEN NULL ELSE ${job.error ?? "Reading stopped. Try again."} END`,
            updatedAt: now,
        }).where(and(eq(jawafSource.botId, job.botId), inArray(jawafSource.kind, ["site", "url"]), eq(jawafSource.status, "reading"))),
        db.update(jawafBot).set({ setupStep: "review", updatedAt: now })
            .where(and(eq(jawafBot.id, job.botId), eq(jawafBot.setupStep, "reading"))),
    ])
}

/** Fail a job whose Workflow instance died outside our steps (errored / terminated), unless it already finished. */
export async function failIfActive(jobId: string, error: string): Promise<JobRow | null> {
    const [row] = await db.update(jawafJob).set({ status: "failed", error, errorCode: "provider", leaseUntil: null, finishedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(jawafJob.id, jobId), inArray(jawafJob.status, ["queued", "running"]))).returning()
    if (row) await settleEndedRead(row)
    return row ?? null
}
