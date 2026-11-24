"use server"

/**
 * Jawaf playground: Fix this answer (saves a Q&A with the visitor's wording as a phrasing, indexed at once), the
 * Unanswered list, a playground conversation's messages. Asking itself is the stream route POST /api/jawaf/ask.
 */
import { requireSession } from "@repo/auth/next"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { playgroundMessages, questionFor, unansweredQuestions } from "@/lib/jawaf/ask"
import { loadBot } from "@/lib/jawaf/bots"
import { saveQa } from "@/lib/jawaf/knowledge"
import { complete } from "@/lib/jawaf/llm"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { convertJawafQuestionSchema, fixJawafAnswerSchema, jawafIdSchema, type ConvertJawafQuestionInput, type FixJawafAnswerInput } from "@/schemas/jawaf"
import type { JawafPlaygroundMessage, JawafQa, JawafUnanswered } from "@/types/jawaf"

/**
 * Save the right answer. With `messageId`, the question the visitor actually typed becomes a phrasing (when it differs
 * from `question`), so the same wording matches next time.
 */
export async function fixJawafAnswer(input: FixJawafAnswerInput): Promise<ActionResult<JawafQa>> {
    try {
        const session = await requireSession()
        const parsed = fixJawafAnswerSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Write the right answer.")
        const ws = await requireWorkspaceAccess("jawaf", "answer")
        const bot = await loadBot(ws.id, parsed.data.botId)
        const asked = parsed.data.messageId ? await questionFor(bot.id, parsed.data.messageId) : null
        const phrasings = [...parsed.data.phrasings, ...(asked && asked.trim() !== parsed.data.question.trim() ? [asked.trim()] : [])]
        return ok(await saveQa(bot, {
            question: parsed.data.question,
            phrasings,
            answer: parsed.data.answer,
            approved: true,
            source: "fix",
            sourceMessageId: parsed.data.messageId ?? null,
            userId: session.user.id,
        }))
    } catch (err) {
        return fail(err, "jawaf.playground.fix")
    }
}

/** Not-found replies and thumbs-down answers, newest first (the list beside the playground). */
export async function listJawafUnanswered(botId: string): Promise<ActionResult<JawafUnanswered[]>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, id.data)
        return ok(await unansweredQuestions(bot.id))
    } catch (err) {
        return fail(err, "jawaf.playground.unanswered")
    }
}

/** The signed-in person's playground conversation (for a refresh). */
export async function getJawafPlaygroundMessages(input: { botId: string; conversationId: string }): Promise<ActionResult<JawafPlaygroundMessage[]>> {
    try {
        const session = await requireSession()
        const b = jawafIdSchema.safeParse(input.botId)
        const c = jawafIdSchema.safeParse(input.conversationId)
        if (!b.success || !c.success) return failWith("validation", "That conversation could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, b.data)
        return ok(await playgroundMessages(bot.id, session.user.id, c.data))
    } catch (err) {
        return fail(err, "jawaf.playground.messages")
    }
}

const CONVERT_TO = {
    romanized: "Romanized Nepali (Nepali words written in English letters, the way people type on their phones, e.g. \"fee kati ho?\")",
    devanagari: "Nepali in Devanagari script (e.g. \"शुल्क कति हो?\")",
    english: "plain English",
} as const

/**
 * Try as visitor: the same question rewritten in Romanized Nepali, Devanagari or English by boli-chat (our own model;
 * a short, frozen prompt, thinking off), so the owner can check the bot answers every way people type. The playground
 * then asks the rewritten question through the normal stream. Free, like every playground answer.
 */
export async function convertJawafQuestion(input: ConvertJawafQuestionInput): Promise<ActionResult<{ text: string }>> {
    try {
        await requireSession()
        const parsed = convertJawafQuestionSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That question could not be rewritten.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        await loadBot(ws.id, parsed.data.botId)
        const res = await complete({
            messages: [
                { role: "system", content: "You rewrite a customer's question in another script or language. Keep the meaning exactly; do not answer it. Reply with the rewritten question only, one line, no quotes." },
                { role: "user", content: `Rewrite in ${CONVERT_TO[parsed.data.to]}:\n${parsed.data.text}` },
            ],
            maxTokens: 200,
            temperature: 0,
            timeoutMs: 20_000,
        })
        const text = res.text.trim().replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, "").split("\n")[0]?.trim() ?? ""
        if (!text) return failWith("unknown", "Boli's model did not rewrite that question. Try again.")
        return ok({ text })
    } catch (err) {
        return fail(err, "jawaf.playground.convert")
    }
}
