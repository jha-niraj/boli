import { and, asc, db, inArray, isNull, lt, or, sql } from "@repo/db"
import { jawafJob } from "@repo/db/schema"
import { AppError, isAppError } from "@repo/errors"
import { loadBot, type BotRow } from "../bots"
import type { JawafJobProgress } from "../types"
import { claimJob, finishJob, isActive, loadJobById, obj, releaseJob, saveProgress, toJobView, type JobRow } from "./rows"
import { describeNextStep, runStep } from "./steps"

/**
 * The two runners over the same steps (./steps.ts).
 *
 * LOCAL (JOBS_RUNNER=local, the default): `runSlice` claims the lease and runs steps until SLICE_BUDGET_MS, saving
 * progress after every step. Driven by the page's poll (`POST /api/jawaf/jobs/<id>/tick`), the admin's bridge tick and
 * the hourly cron (`runDueJobs`, for a closed tab). A retryable error (rate limit, outage) ends the slice with
 * "(retrying)" and the next slice retries.
 *
 * WORKFLOW (JOBS_RUNNER=workflow): apps/jobs calls `advanceJob` once per step.do. It runs exactly ONE step and THROWS a
 * retryable error, so step.do retries it with backoff; `waitMs` tells the Workflow to step.sleep.
 */

/** A slice stops starting new steps after this long (a step itself is bounded: 3 scrapes, or one model call). */
export const SLICE_BUDGET_MS = 12_000
/** The local runner's pause when a step says "nothing to do yet" (the Sarvam poll). */
const LOCAL_WAIT_MS = 2_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Run one slice of a job: claim the lease, run steps until `budgetMs`, save progress after every step, release.
 * Returns the job as it stands (unchanged when someone else holds the lease or it already finished).
 */
export async function runSlice(jobId: string, budgetMs = SLICE_BUDGET_MS): Promise<JobRow> {
    const job = await claimJob(jobId)
    if (!job) {
        const current = await loadJobById(jobId)
        if (!current) throw new AppError("notfound", "That job could not be found.")
        return current
    }
    const deadline = Date.now() + budgetMs
    let cursor: object = obj(job.cursor)
    let progress = toJobView(job).progress
    let bot: BotRow
    try {
        bot = await loadBot(job.workspaceId, job.botId)
    } catch {
        return finishJob(job.id, "cancelled", { error: "The bot was deleted.", progress, cursor })
    }
    try {
        for (;;) {
            const out = await runStep(job, bot, cursor)
            cursor = out.cursor
            progress = out.progress
            if (out.failed) return finishJob(job.id, "failed", { error: out.failed.error, code: out.failed.code ?? null, progress, cursor })
            if (out.done) return finishJob(job.id, "done", { progress, cursor })
            await saveProgress(job.id, cursor, progress)
            if (out.waitMs) await sleep(Math.min(out.waitMs, LOCAL_WAIT_MS))
            if (Date.now() >= deadline) break
        }
    } catch (err) {
        // A provider outage leaves the job running; the next slice retries. Anything else fails it with a plain line.
        const retryable = isAppError(err) && err.retryable
        console.error("[jawaf] job slice failed", job.kind, err instanceof Error ? err.message : err)
        if (!retryable) {
            return finishJob(job.id, "failed", { error: isAppError(err) ? err.userMessage : "Something went wrong while reading. Try again.", code: "provider", progress, cursor })
        }
        progress = { ...progress, label: `${progress.label} (retrying)` }
    }
    return (await releaseJob(job.id, cursor, progress)) ?? job
}

/** What one Workflow step returns (plain JSON: step.do results are persisted). */
export interface AdvanceResult {
    jobId: string
    status: string
    finished: boolean
    progress: JawafJobProgress
    /** step.sleep this long before the next step (Sarvam still reading). */
    waitMs: number | null
    /** The name of the step that runs next (Workflow step names). */
    next: string
}

const result = (j: JobRow, waitMs: number | null = null): AdvanceResult => ({
    jobId: j.id,
    status: j.status,
    finished: !isActive(j.status),
    progress: toJobView(j).progress,
    waitMs,
    next: describeNextStep(j.kind, obj(j.cursor)),
})

/**
 * Run exactly ONE step of a job (a Workflow step.do). Throws a retryable AppError when the step should be retried
 * (the lease is busy, a rate limit, an outage); returns `finished: true` once the job is done / failed / cancelled.
 */
export async function advanceJob(jobId: string): Promise<AdvanceResult> {
    const job = await claimJob(jobId)
    if (!job) {
        const current = await loadJobById(jobId)
        if (!current) return { jobId, status: "cancelled", finished: true, progress: { done: 0, total: 0, label: "Job deleted" }, waitMs: null, next: "none" }
        if (!isActive(current.status)) return result(current)
        throw new AppError("network", "Another runner holds this job right now; retrying.")
    }
    let cursor: object = obj(job.cursor)
    let progress = toJobView(job).progress
    let bot: BotRow
    try {
        bot = await loadBot(job.workspaceId, job.botId)
    } catch {
        return result(await finishJob(job.id, "cancelled", { error: "The bot was deleted.", progress, cursor }))
    }
    try {
        const out = await runStep(job, bot, cursor)
        cursor = out.cursor
        progress = out.progress
        if (out.failed) return result(await finishJob(job.id, "failed", { error: out.failed.error, code: out.failed.code ?? null, progress, cursor }))
        if (out.done) return result(await finishJob(job.id, "done", { progress, cursor }))
        const released = await releaseJob(job.id, cursor, progress)
        return result(released ?? job, out.waitMs ?? null)
    } catch (err) {
        const retryable = isAppError(err) && err.retryable
        console.error("[jawaf] job step failed", job.kind, err instanceof Error ? err.message : err)
        if (retryable) {
            await releaseJob(job.id, cursor, { ...progress, label: `${progress.label} (retrying)` })
            throw err
        }
        return result(await finishJob(job.id, "failed", { error: isAppError(err) ? err.userMessage : "Something went wrong while reading. Try again.", code: "provider", progress, cursor }))
    }
}

/** Jobs nobody holds, oldest first (the hourly cron locally; the orphan sweep in the jobs Worker). */
export async function dueJobIds(limit = 20, olderThanMs = 0): Promise<{ id: string; kind: string }[]> {
    return db.select({ id: jawafJob.id, kind: jawafJob.kind }).from(jawafJob)
        .where(and(
            inArray(jawafJob.status, ["queued", "running"]),
            or(isNull(jawafJob.leaseUntil), lt(jawafJob.leaseUntil, sql`now()`)),
            olderThanMs > 0 ? lt(jawafJob.updatedAt, new Date(Date.now() - olderThanMs)) : sql`true`,
        ))
        .orderBy(asc(jawafJob.updatedAt)).limit(limit)
}

/** LOCAL: run slices for jobs nobody holds (oldest first) until `budgetMs` is used. Returns how many slices ran. */
export async function runDueJobs(budgetMs: number): Promise<{ slices: number; finished: number }> {
    const deadline = Date.now() + budgetMs
    let slices = 0
    let finished = 0
    for (const j of await dueJobIds(20)) {
        if (Date.now() >= deadline) break
        const after = await runSlice(j.id, Math.min(SLICE_BUDGET_MS, Math.max(2000, deadline - Date.now())))
        slices++
        if (!isActive(after.status)) finished++
    }
    return { slices, finished }
}
