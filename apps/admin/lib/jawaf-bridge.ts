import "server-only"

import { appBaseUrl } from "@repo/billing"
import { db, eq } from "@repo/db"
import { jawafJob } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { instanceIsDead } from "@repo/jobs"
import type { EvalQuestion, EvalRowResult } from "@/types/jawaf"
import { jobs } from "./jobs"

/**
 * The admin console -> the app's Jawaf engine (apps/main lib/jawaf/admin-bridge.ts): POST
 * `<MAIN_APP_URL>/api/jawaf/admin/<what>` with `Authorization: Bearer <JAWAF_ADMIN_SECRET>` (the same value in both
 * apps' env files). Used only for what needs the engine: a quality-check batch, the embedding server check, one slice
 * of a reading job. A blank secret = the bridge is off; the callers say so in a sentence.
 *
 * JOBS_RUNNER=workflow: the same three go to the boli-jobs Worker over the JOBS service binding instead (lib/jobs.ts):
 * eval and health as RPC calls into the same engine code (@repo/jawaf), tick as a read of the row (the Workflow
 * advances the job) that re-dispatches a missing instance and fails a dead one. No secret is needed on that path.
 */

export function bridgeConfigured(): boolean {
    return jobs.runner() === "workflow" || Boolean(process.env.JAWAF_ADMIN_SECRET?.trim())
}

async function call<T>(what: "eval" | "health" | "tick", body: object, timeoutMs: number): Promise<T> {
    const secret = process.env.JAWAF_ADMIN_SECRET?.trim()
    if (!secret) throw new AppError("conflict", "JAWAF_ADMIN_SECRET is not set, so the admin cannot reach the Jawaf engine. Set it in both apps' env files.")
    let res: Response
    try {
        res = await fetch(`${appBaseUrl()}/api/jawaf/admin/${what}`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
            cache: "no-store",
        })
    } catch {
        throw new AppError("network", "The app did not answer. Is it running?")
    }
    const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: string } | null
    if (!res.ok || !json?.success) throw new AppError("unknown", json?.error ?? `The app answered ${res.status}.`)
    return json.data as T
}

type TickView = { status: string; progress: { done: number; total: number; label: string }; error: string | null }

const LOST = "Something went wrong while reading. Try again."

async function workflowTick(jobId: string): Promise<TickView> {
    const read = async () => {
        const [j] = await db.select().from(jawafJob).where(eq(jawafJob.id, jobId)).limit(1)
        if (!j) throw new AppError("notfound", "That job could not be found.")
        return j
    }
    const job = await read()
    if (job.status === "queued" || job.status === "running") {
        const inst = await jobs.instance(job).catch(() => null)
        if (inst?.state === "missing") await jobs.dispatch(job).catch((err: unknown) => console.error("[jobs] re-dispatch failed", err))
        else if (instanceIsDead(inst)) {
            await db.update(jawafJob).set({ status: "failed", error: LOST, errorCode: "provider", leaseUntil: null, finishedAt: new Date(), updatedAt: new Date() }).where(eq(jawafJob.id, jobId))
        }
    }
    const j = await read()
    const p = (j.progress ?? {}) as { done?: number; total?: number; label?: string }
    return { status: j.status, progress: { done: p.done ?? 0, total: p.total ?? 0, label: p.label ?? "Waiting to start" }, error: j.error }
}

export const bridgeEval = async (botId: string, questions: EvalQuestion[]): Promise<{ rows: EvalRowResult[] }> =>
    jobs.runner() === "workflow" ? { rows: await (await jobs.rpc()).evalBatch(botId, questions) } : call<{ rows: EvalRowResult[] }>("eval", { botId, questions }, 110_000)
export const bridgeHealth = async (): Promise<{ embed: { configured: boolean; ok: boolean; ms: number | null; error: string | null } }> =>
    jobs.runner() === "workflow" ? (await jobs.rpc()).embedHealth() : call("health", {}, 15_000)
export const bridgeTick = async (jobId: string): Promise<TickView> => (jobs.runner() === "workflow" ? workflowTick(jobId) : call<TickView>("tick", { jobId }, 40_000))
