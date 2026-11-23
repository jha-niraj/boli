import { APICallError } from 'ai'
import type { ChatErrorCode } from './protocol'

/**
 * Provider error classifier. What the person reads is a plain sentence, never "Connection failed".
 *
 * Retry policy (owner, 2026-11-23): overloaded -> retry once; quota / auth / invalid -> fatal, no retry.
 * The one retry happens in the SDK (`maxRetries: 1` on the call: it retries 408/409/429/5xx) before any output was
 * streamed. llama-server answers 503 while the model loads and refuses the connection when it is down. An error in the middle of a stream is not retried - partial text cannot be
 * taken back - and is reported with the sentence below.
 */
export interface ClassifiedAiError {
    code: ChatErrorCode
    retryable: boolean
    message: string
}

const MESSAGES: Record<ChatErrorCode, string> = {
    cap: 'You have reached today\'s AI limit. It resets at midnight UTC.',
    overloaded: 'Boli\'s model is busy or offline right now. Try again in a minute.',
    rate_limit: 'Too many requests at once. Wait a few seconds and try again.',
    quota: 'You are out of credits. Add credits on the Billing page to keep chatting.',
    auth: 'The model server rejected this app\'s key. Ask the person who runs Boli to check LLAMA_API_KEY.',
    invalid: 'The model could not read that request. It may be too long for its 8,192-token context: start a new chat and try again.',
    not_configured: 'The model is not set up on this app yet (LLAMA_BASE_URL or BOLI_UPSTREAM_MODEL is missing).',
    unknown: 'Something went wrong while answering. Try again.',
}

export function aiErrorMessage(code: ChatErrorCode): string {
    return MESSAGES[code]
}

function bodyText(err: APICallError): string {
    return `${err.responseBody ?? ''} ${err.message}`.toLowerCase()
}

export function classifyAiError(err: unknown): ClassifiedAiError {
    // A retry wrapper (RetryError) keeps the last attempt's error.
    const inner = typeof err === 'object' && err !== null && 'lastError' in err ? (err as { lastError: unknown }).lastError : err
    if (APICallError.isInstance(inner)) {
        const status = inner.statusCode ?? 0
        const text = bodyText(inner)
        let code: ChatErrorCode = 'unknown'
        if (status === 503 || text.includes('loading model') || text.includes('overloaded')) code = 'overloaded'
        else if (status === 402) code = 'quota'
        else if (status === 429) code = 'rate_limit'
        else if (status === 401 || status === 403) code = 'auth'
        else if (status === 400 || status === 413 || status === 422) code = 'invalid'
        else if (status >= 500) code = 'overloaded'
        return { code, retryable: code === 'overloaded' || code === 'rate_limit', message: MESSAGES[code] }
    }
    const text = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
    if (text.includes('llama_base_url is not set') || text.includes('boli_upstream_model is not set')) return { code: 'not_configured', retryable: false, message: MESSAGES.not_configured }
    if (text.includes('overloaded') || text.includes('fetch failed') || text.includes('econnrefused') || text.includes('cannot connect')) {
        return { code: 'overloaded', retryable: true, message: MESSAGES.overloaded }
    }
    return { code: 'unknown', retryable: false, message: MESSAGES.unknown }
}
