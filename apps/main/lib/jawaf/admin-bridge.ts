import "server-only"
import { db, eq } from "@repo/db"
import { jawafBot, jawafJob } from "@repo/db/schema"
import { safeEqual } from "@repo/crypto/password"
import { AppError } from "@repo/errors"
import { z } from "zod"
import { embedHealth, evalQuestions, type EmbedHealth, type EvalRow } from "@repo/jawaf/eval"
import { advanceForPoll, toJobView } from "./jobs"

/**
 * The admin console's bridge into THE Jawaf engine (plan/admin/jawaf/admin-v1.md task 2). apps/admin cannot import
 * this app's engine (embeddings, retrieval, the model), so the few things only the engine can do are three POSTs on the
 * existing dispatcher (`/api/jawaf/admin/<what>`, no new route entry), server to server, with
 * `Authorization: Bearer <JAWAF_ADMIN_SECRET>` (constant-time compare; blank secret = the bridge is off):
 *
 *   eval    { botId, questions[] }  run a few eval questions through answerQuestion (no conversation rows, no charges)
 *           and score them exactly as ml/jawaf-eval/run.mts does; the admin sends 3 at a time and shows progress.
 *   health  {}                      is the embedding server reachable (one tiny embed, timed)?
 *   tick    { jobId }               run ONE slice of a reading job the admin queued (Re-read now / Retry failed).
 *
 * The scoring lives in @repo/jawaf/eval (the boli-jobs Worker runs the same code). Under JOBS_RUNNER=workflow the
 * admin talks to boli-jobs over its own JOBS binding instead (apps/admin/lib/jawaf-bridge.ts); this bridge stays for
 * local mode, and `tick` then only reads the row.
 */

function secret(): string | null {
    const v = process.env.JAWAF_ADMIN_SECRET?.trim()
    return v ? v : null
}

export function checkBridgeAuth(req: Request): void {
    const want = secret()
    if (!want) throw new AppError("forbidden", "JAWAF_ADMIN_SECRET is not set, so the admin bridge is off.")
    const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
    if (!got || !safeEqual(got, want)) throw new AppError("auth", "That request is not from the admin console.")
}

const id = z.string().trim().min(1).max(64)
const questionSchema = z.object({
    id: z.string().max(40),
    q: z.string().trim().min(1).max(1000),
    script: z.enum(["english", "romanized", "devanagari", "mixed"]),
    expect: z.array(z.string().max(200)).max(10).optional(),
    mustRefuse: z.boolean().optional(),
})
const evalSchema = z.object({ botId: id, questions: z.array(questionSchema).min(1).max(5) })
const tickSchema = z.object({ jobId: id })

export type BridgeEvalRow = EvalRow

export async function bridgeEval(body: unknown): Promise<{ rows: BridgeEvalRow[] }> {
    const parsed = evalSchema.safeParse(body)
    if (!parsed.success) throw new AppError("validation", parsed.error.issues[0]?.message ?? "Send a bot and up to 5 questions.")
    const [bot] = await db.select().from(jawafBot).where(eq(jawafBot.id, parsed.data.botId)).limit(1)
    if (!bot) throw new AppError("notfound", "That bot could not be found.")
    return { rows: await evalQuestions(bot, parsed.data.questions) }
}

export async function bridgeHealth(): Promise<EmbedHealth> {
    return embedHealth()
}

export async function bridgeTick(body: unknown) {
    const parsed = tickSchema.safeParse(body)
    if (!parsed.success) throw new AppError("validation", "Send a job id.")
    const [job] = await db.select().from(jawafJob).where(eq(jawafJob.id, parsed.data.jobId)).limit(1)
    if (!job) throw new AppError("notfound", "That job could not be found.")
    return toJobView(await advanceForPoll(job))
}
