import "server-only"
import { db, eq } from "@repo/db"
import { jawafJob } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { instanceIsDead } from "@repo/jobs"
import * as core from "@repo/jawaf/jobs"
import type { BotRow } from "@repo/jawaf/bots"
import { jobs } from "@/lib/jobs"

/**
 * Jawaf's long jobs (AGENTS.md section 5). The steps, the job rows and both runners live in @repo/jawaf
 * (packages/jawaf/src/jobs); this file is the app's side: create the row, then DISPATCH it through @repo/jobs.
 *
 *   JOBS_RUNNER=local (default): dispatch does nothing; the page's poll (`POST /api/jawaf/jobs/<id>/tick`) and the
 *     hourly cron (`jawaf-jobs`) run slices (`runSlice`), as before.
 *   JOBS_RUNNER=workflow: dispatch creates a Workflow instance in boli-jobs (id = the job id); the poll only reads the
 *     row (the Workflow writes progress there) and heals a missing / dead instance.
 */

export {
    activeJobFor, extractFileText, loadJob, runDueJobs, runSlice, SLICE_BUDGET_MS, toJobView, type JobRow,
} from "@repo/jawaf/jobs"

/** Hand a job to its runner. Never throws: a job that could not be handed over stays queued and is picked up again. */
export async function dispatchJob(job: core.JobRow): Promise<void> {
    try {
        await jobs.dispatch(job)
    } catch (err) {
        console.error("[jawaf] job dispatch failed; it stays queued", job.kind, err instanceof Error ? err.message : err)
    }
}

/** Queue a job (or return the active one for the same bot + kind + source) and dispatch it. */
export async function enqueueJob(input: Parameters<typeof core.enqueueJob>[0]): Promise<core.JobRow> {
    const job = await core.enqueueJob(input)
    await dispatchJob(job)
    return job
}

/** Start reading a bot's included pages (see @repo/jawaf/jobs startRead) and dispatch the job. */
export async function startRead(bot: BotRow, opts: { reread?: boolean; draft?: boolean; createdById?: string | null } = {}): Promise<core.JobRow> {
    const job = await core.startRead(bot, opts)
    await dispatchJob(job)
    return job
}

/** Queue the weekly re-read for every bot whose site source is due; returns how many were queued. */
export async function queueWeeklyRereads(now: Date): Promise<number> {
    const queued = await core.queueWeeklyRereads(now)
    for (const j of queued) await dispatchJob(j)
    return queued.length
}

/**
 * What a progress poll does to a job. Local: run one slice (it IS the runner). Workflow: read only - but a job whose
 * instance is missing is dispatched again, and one whose instance died is failed with a plain line.
 */
export async function advanceForPoll(job: core.JobRow): Promise<core.JobRow> {
    if (!core.isActive(job.status)) return job
    if (jobs.runner() === "local") return core.runSlice(job.id)
    try {
        const inst = await jobs.instance(job)
        if (inst?.state === "missing") await dispatchJob(job)
        else if (instanceIsDead(inst)) return (await core.failIfActive(job.id, "Something went wrong while reading. Try again.")) ?? job
    } catch (err) {
        console.error("[jawaf] job status check failed", err instanceof Error ? err.message : err)
    }
    const [fresh] = await db.select().from(jawafJob).where(eq(jawafJob.id, job.id)).limit(1)
    return fresh ?? job
}

/**
 * The site map. Local: inline, as before (the setup screen waits a few seconds for the page list). Workflow: a `map`
 * job (Firecrawl retries with backoff in the Workflow), waited for here up to MAP_WAIT_MS, then the same stored pages.
 */
const MAP_WAIT_MS = 50_000

export async function mapSiteJob(bot: BotRow, url: string, userId: string | null): Promise<{ sourceId: string; included: number; dropped: number }> {
    const job = await enqueueJob({ workspaceId: bot.workspaceId, botId: bot.id, kind: "map", createdById: userId, cursor: { url, userId }, label: "Mapping the website" })
    const deadline = Date.now() + MAP_WAIT_MS
    for (;;) {
        const [row] = await db.select().from(jawafJob).where(eq(jawafJob.id, job.id)).limit(1)
        if (!row) throw new AppError("notfound", "The website map could not be found. Try again.")
        if (row.status === "done") {
            const c = core.obj(row.cursor)
            return { sourceId: String(c.sourceId ?? ""), included: Number(c.included ?? 0), dropped: Number(c.dropped ?? 0) }
        }
        if (!core.isActive(row.status)) throw new AppError("unknown", row.error ?? "The website could not be mapped. Try again.")
        if (Date.now() >= deadline) throw new AppError("network", "The website is taking a while to map. Try again in a minute.")
        await new Promise((r) => setTimeout(r, 1000))
    }
}
