import { db, eq } from "@repo/db"
import { jawafChunk, jawafFactSection } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import type { JawafScript } from "@repo/boli/jawaf"
import { answerQuestion } from "./answer"
import { embedConfigured, embedOne } from "./embed"
import { scriptMatches } from "./script"
import { asciiDigits, extractNumbers } from "./text"
import type { BotRow } from "./bots"

/**
 * The quality check (admin "Run quality check", ml/jawaf-eval/run.mts): questions through THE answer engine with no
 * conversation rows and no charges, scored exactly as the eval script scores them. Read only, so a retried batch is
 * just asked again. Used by main's admin bridge (local) and by the jobs Worker (RPC + the `eval` Workflow).
 */

export interface EvalQuestionInput {
    id: string
    q: string
    script: JawafScript
    expect?: string[]
    mustRefuse?: boolean
}

export interface EvalRow {
    id: string
    question: string
    status: string
    mustRefuse: boolean
    ok: boolean
    scriptOk: boolean
    invented: string[]
    inventedMoney: string[]
    latencyMs: number
    reply: string
}

const MONEY = /(?:rs\.?|npr|रु\.?|रू\.?)\s*\d[\d,]*(?:\.\d+)?/gi

function norm(s: string): string {
    return ` ${asciiDigits(s).toLowerCase().replace(/(\d),(?=\d)/g, "$1").replace(/[^\p{L}\p{N}\p{M}@.]+/gu, " ").replace(/\.(\s|$)/g, " ")} `
}
function matches(text: string, expect: string[]): boolean {
    const t = norm(text)
    return expect.every((group) => group.split("|").some((alt) => t.includes(` ${norm(alt).trim()}`)))
}

/** Run up to a few questions (callers send 3 at a time) and score them. */
export async function evalQuestions(bot: BotRow, questions: EvalQuestionInput[]): Promise<EvalRow[]> {
    // Everything the bot knows, for the invented-number check (independent of the engine's own guard).
    const [chunks, facts] = await Promise.all([
        db.select({ text: jawafChunk.text }).from(jawafChunk).where(eq(jawafChunk.botId, bot.id)),
        db.select({ text: jawafFactSection.text, table: jawafFactSection.table }).from(jawafFactSection).where(eq(jawafFactSection.botId, bot.id)),
    ])
    const factText = facts.map((f) => `${f.text} ${JSON.stringify(f.table ?? "")}`)
    const known = new Set(extractNumbers([...chunks.map((c) => c.text), ...factText].join("\n")))
    const factNums = new Set(extractNumbers(factText.join("\n")))
    const rows: EvalRow[] = []
    for (const q of questions) {
        const r = await answerQuestion({ bot, question: q.q })
        const answered = r.status === "answered"
        const ok = q.mustRefuse ? r.status === "not_found" : answered && matches(r.text, q.expect ?? [])
        const qNums = new Set(extractNumbers(q.q))
        const invented = answered ? extractNumbers(r.text).filter((n) => n.replace(".", "").length >= 2 && !known.has(n) && !qNums.has(n)) : []
        const inventedMoney = answered ? [...asciiDigits(r.text).matchAll(MONEY)].map((m) => extractNumbers(m[0])[0] ?? "").filter((n) => n && !factNums.has(n)) : []
        rows.push({
            id: q.id, question: q.q, status: r.status, mustRefuse: q.mustRefuse === true, ok,
            scriptOk: scriptMatches(q.script, r.text.replace(/\[\d+\]/g, "")), invented, inventedMoney, latencyMs: r.latencyMs, reply: r.text.slice(0, 600),
        })
    }
    return rows
}

export interface EmbedHealth {
    embed: { configured: boolean; ok: boolean; ms: number | null; error: string | null }
}

/** Is the embedding server reachable (one tiny embed, timed)? */
export async function embedHealth(): Promise<EmbedHealth> {
    if (!embedConfigured()) return { embed: { configured: false, ok: false, ms: null, error: "The embedding server is not configured on the app." } }
    const t = Date.now()
    try {
        const v = await embedOne("namaste")
        return { embed: { configured: true, ok: v.length > 0, ms: Date.now() - t, error: null } }
    } catch (err) {
        return { embed: { configured: true, ok: false, ms: Date.now() - t, error: err instanceof AppError ? err.userMessage : "The embedding server did not answer." } }
    }
}
