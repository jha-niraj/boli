import "server-only"
import { and, asc, db, desc, eq, sql } from "@repo/db"
import { jawafConversation, jawafMessage } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { JAWAF_NOT_FOUND, type JawafChannel } from "@repo/boli/jawaf"
import type { JawafAnswer, JawafAnswerSource, JawafPlaygroundMessage, JawafUnanswered } from "@/types/jawaf"
import { answerQuestion, type EngineHistoryTurn } from "./answer"
import type { BotRow } from "./bots"
import { canAnswer, chargeAnswer } from "./meter"
import { detectScript } from "./script"

/**
 * One visitor (or playground) question end to end: the conversation row, the stored messages, the answer engine and
 * the meter. Used by the playground stream route now and by the public page / widget / API in Wave 3.
 *
 * Inline order (money never in after()): may-answer check (free answers left or credits; playground skips) -> user
 * message stored -> engine -> assistant message stored -> charge (`spend:jawaf-answer:<assistantMessageId>`).
 */

export interface AskInput {
    bot: BotRow
    question: string
    channel: JawafChannel
    conversationId?: string | null
    /** Public channels: the visitor cookie id. */
    visitorId?: string | null
    /** Playground: the signed-in person. */
    userId?: string | null
    pageUrl?: string | null
    /** Called once the ids exist (before the model runs). */
    onMeta?: (meta: { conversationId: string; messageId: string; script: JawafAnswer["script"] }) => void
    onDelta?: (d: string) => void
    signal?: AbortSignal
}

async function conversationFor(input: AskInput): Promise<{ id: string; created: boolean; history: EngineHistoryTurn[] }> {
    if (input.conversationId) {
        const [c] = await db.select().from(jawafConversation).where(and(eq(jawafConversation.id, input.conversationId), eq(jawafConversation.botId, input.bot.id))).limit(1)
        const mine = c && (input.channel === "playground" ? c.userId === (input.userId ?? null) : c.visitorId === (input.visitorId ?? null))
        if (c && mine) {
            const rows = await db.select({ role: jawafMessage.role, text: jawafMessage.text, answered: jawafMessage.answered }).from(jawafMessage)
                .where(eq(jawafMessage.conversationId, c.id)).orderBy(desc(jawafMessage.createdAt)).limit(4)
            // Not-found replies are left out of the history: they teach the model nothing.
            const history = rows.reverse().filter((r) => r.role === "user" || r.answered).map((r) => ({ role: r.role, text: r.text }))
            return { id: c.id, created: false, history }
        }
    }
    return { id: crypto.randomUUID(), created: true, history: [] }
}

export async function askBot(input: AskInput): Promise<JawafAnswer> {
    const { bot } = input
    const question = input.question.trim()
    if (!question) throw new AppError("validation", "Ask something.")
    const script = detectScript(question).script
    const metered = input.channel !== "playground"

    const conv = await conversationFor(input)
    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()
    const base = { workspaceId: bot.workspaceId, botId: bot.id, conversationId: conv.id }
    const userRow = { id: userMessageId, ...base, role: "user" as const, text: question, script }
    if (conv.created) {
        await db.batch([
            db.insert(jawafConversation).values({
                id: conv.id, workspaceId: bot.workspaceId, botId: bot.id, channel: input.channel, visitorId: input.visitorId ?? null,
                userId: input.userId ?? null, pageUrl: input.pageUrl ?? null, script,
            }),
            db.insert(jawafMessage).values(userRow),
        ])
    } else {
        await db.insert(jawafMessage).values(userRow)
    }
    input.onMeta?.({ conversationId: conv.id, messageId: assistantMessageId, script })

    // Out of free answers and credits: the visitor gets the polite contact card; nothing is charged.
    if (metered && !(await canAnswer(bot.workspaceId))) {
        const answer: JawafAnswer = {
            status: "credits", text: JAWAF_NOT_FOUND[script], sources: [], answered: false, script, latencyMs: 0,
            tokens: { input: 0, output: 0 }, costMicro: 0, conversationId: conv.id, messageId: assistantMessageId,
        }
        await storeAssistant(answer, base, null)
        return answer
    }

    const r = await answerQuestion({ bot, question, history: conv.history, onDelta: input.onDelta, signal: input.signal })
    const answer: JawafAnswer = {
        status: r.status, text: r.text, sources: r.sources, answered: r.answered, script: r.script, latencyMs: r.latencyMs,
        tokens: r.tokens, costMicro: 0, conversationId: conv.id, messageId: assistantMessageId,
    }
    await storeAssistant(answer, base, r.retrieval)
    if (metered && (r.status === "answered" || r.status === "not_found")) {
        try {
            answer.costMicro = await chargeAnswer(bot.workspaceId, assistantMessageId)
            if (answer.costMicro) await db.update(jawafMessage).set({ costMicro: answer.costMicro }).where(eq(jawafMessage.id, assistantMessageId))
        } catch (err) {
            console.error("[jawaf] could not charge the answer", err instanceof Error ? err.message : err)
        }
    }
    return answer
}

async function storeAssistant(a: JawafAnswer, base: { workspaceId: string; botId: string; conversationId: string }, retrieval: unknown): Promise<void> {
    await db.batch([
        db.insert(jawafMessage).values({
            id: a.messageId!, ...base, role: "assistant", text: a.text, sources: a.sources, answered: a.answered, status: a.status, script: a.script,
            latencyMs: a.latencyMs, inputTokens: a.tokens.input, outputTokens: a.tokens.output, retrieval,
        }),
        db.update(jawafConversation).set({ lastAt: new Date(), messageCount: sql`${jawafConversation.messageCount} + 2` }).where(eq(jawafConversation.id, base.conversationId)),
    ])
}

function asSources(v: unknown): JawafAnswerSource[] {
    return Array.isArray(v) ? (v.filter((s) => s && typeof s === "object" && typeof (s as { n?: unknown }).n === "number") as JawafAnswerSource[]) : []
}

/** A playground conversation's messages (the signed-in person's own). */
export async function playgroundMessages(botId: string, userId: string, conversationId: string): Promise<JawafPlaygroundMessage[]> {
    const [c] = await db.select({ id: jawafConversation.id }).from(jawafConversation)
        .where(and(eq(jawafConversation.id, conversationId), eq(jawafConversation.botId, botId), eq(jawafConversation.userId, userId))).limit(1)
    if (!c) throw new AppError("notfound", "That conversation could not be found.")
    const rows = await db.select().from(jawafMessage).where(eq(jawafMessage.conversationId, c.id)).orderBy(asc(jawafMessage.createdAt)).limit(200)
    return rows.map((m) => ({ id: m.id, role: m.role, text: m.text, sources: asSources(m.sources), answered: m.answered, createdAt: m.createdAt.toISOString() }))
}

/**
 * Questions the bot could not answer (not found) or visitors disliked, newest first, with the question that was asked
 * (the user message right before each reply).
 */
export async function unansweredQuestions(botId: string, limit = 50): Promise<JawafUnanswered[]> {
    const res = await db.execute(sql`
        SELECT a.id AS message_id, a.conversation_id, a.created_at, a.rating, c.channel,
               (SELECT u.text FROM jawaf_message u
                 WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND u.created_at <= a.created_at
                 ORDER BY u.created_at DESC LIMIT 1) AS question
          FROM jawaf_message a
          JOIN jawaf_conversation c ON c.id = a.conversation_id
         WHERE a.bot_id = ${botId} AND a.role = 'assistant' AND (a.answered = false AND a.status = 'not_found' OR a.rating = -1)
         ORDER BY a.created_at DESC
         LIMIT ${limit}
    `)
    type Row = { message_id: string; conversation_id: string; created_at: string | Date; rating: number | null; channel: JawafChannel; question: string | null }
    return (res.rows as Row[]).filter((r) => r.question).map((r) => ({
        messageId: r.message_id,
        conversationId: r.conversation_id,
        question: r.question!,
        channel: r.channel,
        askedAt: new Date(r.created_at).toISOString(),
        disliked: r.rating === -1,
    }))
}

/** The visitor question an assistant message answered (for Fix this answer). */
export async function questionFor(botId: string, assistantMessageId: string): Promise<string | null> {
    const res = await db.execute(sql`
        SELECT (SELECT u.text FROM jawaf_message u
                 WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND u.created_at <= a.created_at
                 ORDER BY u.created_at DESC LIMIT 1) AS question
          FROM jawaf_message a WHERE a.id = ${assistantMessageId} AND a.bot_id = ${botId} AND a.role = 'assistant'
    `)
    return ((res.rows[0] as { question?: string | null } | undefined)?.question) ?? null
}
