import "server-only"
import { BOLI_CHAT_MODEL_ID, boliUpstream } from "@repo/ai"

/**
 * The raw call to llama-server for the public API (the /v1 route passes the OpenAI body through). Kura uses the AI SDK
 * model from @repo/ai instead; both read the same env (LLAMA_BASE_URL, LLAMA_API_KEY, BOLI_UPSTREAM_MODEL).
 *
 * `think` (our extension, default false) maps to llama-server's per-request template switch
 * `chat_template_kwargs.enable_thinking` (Gemma 4's template reads it). The server must run with `--reasoning auto`
 * (not `off`) for the request to choose; thoughts come back as `reasoning_content`.
 */

function headers(apiKey: string | null): Record<string, string> {
    return { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) }
}

/** Throws an Error naming the missing variable when the upstream is not configured; a network failure throws too. */
export async function upstreamChat(body: Record<string, unknown>, opts: { stream: boolean; signal?: AbortSignal }): Promise<Response> {
    const up = boliUpstream()
    const { think, model, chat_template_kwargs, stream_options, ...rest } = body
    const kwargs = typeof chat_template_kwargs === "object" && chat_template_kwargs !== null && !Array.isArray(chat_template_kwargs)
        ? (chat_template_kwargs as Record<string, unknown>)
        : {}
    const payload: Record<string, unknown> = {
        ...rest,
        model: model === BOLI_CHAT_MODEL_ID || model === undefined ? up.model : model,
        stream: opts.stream,
        chat_template_kwargs: { ...kwargs, enable_thinking: think === true },
    }
    if (opts.stream) {
        const so = typeof stream_options === "object" && stream_options !== null && !Array.isArray(stream_options) ? stream_options : {}
        payload.stream_options = { ...so, include_usage: true }
    }
    return fetch(`${up.origin}/v1/chat/completions`, {
        method: "POST",
        headers: headers(up.apiKey),
        body: JSON.stringify(payload),
        signal: opts.signal,
    })
}

/** GET /health with a 3-second timeout. False when unconfigured, down, or still loading the model (503). */
export async function upstreamHealthy(): Promise<boolean> {
    try {
        const up = boliUpstream()
        const res = await fetch(`${up.origin}/health`, { headers: headers(up.apiKey), signal: AbortSignal.timeout(3000) })
        return res.ok
    } catch {
        return false
    }
}
