import { AppError } from "@repo/errors"
import { isRowJobKind, type RowJobKind } from "./kinds"
import { memoryLimiter, type LimitDecision, type LimitRule, type Limiter } from "./limiter"
import type { JobInstanceStatus, JobStartResult, JobsRpc } from "./rpc"
import { jobsRunner, type JobsRunner } from "./runner"

/**
 * The apps' one door to long jobs and exact limits. Each app builds it once with a way to reach the JOBS service
 * binding (apps/main/lib/jobs.ts, apps/admin/lib/jobs.ts: OpenNext's getCloudflareContext); this package never imports
 * Next or OpenNext.
 *
 *   const jobs = createJobsClient({ binding: async () => (await getCloudflareContext({ async: true })).env.JOBS })
 *   await jobs.dispatch(job)          // after the row exists: local = nothing more, workflow = a Workflow instance
 *   await jobs.instance(job)          // workflow: is the instance alive? (progress is always on the row)
 *   await jobs.limiter.hit(key, rules) // DO when JOBS_RUNNER=workflow and the binding answers, else memory
 */

export interface JobsClientOptions {
    /** The JOBS service binding, or null/undefined when this runtime has none (next dev). Only called in workflow mode. */
    binding: () => Promise<JobsRpc | null | undefined>
}

export interface JobsClient {
    runner: () => JobsRunner
    /** The binding (workflow mode only); throws a sentence when it is missing. */
    rpc: () => Promise<JobsRpc>
    dispatch: (job: { id: string; kind: string }) => Promise<JobStartResult | { jobId: string; instance: "local" }>
    instance: (job: { id: string; kind: string }) => Promise<JobInstanceStatus | null>
    limiter: Limiter
    /** True when limits are exact (the Durable Object is in use). */
    exactLimits: () => boolean
}

export function createJobsClient(opts: JobsClientOptions): JobsClient {
    const rpc = async (): Promise<JobsRpc> => {
        let b: JobsRpc | null | undefined
        try {
            b = await opts.binding()
        } catch (err) {
            throw new AppError("unknown", "JOBS_RUNNER is workflow, but this app cannot reach its Cloudflare bindings (is it running under wrangler / on Workers?).", { cause: err })
        }
        if (!b) throw new AppError("unknown", "JOBS_RUNNER is workflow, but the JOBS service binding is missing from this app's wrangler.jsonc.")
        return b
    }

    const limiter: Limiter = {
        async hit(key: string, rules: LimitRule[]): Promise<LimitDecision> {
            if (jobsRunner() !== "workflow") return memoryLimiter.hit(key, rules)
            try {
                return await (await rpc()).hit(key, rules)
            } catch (err) {
                // Never block a visitor because the limiter is down: fall back to the per-isolate window.
                console.error("[jobs] rate limiter unavailable, using memory", err instanceof Error ? err.message : err)
                return memoryLimiter.hit(key, rules)
            }
        },
    }

    return {
        runner: jobsRunner,
        rpc,
        async dispatch(job) {
            if (jobsRunner() !== "workflow") return { jobId: job.id, instance: "local" }
            if (!isRowJobKind(job.kind)) throw new AppError("unknown", `No Workflow runs jobs of kind "${job.kind}".`)
            return (await rpc()).startJob({ kind: job.kind as RowJobKind, jobId: job.id })
        },
        async instance(job) {
            if (jobsRunner() !== "workflow" || !isRowJobKind(job.kind)) return null
            return (await rpc()).jobStatus(job.kind, job.id)
        },
        limiter,
        exactLimits: () => jobsRunner() === "workflow",
    }
}

/** A Workflow instance that can no longer move the job (the row should be failed if it is still active). */
export function instanceIsDead(s: JobInstanceStatus | null): boolean {
    return !!s && (s.state === "errored" || s.state === "terminated" || s.state === "missing")
}
