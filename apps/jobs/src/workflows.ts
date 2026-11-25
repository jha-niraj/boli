import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowSleepDuration, type WorkflowStep, type WorkflowStepConfig } from "cloudflare:workers"
import { ROW_JOB_WORKFLOWS, type RowJobKind } from "@repo/jobs"
import type { Env, RowJobParams } from "./env"
import { engine } from "./load"

/**
 * The Workflows. The job logic is NOT here: it is the step functions in packages/jawaf/src/jobs/steps.ts, the same ones
 * the local runner calls. A row-job Workflow is a loop of `step.do(advanceJob)` - one job step per Workflow step, state
 * on the jawaf_job row - with a per-kind retry / timeout policy, `step.sleep` when a step says "wait", and the row
 * failed with a plain line if the steps give up.
 */

/** Each loop is at most 2 Workflow steps (do + sleep); Workflows cap steps per instance, so stay well under. */
const MAX_JOB_STEPS = 400

const LOST = "Something went wrong while reading. Try again."

abstract class RowJobWorkflow extends WorkflowEntrypoint<Env, RowJobParams> {
    /** Retries for one job step. Retryable errors (rate limits, outages) are thrown by advanceJob; others fail the job. */
    protected abstract readonly config: WorkflowStepConfig

    async run(event: WorkflowEvent<RowJobParams>, step: WorkflowStep) {
        const { jobId } = event.payload
        let next = "start"
        try {
            for (let n = 1; n <= MAX_JOB_STEPS; n++) {
                const r = await step.do(`${n}. ${next}`, this.config, async () => (await engine(this.env)).advanceJob(jobId))
                if (r.finished) return { jobId, status: r.status, label: r.progress.label }
                next = r.next
                if (r.waitMs) await step.sleep(`${n}. wait`, r.waitMs)
            }
            await step.do("too many steps", async () => {
                await (await engine(this.env)).failIfActive(jobId, "This job took too many steps. Try again.")
            })
            return { jobId, status: "failed", label: "Too many steps" }
        } catch (err) {
            // Retries used up (or something outside a step threw): the row must not stay "running" forever.
            await step.do("mark failed", async () => {
                await (await engine(this.env)).failIfActive(jobId, LOST)
            })
            return { jobId, status: "failed", label: err instanceof Error ? err.message.slice(0, 200) : "failed" }
        }
    }
}

const retries = (limit: number, delay: WorkflowSleepDuration) => ({ limit, delay, backoff: "exponential" as const })

/** read: 3 scrapes + embeds per step; Firecrawl 429s back off. */
export class JawafReadWorkflow extends RowJobWorkflow {
    protected readonly config: WorkflowStepConfig = { retries: retries(6, "15 seconds"), timeout: "3 minutes" }
}
/** file: R2 + text extraction, or Sarvam submit / poll / fetch, then chunk + embed. */
export class JawafFileWorkflow extends RowJobWorkflow {
    protected readonly config: WorkflowStepConfig = { retries: retries(5, "10 seconds"), timeout: "5 minutes" }
}
/** draft: one fact section (one boli-chat call) per step. */
export class JawafDraftWorkflow extends RowJobWorkflow {
    protected readonly config: WorkflowStepConfig = { retries: retries(3, "20 seconds"), timeout: "3 minutes" }
}
/** reindex: 5 pages re-chunked and re-embedded per step. */
export class JawafReindexWorkflow extends RowJobWorkflow {
    protected readonly config: WorkflowStepConfig = { retries: retries(5, "10 seconds"), timeout: "5 minutes" }
}
/** map: Firecrawl map + robots.txt, stored as pages (main waits for it). */
export class JawafMapWorkflow extends RowJobWorkflow {
    protected readonly config: WorkflowStepConfig = { retries: retries(3, "5 seconds"), timeout: "2 minutes" }
}
/** eval: 3 quality-check questions per step (rows kept in the job cursor). */
export class JawafEvalWorkflow extends RowJobWorkflow {
    protected readonly config: WorkflowStepConfig = { retries: retries(2, "10 seconds"), timeout: "5 minutes" }
}

/** Which binding runs a row job. */
export function rowWorkflow(env: Env, kind: RowJobKind): Workflow<RowJobParams> {
    return env[ROW_JOB_WORKFLOWS[kind]]
}

/** Start a row job's instance (id = job id). `exists` when it was already started. */
export async function startRowJob(env: Env, kind: RowJobKind, jobId: string): Promise<"created" | "exists"> {
    try {
        await rowWorkflow(env, kind).create({ id: jobId, params: { jobId } })
        return "created"
    } catch (err) {
        // create throws when the id is taken; a get that succeeds means "already started".
        try {
            await rowWorkflow(env, kind).get(jobId)
            return "exists"
        } catch {
            throw err
        }
    }
}

const SHORT: WorkflowStepConfig = { retries: retries(3, "10 seconds"), timeout: "2 minutes" }

/**
 * Hourly (production cron): queue the weekly re-reads that are due (each its own step: moving next_read_at first makes
 * a retried step queue nothing twice), start their read Workflows, then resume orphaned row jobs - active rows no
 * Workflow is moving (dispatch failed, or the instance died).
 */
export class JawafRereadsWorkflow extends WorkflowEntrypoint<Env, Record<string, never>> {
    async run(event: WorkflowEvent<Record<string, never>>, step: WorkflowStep) {
        const now = new Date(event.timestamp)
        const due = await step.do("find due re-reads", SHORT, async () => (await engine(this.env)).dueRereads(now))
        let queued = 0
        for (const d of due) {
            const id = await step.do(`queue re-read ${d.botId}`, SHORT, async () => {
                const job = await (await engine(this.env)).queueReread(d, now)
                if (job) await startRowJob(this.env, "read", job.id)
                return job?.id ?? null
            })
            if (id) queued++
        }
        const resumed = await step.do("resume orphaned jobs", SHORT, async () => {
            const e = await engine(this.env)
            let started = 0
            let failed = 0
            for (const j of await e.dueJobIds(20, 10 * 60_000)) {
                if (!(j.kind in ROW_JOB_WORKFLOWS)) continue
                const kind = j.kind as RowJobKind
                let state: string
                try {
                    state = (await (await rowWorkflow(this.env, kind).get(j.id)).status()).status
                } catch {
                    state = "missing"
                }
                if (state === "missing") {
                    await startRowJob(this.env, kind, j.id)
                    started++
                } else if (state === "errored" || state === "terminated" || state === "complete") {
                    if (await e.failIfActive(j.id, LOST)) failed++
                }
            }
            return { started, failed }
        })
        return { rereadsQueued: queued, ...resumed }
    }
}

/**
 * Daily (production cron, 08:00 Nepal): the owner digest + follow-up reminders. SKELETON (Wave 4): the steps collect
 * what each workspace's email would say; `sendDigest` sends nothing yet (packages/jawaf/src/jobs/digest.ts says what is
 * left). One step per workspace, so a retry never repeats another workspace's email once sending exists.
 */
export class JawafDigestWorkflow extends WorkflowEntrypoint<Env, Record<string, never>> {
    async run(event: WorkflowEvent<Record<string, never>>, step: WorkflowStep) {
        const now = new Date(event.timestamp)
        const since = new Date(now.getTime() - 86_400_000)
        const day = now.toISOString().slice(0, 10)
        const lines = await step.do("collect the day", SHORT, async () => (await engine(this.env)).collectDigest(since, now))
        const e = await engine(this.env)
        let sent = 0
        const byWorkspace = e.digestByWorkspace(lines)
        for (const [workspaceId, wsLines] of byWorkspace) {
            const ok = await step.do(`digest ${workspaceId}`, SHORT, async () => (await engine(this.env)).sendDigest(workspaceId, wsLines, day))
            if (ok) sent++
        }
        return { day, workspaces: byWorkspace.size, sent, followUpsDue: lines.reduce((n, l) => n + l.followUpsDue, 0) }
    }
}
