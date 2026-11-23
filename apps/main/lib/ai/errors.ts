import type { KuraErrorCode } from './protocol'

/**
 * Kura's error sentences. What the person reads is a plain sentence, never "Connection failed" or a stack. The page
 * draws `offline`, `credits` and `rate` as designed states (components/kura/kura-states.tsx).
 */
export const KURA_ERROR_MESSAGES: Record<KuraErrorCode, string> = {
    offline: "Boli's model is offline right now. Try again in a few minutes.",
    credits: 'You are out of credits. Add credits to keep chatting.',
    rate: 'Too many messages this minute. Wait a moment and send again.',
    invalid: 'The model could not read that request. Start a new chat and try again.',
    unknown: 'Something went wrong while answering. Try again.',
}

function statusOf(err: unknown): number | null {
    // A retry wrapper keeps the last attempt's error.
    const inner = typeof err === 'object' && err !== null && 'lastError' in err ? (err as { lastError: unknown }).lastError : err
    if (typeof inner === 'object' && inner !== null && 'statusCode' in inner) {
        const s = (inner as { statusCode: unknown }).statusCode
        return typeof s === 'number' ? s : null
    }
    return null
}

/**
 * A model failure, classified. Network failures (llama-server down, the tunnel gone: no status, or 502/503/504/530
 * from the edge) and 5xx read as `offline`; 400/413/422 (e.g. the context is full) as `invalid`.
 */
export function classifyModelError(err: unknown): { code: KuraErrorCode; message: string } {
    const status = statusOf(err)
    const text = (err instanceof Error ? `${err.message} ${String(err.cause ?? '')}` : String(err)).toLowerCase()
    let code: KuraErrorCode = 'unknown'
    if (status === 400 || status === 413 || status === 422) code = 'invalid'
    else if (status === 429) code = 'rate'
    else if (status === null || status >= 500) {
        if (status !== null || /fetch failed|econnrefused|enotfound|network|socket|connect|timed? ?out|unavailable|terminated/.test(text)) code = 'offline'
    }
    return { code, message: KURA_ERROR_MESSAGES[code] }
}
