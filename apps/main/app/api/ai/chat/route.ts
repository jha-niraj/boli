import { z } from 'zod'
import { boliConfigured, boliProviderOptions, getBoliChatModel, streamText } from '@repo/ai'
import { db, and, eq } from '@repo/db'
import { aiConversations, aiMessages } from '@repo/db/schema'
import { BOLI_CHAT, costMicro } from '@/lib/boli'
import { ROUTES } from '@/lib/navigation'
import { getSession } from '@/lib/session'
import { chargeInference, hasBalance } from '@/lib/platform/credits'
import { checkRateLimit } from '@/lib/platform/ratelimit'
import { buildHistory, conversationRows, titleFrom } from '@/lib/ai/conversations'
import { asKuraSettings } from '@/lib/ai/settings'
import { KURA_ERROR_MESSAGES, classifyModelError } from '@/lib/ai/errors'
import { encodeFrame, type KuraErrorCode, type KuraFrame, type KuraPart, type KuraUsage } from '@/lib/ai/protocol'

/**
 * POST /api/ai/chat - one turn of Kura, streamed as NDJSON frames (lib/ai/protocol.ts). Runs ONLY on our own open model
 * (`boli-chat` on llama-server via `getBoliChatModel()`), never a closed model.
 *
 * Inline, the person waits: session -> rate limit -> balance -> the user message is stored -> the model streams text
 * and thinking -> the reply is stored -> the turn is charged (`chargeInference`, source 'kura', idempotent on the
 * assistant message id) -> `usage` -> `done`. Money is never left to `after()`.
 *
 * Status codes the page turns into designed states: 401 signed out, 402 out of credits (`href` + `actionLabel` to
 * Billing), 404 the chat is gone (the page starts fresh and resends once), 429 too many requests, 503 the model is not
 * configured. A model that is down mid-turn sends an `error` frame with code `offline`.
 */

const bodySchema = z.object({
    conversationId: z.string().min(1).max(100).nullish(),
    message: z.string().trim().min(1).max(8000),
    settings: z.unknown().optional(),
})

const json = (status: number, code: KuraErrorCode | 'auth' | 'not_found', message: string, extra?: Record<string, unknown>) =>
    Response.json({ code, message, ...extra }, { status })

const estimateTokens = (text: string) => Math.ceil(text.length / 3)

/** inference_request.error_code uses the API's OpenAI-style codes, so Usage reads one vocabulary. */
const API_ERROR_CODE: Record<KuraErrorCode, string> = {
    offline: 'model_unavailable',
    invalid: 'invalid_request',
    rate: 'rate_limit_exceeded',
    credits: 'insufficient_quota',
    unknown: 'server_error',
}

export async function POST(req: Request): Promise<Response> {
    const s = await getSession()
    if (!s) return json(401, 'auth', 'Your session ended. Sign in again.')
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return json(400, 'invalid', 'That message could not be read.')
    const body = parsed.data
    const me = s.user
    const settings = asKuraSettings(body.settings)

    if (!boliConfigured()) return json(503, 'offline', KURA_ERROR_MESSAGES.offline)
    const rate = await checkRateLimit(me.id)
    if (!rate.ok) {
        return json(429, 'rate', `Too many messages this minute. Try again in ${rate.retryAfterSec}s.`, { retryAfterSec: rate.retryAfterSec })
    }
    if (!(await hasBalance(me.id))) {
        return json(402, 'credits', KURA_ERROR_MESSAGES.credits, { href: `${ROUTES.billing}?tab=plans`, actionLabel: 'Add credits' })
    }

    // The conversation: an id from the client is only used if it is this person's.
    let conversationId = body.conversationId ?? null
    let title = 'New chat'
    let historyRows: Awaited<ReturnType<typeof conversationRows>> = null
    if (conversationId) {
        historyRows = await conversationRows(me.id, conversationId)
        if (!historyRows) return json(404, 'not_found', 'That chat could not be found.')
        title = historyRows.title
    }

    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()
    const userRow = { id: userMessageId, userId: me.id, role: 'user' as const, content: body.message }
    const created = !conversationId
    if (!conversationId) {
        conversationId = crypto.randomUUID()
        title = titleFrom(body.message)
        await db.batch([
            db.insert(aiConversations).values({ id: conversationId, userId: me.id, title, settings }),
            db.insert(aiMessages).values({ ...userRow, conversationId }),
        ])
    } else {
        await db.insert(aiMessages).values({ ...userRow, conversationId })
    }

    const history = buildHistory(historyRows?.rows ?? [], { systemPrompt: settings.systemPrompt, message: body.message, maxTokens: settings.maxTokens })
    const messages = [...history, { role: 'user' as const, content: body.message }]
    const promptChars = settings.systemPrompt.length + messages.reduce((n, m) => n + m.content.length, 0)
    const convId = conversationId
    const convTitle = title

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const enc = new TextEncoder()
            let open = true
            const emit = (frame: KuraFrame) => {
                if (!open) return
                try { controller.enqueue(enc.encode(encodeFrame(frame))) } catch { open = false }
            }
            emit({ t: 'meta', conversationId: convId, userMessageId, assistantMessageId, title: convTitle })

            const started = Date.now()
            let firstTokenAt: number | null = null
            const parts: KuraPart[] = []
            let thinkingSince: number | null = null
            const thought = (): Extract<KuraPart, { type: 'thought' }> => {
                const first = parts[0]
                if (first?.type === 'thought') return first
                const t: Extract<KuraPart, { type: 'thought' }> = { type: 'thought', text: '', ms: 0 }
                parts.unshift(t)
                return t
            }
            const pushText = (d: string) => {
                const last = parts[parts.length - 1]
                if (last?.type === 'text') last.text += d
                else parts.push({ type: 'text', text: d })
            }
            let usage: { input: number; output: number; reasoning: number } | null = null
            let error: { code: KuraErrorCode; message: string } | null = null
            let aborted = false

            try {
                const result = streamText({
                    model: getBoliChatModel(),
                    instructions: settings.systemPrompt,
                    messages,
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxOutputTokens: settings.maxTokens,
                    // top_k and think travel as llama-server options.
                    providerOptions: boliProviderOptions(settings),
                    maxRetries: 1,
                    abortSignal: req.signal,
                })
                for await (const part of result.fullStream) {
                    switch (part.type) {
                        case 'text-delta':
                            if (part.text) {
                                firstTokenAt ??= Date.now()
                                pushText(part.text)
                                emit({ t: 'text', d: part.text })
                            }
                            break
                        case 'reasoning-start':
                            thinkingSince = Date.now()
                            thought()
                            break
                        case 'reasoning-delta':
                            if (part.text) {
                                firstTokenAt ??= Date.now()
                                thought().text += part.text
                                emit({ t: 'reasoning', d: part.text })
                            }
                            break
                        case 'reasoning-end': {
                            const ms = thinkingSince !== null ? Date.now() - thinkingSince : 0
                            thinkingSince = null
                            const t = thought()
                            t.ms = (t.ms ?? 0) + ms
                            emit({ t: 'reasoning-end', ms })
                            break
                        }
                        case 'finish':
                            usage = {
                                input: part.totalUsage.inputTokens ?? 0,
                                output: part.totalUsage.outputTokens ?? 0,
                                reasoning: part.totalUsage.outputTokenDetails.reasoningTokens ?? 0,
                            }
                            break
                        case 'error':
                            error = classifyModelError(part.error)
                            console.error('[kura] stream error', part.error instanceof Error ? part.error.message : part.error)
                            break
                        case 'abort':
                            aborted = true
                            break
                        default:
                            break
                    }
                }
            } catch (err) {
                if (req.signal.aborted) aborted = true
                else {
                    error = classifyModelError(err)
                    console.error('[kura] turn failed', err instanceof Error ? err.message : err)
                }
            }

            if (parts[0]?.type === 'thought') {
                parts[0].text = parts[0].text.trim()
                if (!parts[0].text) parts.shift()
            }
            const text = parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('')
            const answered = !!text || parts.some((p) => p.type === 'thought')
            if (error && !answered) emit({ t: 'error', code: error.code, message: error.message })
            else if (error) {
                const notice = 'The answer was cut off - the model stopped responding.'
                parts.push({ type: 'notice', text: notice })
                emit({ t: 'notice', text: notice })
            }

            // A stopped or broken stream may end without a usage report: count what was sent and streamed instead.
            const thoughtText = parts[0]?.type === 'thought' ? parts[0].text : ''
            const tokens = usage ?? {
                input: answered ? Math.ceil(promptChars / 3) : 0,
                output: estimateTokens(text + thoughtText),
                reasoning: estimateTokens(thoughtText),
            }
            const latencyMs = Date.now() - started
            const turnUsage: KuraUsage = {
                inputTokens: tokens.input,
                outputTokens: tokens.output,
                reasoningTokens: tokens.reasoning,
                costMicro: costMicro(BOLI_CHAT, tokens.input, tokens.output),
                ms: latencyMs,
            }
            if (answered) parts.push({ type: 'usage', usage: turnUsage })
            // The model never answered: the question is taken back (the page puts it back for Try again), and a chat
            // this turn created is removed, so History holds no empty chats.
            const failed = !!error && !answered

            // Store what the person saw (a Stop keeps its partial text). A turn with nothing is not stored, so the
            // next turn does not replay an empty reply. The settings it ran with are kept on the conversation.
            try {
                if (failed && created) {
                    await db.delete(aiConversations).where(and(eq(aiConversations.id, convId), eq(aiConversations.userId, me.id)))
                } else if (failed) {
                    await db.delete(aiMessages).where(and(eq(aiMessages.id, userMessageId), eq(aiMessages.userId, me.id)))
                } else {
                    const touch = db.update(aiConversations).set({ updatedAt: new Date(), settings })
                        .where(and(eq(aiConversations.id, convId), eq(aiConversations.userId, me.id)))
                    if (answered) {
                        await db.batch([
                            db.insert(aiMessages).values({ id: assistantMessageId, conversationId: convId, userId: me.id, role: 'assistant', content: text, parts }),
                            touch,
                        ])
                    } else {
                        await touch
                    }
                }
            } catch (err) {
                console.error('[kura] could not store the reply', err instanceof Error ? err.message : err)
                if (answered) emit({ t: 'notice', text: 'This reply could not be saved - it will not be in the chat after a refresh.' })
            }

            // Charge inline (money is never in after()). Idempotent on the assistant message id. A failed call is
            // logged at zero cost so Usage shows it.
            let balanceMicro: number | null = null
            try {
                const charged = await chargeInference({
                    id: assistantMessageId,
                    userId: me.id,
                    source: 'kura',
                    model: BOLI_CHAT.id,
                    conversationId: failed && created ? undefined : convId,
                    inputTokens: tokens.input,
                    outputTokens: tokens.output,
                    reasoningTokens: tokens.reasoning,
                    latencyMs,
                    firstTokenMs: firstTokenAt !== null ? firstTokenAt - started : undefined,
                    stream: true,
                    status: failed ? 'error' : 'ok',
                    errorCode: error ? API_ERROR_CODE[error.code] : undefined,
                })
                turnUsage.costMicro = charged.costMicro
                balanceMicro = charged.balanceMicro
            } catch (err) {
                console.error('[kura] could not charge the turn', err instanceof Error ? err.message : err)
            }
            if (answered) emit({ t: 'usage', usage: turnUsage, balanceMicro })
            if (aborted) console.info('[kura] turn stopped by the person')

            emit({ t: 'done' })
            if (open) { try { controller.close() } catch { /* the client left */ } }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
        },
    })
}
