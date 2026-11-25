import { WorkerEntrypoint } from "cloudflare:workers"
import { isRowJobKind, SCHEDULED_WORKFLOWS, type JobInstanceStatus, type JobStartRequest, type JobStartResult, type JobsRpc, type LimitDecision, type LimitRule, type RowJobKind, type ScheduledJobName } from "@repo/jobs"
import type { EmbedHealth, EvalQuestionInput, EvalRow } from "@repo/jawaf/eval"
import type { Env } from "./env"
import { engine } from "./load"
import { rowWorkflow, startRowJob } from "./workflows"

export { RateLimiter } from "./rate-limiter"
export {
    JawafDigestWorkflow, JawafDraftWorkflow, JawafEvalWorkflow, JawafFileWorkflow, JawafMapWorkflow, JawafReadWorkflow, JawafReindexWorkflow, JawafRereadsWorkflow,
} from "./workflows"

/**
 * boli-jobs. main and admin reach it ONLY through their JOBS service binding (wrangler.jsonc: no routes, workers_dev
 * off), calling these methods as RPC (packages/jobs/src/rpc.ts is the contract). apps/jobs/CLAUDE.md is the guide.
 */

/** Cron expression -> the scheduled Workflow it starts (production only; staging has no crons). Instance ids are per
 * hour / day, so a doubled trigger starts nothing twice. */
const CRONS: Record<string, { name: ScheduledJobName; id: (d: Date) => string }> = {
    "5 * * * *": { name: "rereads", id: (d) => `rereads-${d.toISOString().slice(0, 13)}` },
    "15 2 * * *": { name: "digest", id: (d) => `digest-${d.toISOString().slice(0, 10)}` },
}

const MAX_KEY = 200
const MAX_RULES = 4

export default class JobsService extends WorkerEntrypoint<Env> implements JobsRpc {
    async fetch(request: Request): Promise<Response> {
        if (new URL(request.url).pathname === "/health") return Response.json({ ok: true, worker: "boli-jobs" })
        return new Response("Not found", { status: 404 })
    }

    async scheduled(controller: ScheduledController): Promise<void> {
        const c = CRONS[controller.cron]
        if (!c) {
            console.warn(`[jobs] no scheduled job for "${controller.cron}"`)
            return
        }
        await this.startScheduled(c.name, c.id(new Date(controller.scheduledTime)))
    }

    async startJob(req: JobStartRequest): Promise<JobStartResult> {
        if (!req || !isRowJobKind(req.kind) || typeof req.jobId !== "string" || !req.jobId) throw new Error("startJob needs a known kind and a job id.")
        return { jobId: req.jobId, instance: await startRowJob(this.env, req.kind, req.jobId) }
    }

    async jobStatus(kind: RowJobKind, jobId: string): Promise<JobInstanceStatus> {
        if (!isRowJobKind(kind)) throw new Error(`Unknown job kind ${kind}.`)
        try {
            const s = await (await rowWorkflow(this.env, kind).get(jobId)).status()
            return { jobId, state: s.status as JobInstanceStatus["state"], error: s.error?.message ?? null }
        } catch {
            return { jobId, state: "missing", error: null }
        }
    }

    async runScheduled(name: ScheduledJobName): Promise<{ instanceId: string }> {
        if (!(name in SCHEDULED_WORKFLOWS)) throw new Error(`Unknown scheduled job ${name}.`)
        return this.startScheduled(name, `${name}-manual-${Date.now()}`)
    }

    async hit(key: string, rules: LimitRule[]): Promise<LimitDecision> {
        if (typeof key !== "string" || !key || key.length > MAX_KEY) throw new Error("A limiter key is 1-200 characters.")
        if (!Array.isArray(rules) || !rules.length || rules.length > MAX_RULES) throw new Error("Send 1-4 limit rules.")
        const ns = this.env.RATE_LIMITER
        return ns.get(ns.idFromName(key)).hit(rules)
    }

    async evalBatch(botId: string, questions: EvalQuestionInput[]): Promise<EvalRow[]> {
        if (!Array.isArray(questions) || questions.length < 1 || questions.length > 5) throw new Error("Send 1-5 questions.")
        const e = await engine(this.env)
        const bot = await e.loadBotById(botId)
        if (!bot) throw new Error("That bot could not be found.")
        return e.evalQuestions(bot, questions)
    }

    async embedHealth(): Promise<EmbedHealth> {
        return (await engine(this.env)).embedHealth()
    }

    private async startScheduled(name: ScheduledJobName, id: string): Promise<{ instanceId: string }> {
        const wf = this.env[SCHEDULED_WORKFLOWS[name]]
        try {
            await wf.create({ id, params: {} })
        } catch (err) {
            // Already started for this hour / day: fine. Anything else is logged (observability is on).
            console.warn(`[jobs] ${name} ${id} not started:`, err instanceof Error ? err.message : err)
        }
        return { instanceId: id }
    }
}
