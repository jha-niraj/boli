/**
 * Kura's wire protocol - newline-delimited JSON frames, one per line - and the stored message parts.
 *
 * CLIENT-SAFE: no imports. The route encodes frames, the page reads them. Kura runs on our own open model only and has
 * no tools, so a reply is thinking (optional), text, notices and one `usage` line.
 */

/** What one reply used and cost - drawn as the meta line under it, and stored so a refresh keeps it. */
export interface KuraUsage {
    inputTokens: number
    outputTokens: number
    /** Thinking tokens (already part of outputTokens). */
    reasoningTokens: number
    costMicro: number
    /** Wall time of the reply, request to last token. */
    ms: number
}

export type KuraPart =
    | { type: 'text'; text: string }
    /** The model's thinking on this turn and how long it took. One per message, first. */
    | { type: 'thought'; text: string; ms?: number }
    | { type: 'notice'; text: string }
    | { type: 'usage'; usage: KuraUsage }

/**
 * `offline`: Boli's model did not answer (llama-server down, tunnel gone). `credits`: out of credits. `rate`: too many
 * requests this minute. Each becomes a designed state on the page, never a raw error.
 */
export type KuraErrorCode = 'offline' | 'credits' | 'rate' | 'invalid' | 'unknown'

export type KuraFrame =
    | { t: 'meta'; conversationId: string; userMessageId: string; assistantMessageId: string; title: string }
    | { t: 'text'; d: string }
    | { t: 'reasoning'; d: string }
    | { t: 'reasoning-end'; ms: number }
    | { t: 'notice'; text: string }
    | { t: 'usage'; usage: KuraUsage; balanceMicro: number | null }
    | { t: 'error'; code: KuraErrorCode; message: string }
    | { t: 'done' }

export function encodeFrame(frame: KuraFrame): string {
    return `${JSON.stringify(frame)}\n`
}

const FRAME_TYPES = new Set(['meta', 'text', 'reasoning', 'reasoning-end', 'notice', 'usage', 'error', 'done'])

function isFrame(v: unknown): v is KuraFrame {
    return typeof v === 'object' && v !== null && 't' in v && typeof v.t === 'string' && FRAME_TYPES.has(v.t)
}

/** Read an NDJSON frame stream, calling `onFrame` for each complete frame. Resolves when the stream ends. */
export async function readFrameStream(body: ReadableStream<Uint8Array>, onFrame: (frame: KuraFrame) => void): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const flush = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return
        try {
            const parsed: unknown = JSON.parse(trimmed)
            if (isFrame(parsed)) onFrame(parsed)
        } catch { /* a broken line is skipped, never fatal */ }
    }
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl = buffer.indexOf('\n')
        while (nl !== -1) {
            flush(buffer.slice(0, nl))
            buffer = buffer.slice(nl + 1)
            nl = buffer.indexOf('\n')
        }
    }
    flush(buffer + decoder.decode())
}
