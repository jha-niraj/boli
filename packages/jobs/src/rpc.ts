import type { EmbedHealth, EvalQuestionInput, EvalRow } from "@repo/jawaf/eval"
import type { RowJobKind, ScheduledJobName } from "./kinds"
import type { LimitDecision, LimitRule } from "./limiter"

/**
 * What the boli-jobs Worker answers over the JOBS service binding (apps/jobs/src/index.ts `JobsService`, a
 * WorkerEntrypoint). Service bindings are private: the Worker has no route and workers_dev is off, so no shared secret.
 * Every argument and result is plain JSON.
 */

export interface JobStartRequest {
    kind: RowJobKind
    jobId: string
}

export interface JobStartResult {
    jobId: string
    /** `exists`: an instance with this id was already there (a second dispatch of the same job is a no-op). */
    instance: "created" | "exists"
}

/** A Workflow instance's status (Cloudflare's names), or `missing` when no instance has this id. */
export type JobInstanceState = "queued" | "running" | "paused" | "errored" | "terminated" | "complete" | "waiting" | "waitingForPause" | "rollingBack" | "unknown" | "missing"

export interface JobInstanceStatus {
    jobId: string
    state: JobInstanceState
    error: string | null
}

export interface JobsRpc {
    /** Create the Workflow instance for a row job (id = the jawaf_job id). Idempotent. */
    startJob(req: JobStartRequest): Promise<JobStartResult>
    /** The Workflow instance behind a row job. Progress is on the row; this only says whether the instance is alive. */
    jobStatus(kind: RowJobKind, jobId: string): Promise<JobInstanceStatus>
    /** Start a scheduled job now (the cron does this in production; handy from `wrangler dev`). */
    runScheduled(name: ScheduledJobName): Promise<{ instanceId: string }>
    /** One rate-limit hit, EXACT (the RateLimiter Durable Object for `key`). */
    hit(key: string, rules: LimitRule[]): Promise<LimitDecision>
    /** The admin quality check: a few questions through the answer engine (no rows, no charges). */
    evalBatch(botId: string, questions: EvalQuestionInput[]): Promise<EvalRow[]>
    /** Is the embedding server reachable from the jobs Worker? */
    embedHealth(): Promise<EmbedHealth>
}
