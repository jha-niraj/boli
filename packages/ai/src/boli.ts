import 'server-only'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'

/**
 * Boli's own model, served by llama.cpp's `llama-server` (OpenAI-compatible). The ONLY model this platform answers with.
 *
 * Env (names only; errors name the missing variable):
 * - `LLAMA_BASE_URL`      the server origin (`http://127.0.0.1:8080` in dev, the tunnel URL elsewhere). `/v1` is added here.
 * - `LLAMA_API_KEY`       the server's `--api-key` (llama-server reads LLAMA_API_KEY itself). Blank = no auth header.
 * - `BOLI_UPSTREAM_MODEL` the model name sent upstream for the public id `boli-chat`.
 *
 * THINKING PER REQUEST. Gemma 4's chat template reads `enable_thinking` (default false) and, when true, puts `<|think|>`
 * at the top of the system turn. llama-server lets a request set template variables with
 * `chat_template_kwargs: { "enable_thinking": true | false }`, and returns the thoughts in `reasoning_content`
 * (`--reasoning-format auto`/`deepseek`, the default). For the request to be able to choose, START THE SERVER WITH
 * `--reasoning auto` (the default) - NOT `--reasoning off`, which forces thinking off for every request:
 *
 *   llama-server -hf ggml-org/gemma-4-E4B-it-GGUF:Q4_0 --no-mmproj -c 8192 --port 8080 --jinja --reasoning auto
 *
 * Every call sends `enable_thinking` explicitly (false unless `think` is on), so nothing depends on the server default.
 */

/** The public id. Stable when the weights behind it change. */
export const BOLI_CHAT_MODEL_ID = 'boli-chat'

function env(name: string): string {
    return (process.env[name] ?? '').trim()
}

function required(name: string): string {
    const v = env(name)
    if (!v) throw new Error(`${name} is not set`)
    return v
}

/** The server origin without a trailing slash or `/v1`. */
function baseOrigin(): string {
    return required('LLAMA_BASE_URL').replace(/\/+$/, '').replace(/\/v1$/, '')
}

export interface BoliUpstream {
    /** `<origin>` - append `/v1/chat/completions`, `/health`. */
    origin: string
    /** Null when LLAMA_API_KEY is blank (a local server without a key). */
    apiKey: string | null
    /** What `boli-chat` maps to upstream. */
    model: string
}

/** The upstream connection settings. Throws an error naming the missing variable. */
export function boliUpstream(): BoliUpstream {
    return { origin: baseOrigin(), apiKey: env('LLAMA_API_KEY') || null, model: required('BOLI_UPSTREAM_MODEL') }
}

/** Both LLAMA_BASE_URL and BOLI_UPSTREAM_MODEL are set (a page can show a plain line instead of failing on send). */
export function boliConfigured(): boolean {
    return !!env('LLAMA_BASE_URL') && !!env('BOLI_UPSTREAM_MODEL')
}

let provider: ReturnType<typeof createOpenAICompatible> | null = null
let providerKey = ''

function getProvider() {
    const up = boliUpstream()
    const key = `${up.origin}|${up.apiKey ?? ''}`
    if (!provider || providerKey !== key) {
        provider = createOpenAICompatible({
            name: 'boli',
            baseURL: `${up.origin}/v1`,
            apiKey: up.apiKey ?? undefined,
            includeUsage: true,
        })
        providerKey = key
    }
    return provider
}

/** The AI SDK model for `boli-chat`. Throws when LLAMA_BASE_URL or BOLI_UPSTREAM_MODEL is not set. */
export function getBoliChatModel(): LanguageModel {
    return getProvider().chatModel(boliUpstream().model)
}

/** The sampling settings a caller may pass (Kura's settings fit this shape). */
export interface BoliSamplingSettings {
    temperature?: number
    topP?: number
    topK?: number
    maxTokens?: number
    /** Think before answering (costs output tokens). */
    think?: boolean
}

/**
 * Kura settings as AI SDK provider options: `providerOptions: boliProviderOptions(settings)`. The keys go into the
 * request body as llama-server reads them (`top_k` is not an AI SDK setting; `chat_template_kwargs` toggles thinking).
 * Temperature, top_p and max_tokens are sent here too, so one call carries everything.
 */
export function boliProviderOptions(settings: BoliSamplingSettings): { boli: Record<string, number | boolean | Record<string, boolean>> } {
    const body: Record<string, number | boolean | Record<string, boolean>> = {
        chat_template_kwargs: { enable_thinking: settings.think === true },
    }
    if (typeof settings.temperature === 'number') body.temperature = settings.temperature
    if (typeof settings.topP === 'number') body.top_p = settings.topP
    if (typeof settings.topK === 'number') body.top_k = settings.topK
    if (typeof settings.maxTokens === 'number') body.max_tokens = settings.maxTokens
    return { boli: body }
}

/** The same settings as a raw request-body fragment, for code that calls llama-server with fetch (the /v1 proxy). */
export function boliBodyParams(settings: BoliSamplingSettings): Record<string, number | Record<string, boolean>> {
    const { boli } = boliProviderOptions(settings)
    const out: Record<string, number | Record<string, boolean>> = {}
    for (const [k, v] of Object.entries(boli)) if (typeof v !== 'boolean') out[k] = v
    return out
}
