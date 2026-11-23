import 'server-only'
import { hasToolCall, isStepCount, streamText, type LanguageModelUsage, type ModelMessage, type ToolSet, type AssistantModelMessage, type ToolModelMessage } from 'ai'
import { BOLI_CHAT_MODEL_ID, boliProviderOptions, getBoliChatModel, type BoliSamplingSettings } from './boli'
import { classifyAiError, type ClassifiedAiError } from './errors'
import type { ChatCard, ChatFrame, ChatLink, MessagePart } from './protocol'
import { recordAiUsage, type AiRequestUsage } from './usage'
import { taskConfig, type AiTaskName } from './config'

/**
 * One chat turn on `boli-chat` (llama-server): the tool loop, streamed as protocol frames.
 *
 * - The system prompt is frozen text so llama-server can reuse its prompt cache; sampling and thinking come from
 *   `settings` (`boliProviderOptions`), thinking off unless `settings.think`;
 * - a tool that reports an outage is removed for the rest of the turn (`activeTools`), steps are capped (`stopWhen`);
 * - every request's usage goes to the usage sink - also on failure (the caller charges credits with its own meter);
 * - dev only: one `[ai] step` line per request with input / output tokens.
 *
 * Tool output conventions (read here, all optional, the model sees them too):
 *   `_card`   a question / confirm / form card (its id is replaced by the tool call id);
 *   `_links`  structured links (`/peek/<kind>/<id>` opens a quick look);
 *   `_outage` the service behind the tool is down: a one-line notice, and the tool is dropped for this turn.
 */

export interface ChatTurnOptions<TOOLS extends ToolSet> {
    task: AiTaskName
    /** Sampling + thinking (Kura's settings). Omitted = server defaults, thinking off. */
    settings?: BoliSamplingSettings
    /** Frozen text. Nothing per request in it. */
    instructions: string
    tools: TOOLS
    /** The tools sent, in this order - fixed, so the tools prefix never changes. Tools not listed are not sent. */
    toolOrder: ReadonlyArray<keyof TOOLS & string>
    /** History, then this turn's user message, then its context block. */
    messages: ModelMessage[]
    /** Tools whose call ends the turn (a card is waiting on the person). */
    stopOnTools?: ReadonlyArray<keyof TOOLS & string>
    /** Activity line per tool ("Looked up app numbers"). Tools without one show no line. */
    toolLabels?: Partial<Record<keyof TOOLS & string, string>>
    maxSteps?: number
    abortSignal?: AbortSignal
    usage: { userId: string | null; feature: string; conversationId?: string | null }
}

export interface ChatTurnResult {
    parts: MessagePart[]
    text: string
    /** The provider-shaped assistant + tool messages, stored so the next turn replays them byte for byte. */
    responseMessages: Array<AssistantModelMessage | ToolModelMessage>
    requests: AiRequestUsage[]
    error: ClassifiedAiError | null
    aborted: boolean
}

const isDev = process.env.NODE_ENV !== 'production'
type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const n = (v: number | undefined | null) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

function toRequest(usage: LanguageModelUsage): AiRequestUsage {
    return {
        inputTokens: n(usage.inputTokens),
        cacheReadTokens: n(usage.inputTokenDetails.cacheReadTokens),
        cacheWriteTokens: 0,
        cacheWrite1hTokens: 0,
        outputTokens: n(usage.outputTokens),
    }
}

function asStringList(v: unknown, max: number): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, max) : []
}

/** Narrow a tool's `_card` to a valid card, or null. */
export function asCard(v: unknown, id: string): ChatCard | null {
    if (!isObj(v) || typeof v.title !== 'string') return null
    if (v.kind === 'question' && Array.isArray(v.questions)) {
        const questions = v.questions.flatMap((q, i) => {
            if (!isObj(q) || typeof q.prompt !== 'string') return []
            const options = asStringList(q.options, 8)
            const kind = q.kind === 'choice' && options.length ? 'choice' as const : 'text' as const
            return [{ id: typeof q.id === 'string' ? q.id : `q${i + 1}`, prompt: q.prompt, kind, options: kind === 'choice' ? options : undefined, multi: q.multi === true }]
        }).slice(0, 5)
        return questions.length ? { kind: 'question', id, title: v.title, questions } : null
    }
    if (v.kind === 'confirm') {
        return {
            kind: 'confirm', id, title: v.title,
            summary: typeof v.summary === 'string' ? v.summary : undefined,
            items: asStringList(v.items, 5),
            confirmLabel: typeof v.confirmLabel === 'string' ? v.confirmLabel : 'Confirm',
        }
    }
    if (v.kind === 'form' && Array.isArray(v.fields)) {
        const fields = v.fields.flatMap((f) => {
            if (!isObj(f) || typeof f.name !== 'string' || typeof f.label !== 'string') return []
            return [{
                name: f.name, label: f.label,
                kind: f.kind === 'textarea' ? 'textarea' as const : 'text' as const,
                value: typeof f.value === 'string' ? f.value : '',
                maxLength: typeof f.maxLength === 'number' ? f.maxLength : undefined,
            }]
        }).slice(0, 8)
        return fields.length ? { kind: 'form', id, title: v.title, fields, submitLabel: typeof v.submitLabel === 'string' ? v.submitLabel : 'Save' } : null
    }
    return null
}

function asLinks(v: unknown): ChatLink[] {
    if (!Array.isArray(v)) return []
    return v.flatMap((l) => (isObj(l) && typeof l.label === 'string' && typeof l.href === 'string' && l.href.startsWith('/') ? [{ label: l.label, href: l.href }] : [])).slice(0, 8)
}

export async function runChatTurn<TOOLS extends ToolSet>(opts: ChatTurnOptions<TOOLS>, emit: (frame: ChatFrame) => void): Promise<ChatTurnResult> {
    const parts: MessagePart[] = []
    const requests: AiRequestUsage[] = []
    const outages = new Set<string>()
    let error: ClassifiedAiError | null = null
    let aborted = false
    let responseMessages: Array<AssistantModelMessage | ToolModelMessage> = []
    const modelId: string = BOLI_CHAT_MODEL_ID

    const pushText = (d: string) => {
        const last = parts[parts.length - 1]
        if (last?.type === 'text') last.text += d
        else parts.push({ type: 'text', text: d })
    }
    // The turn's thinking: one `thought` part kept FIRST, whatever order the blocks arrive in (they can come before each
    // step). Its time is the sum of the blocks.
    let thinkingSince: number | null = null
    const thought = (): Extract<MessagePart, { type: 'thought' }> => {
        const first = parts[0]
        if (first?.type === 'thought') return first
        const t: Extract<MessagePart, { type: 'thought' }> = { type: 'thought', text: '', ms: 0 }
        parts.unshift(t)
        return t
    }
    const callStarted = new Map<string, number>()
    const labelOf = (name: string): string | undefined => (opts.toolLabels as Partial<Record<string, string>> | undefined)?.[name]

    try {
        const model = getBoliChatModel()
        const settings = opts.settings ?? {}
        const stopOnTools = opts.stopOnTools ?? []
        const stopWhen = stopOnTools.length
            ? [isStepCount(opts.maxSteps ?? 6), hasToolCall<TOOLS>(...stopOnTools)]
            : [isStepCount(opts.maxSteps ?? 6)]
        const result = streamText({
            model,
            instructions: { role: 'system', content: opts.instructions },
            allowSystemInMessages: true,
            messages: opts.messages,
            tools: opts.tools,
            toolOrder: opts.toolOrder,
            // Only these are sent - a tool defined but not listed (e.g. one switched off for this deployment) stays out.
            activeTools: opts.toolOrder,
            stopWhen,
            maxRetries: 1,
            maxOutputTokens: settings.maxTokens ?? taskConfig(opts.task).maxOutputTokens,
            providerOptions: boliProviderOptions(settings),
            abortSignal: opts.abortSignal,
            prepareStep: () => ({
                activeTools: opts.toolOrder.filter((t) => !outages.has(t)),
            }),
        })

        for await (const part of result.fullStream) {
            switch (part.type) {
                case 'text-delta':
                    if (part.text) { pushText(part.text); emit({ t: 'text', d: part.text }) }
                    break
                case 'reasoning-start':
                    thinkingSince = Date.now()
                    thought()
                    break
                case 'reasoning-delta':
                    if (part.text) {
                        thought().text += part.text
                        emit({ t: 'reasoning', d: part.text })
                    }
                    break
                case 'reasoning-end': {
                    const ms = thinkingSince !== null ? Date.now() - thinkingSince : 0
                    thinkingSince = null
                    const t = thought()
                    t.ms = (t.ms ?? 0) + ms
                    // Blocks are separated by a blank line, so two thoughts never run together.
                    if (t.text && !t.text.endsWith('\n\n')) { t.text += '\n\n'; emit({ t: 'reasoning', d: '\n\n' }) }
                    emit({ t: 'reasoning-end', ms })
                    break
                }
                case 'tool-call': {
                    const label = labelOf(part.toolName)
                    const at = Date.now()
                    callStarted.set(part.toolCallId, at)
                    if (label) emit({ t: 'tool', id: part.toolCallId, name: part.toolName, label, state: 'call', at })
                    break
                }
                case 'tool-result': {
                    const out: unknown = part.output
                    const label = labelOf(part.toolName)
                    const outage = isObj(out) && typeof out._outage === 'string' ? out._outage : null
                    if (label) {
                        const at = Date.now()
                        parts.push({ type: 'tool', id: part.toolCallId, name: part.toolName, label, ok: !outage, startedAt: callStarted.get(part.toolCallId), endedAt: at })
                        emit({ t: 'tool', id: part.toolCallId, name: part.toolName, label, state: outage ? 'error' : 'done', at })
                    }
                    if (outage) {
                        outages.add(part.toolName)
                        parts.push({ type: 'notice', text: outage })
                        emit({ t: 'notice', text: outage })
                    }
                    if (isObj(out)) {
                        const card = asCard(out._card, part.toolCallId)
                        if (card) { parts.push({ type: 'card', card, state: 'open' }); emit({ t: 'card', card }) }
                        for (const link of asLinks(out._links)) { parts.push({ type: 'link', link }); emit({ t: 'link', link }) }
                    }
                    break
                }
                case 'tool-error': {
                    // A tool that threw counts as an outage: one notice, and it is gone for the rest of the turn.
                    outages.add(part.toolName)
                    const label = labelOf(part.toolName)
                    if (label) {
                        const at = Date.now()
                        parts.push({ type: 'tool', id: part.toolCallId, name: part.toolName, label, ok: false, startedAt: callStarted.get(part.toolCallId), endedAt: at })
                        emit({ t: 'tool', id: part.toolCallId, name: part.toolName, label, state: 'error', at })
                    }
                    console.error(`[ai] tool ${part.toolName} failed`, part.error instanceof Error ? part.error.message : part.error)
                    break
                }
                case 'finish-step': {
                    const req = toRequest(part.usage)
                    requests.push(req)
                    if (isDev) {
                        console.info(`[ai] step ${requests.length}`, {
                            input: req.inputTokens, cached: req.cacheReadTokens, output: req.outputTokens, finish: part.finishReason,
                        })
                    }
                    break
                }
                case 'error':
                    error = classifyAiError(part.error)
                    console.error('[ai] stream error', part.error)
                    break
                case 'abort':
                    aborted = true
                    break
                default:
                    break
            }
        }
        if (!error && !aborted) {
            try {
                responseMessages = await result.responseMessages
            } catch (err) {
                error = classifyAiError(err)
            }
        }
    } catch (err) {
        if (opts.abortSignal?.aborted) aborted = true
        else {
            error = classifyAiError(err)
            console.error('[ai] turn failed', err)
        }
    }

    if (parts[0]?.type === 'thought') {
        parts[0].text = parts[0].text.trim()
        if (!parts[0].text) parts.shift()
    }
    if (error) emit({ t: 'error', code: error.code, message: error.message })

    const text = parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('')
    // Usage is recorded whatever happened: the steps that ran were billed to us.
    await recordAiUsage({
        userId: opts.usage.userId,
        feature: opts.usage.feature,
        task: opts.task,
        model: modelId,
        conversationId: opts.usage.conversationId ?? null,
        requests,
        failed: !!error && !text,
    })
    return { parts, text, responseMessages, requests, error, aborted }
}
