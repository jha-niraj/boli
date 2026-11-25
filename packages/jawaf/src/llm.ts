import { boliUpstream } from "@repo/ai"
import { AppError } from "@repo/errors"

/**
 * Jawaf's calls to boli-chat (Gemma 4 E4B on llama-server, LLAMA_BASE_URL) - our own open model only. Raw
 * OpenAI-compatible fetch (not the AI SDK) because Jawaf needs llama-server's JSON-schema constrained output for
 * drafting and plain low-temperature text for answers; Kura keeps the AI SDK.
 *
 * Thinking is OFF on every Jawaf call (`enable_thinking: false`, the same on every turn so llama-server's prompt cache
 * keeps the frozen prefix) and `cache_prompt` is on.
 */

export interface LlmMessage {
    role: "system" | "user" | "assistant"
    content: string
}

export interface LlmResult {
    text: string
    /** "stop", "length" (hit max_tokens), ... as llama-server reports it. */
    finishReason: string | null
    inputTokens: number
    outputTokens: number
    ms: number
}

export interface LlmOptions {
    messages: LlmMessage[]
    maxTokens?: number
    temperature?: number
    /** Constrain the output to this JSON schema (llama-server grammar). */
    jsonSchema?: { name: string; schema: Record<string, unknown> }
    signal?: AbortSignal
    timeoutMs?: number
}

function request(opts: LlmOptions, stream: boolean): { url: string; init: RequestInit } {
    let up: ReturnType<typeof boliUpstream>
    try {
        up = boliUpstream()
    } catch (err) {
        throw new AppError("unknown", err instanceof Error ? err.message : "Boli's model is not configured.")
    }
    const body: Record<string, unknown> = {
        model: up.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.2,
        top_p: 0.9,
        stream,
        cache_prompt: true,
        chat_template_kwargs: { enable_thinking: false },
        ...(stream ? { stream_options: { include_usage: true } } : {}),
        // llama-server turns the schema into a GBNF grammar (constrained decoding): the OpenAI wrapper form in
        // response_format, plus its own top-level `json_schema` (the same schema; llama.cpp reads either).
        ...(opts.jsonSchema
            ? {
                response_format: { type: "json_schema", json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema } },
                json_schema: opts.jsonSchema.schema,
            }
            : {}),
    }
    const timeout = AbortSignal.timeout(opts.timeoutMs ?? 90_000)
    return {
        url: `${up.origin}/v1/chat/completions`,
        init: {
            method: "POST",
            headers: { "content-type": "application/json", ...(up.apiKey ? { authorization: `Bearer ${up.apiKey}` } : {}) },
            body: JSON.stringify(body),
            signal: opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout,
        },
    }
}

async function send(url: string, init: RequestInit): Promise<Response> {
    let res: Response
    try {
        res = await fetch(url, init)
    } catch (err) {
        throw new AppError("network", "Boli's model did not answer. Try again in a moment.", { cause: err })
    }
    if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new AppError(res.status >= 500 || res.status === 429 ? "network" : "unknown", `Boli's model rejected the request (${res.status}).`, {
            cause: new Error(body.slice(0, 300)),
        })
    }
    return res
}

/** One completion (no streaming). */
export async function complete(opts: LlmOptions): Promise<LlmResult> {
    const started = Date.now()
    const { url, init } = request(opts, false)
    const res = await send(url, init)
    const json = (await res.json()) as {
        choices?: { message?: { content?: string | null }; finish_reason?: string | null }[]
        usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    return {
        text: json.choices?.[0]?.message?.content ?? "",
        finishReason: json.choices?.[0]?.finish_reason ?? null,
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
        ms: Date.now() - started,
    }
}

/** The model's reply could not be read as JSON even after the fallbacks (fences stripped, first object, repair). */
export const NOT_JSON = "Boli's model returned something that is not JSON."

export function isNotJsonError(err: unknown): boolean {
    return err instanceof AppError && err.userMessage === NOT_JSON
}

/**
 * Read a JSON object out of a model reply: as is; else with ``` fences stripped; else the first balanced {...} in it;
 * else a reply cut off by max_tokens closed at its last complete value (a truncated price list keeps its full rows).
 * null when nothing usable is there. Pure; exported for tests.
 */
export function parseJsonReply(raw: string): unknown | null {
    const text = raw.replace(/^\uFEFF/, "").trim()
    const attempt = (t: string): unknown | null => {
        try {
            const v: unknown = JSON.parse(t)
            return v && typeof v === "object" ? v : null
        } catch {
            return null
        }
    }
    const direct = attempt(text)
    if (direct) return direct
    const unfenced = text.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "").replace(/\n?```\s*$/, "").trim()
    const fenced = attempt(unfenced)
    if (fenced) return fenced
    const start = unfenced.indexOf("{")
    if (start < 0) return null
    // Walk from the first "{" tracking strings and nesting; remember the last point where a value inside closed.
    const stack: string[] = []
    let inString = false
    let escaped = false
    let lastSafe = -1
    let lastSafeStack: string[] = []
    for (let i = start; i < unfenced.length; i++) {
        const c = unfenced[i]!
        if (inString) {
            if (escaped) escaped = false
            else if (c === "\\") escaped = true
            else if (c === '"') {
                inString = false
                // A finished string inside an array is a complete element.
                if (stack[stack.length - 1] === "]") { lastSafe = i; lastSafeStack = [...stack] }
            }
            continue
        }
        if (c === '"') inString = true
        else if (c === "{") stack.push("}")
        else if (c === "[") stack.push("]")
        else if (c === "}" || c === "]") {
            if (stack.pop() !== c) return null
            if (!stack.length) return attempt(unfenced.slice(start, i + 1))
            lastSafe = i
            lastSafeStack = [...stack]
        }
    }
    if (lastSafe < 0) return null
    const repaired = unfenced.slice(start, lastSafe + 1).replace(/,\s*$/, "") + [...lastSafeStack].reverse().join("")
    return attempt(repaired)
}

/**
 * A JSON-schema constrained completion, parsed (see parseJsonReply for the fallbacks). Throws AppError(NOT_JSON) when
 * nothing usable came back; outages throw the usual retryable AppError from `send`.
 */
export async function completeJson<T>(opts: LlmOptions & { jsonSchema: { name: string; schema: Record<string, unknown> } }): Promise<{ value: T; truncated: boolean } & LlmResult> {
    const r = await complete(opts)
    const value = parseJsonReply(r.text)
    if (value === null) {
        throw new AppError("unknown", NOT_JSON, { cause: new Error(`finish=${r.finishReason ?? "?"} chars=${r.text.length}`) })
    }
    return { ...r, value: value as T, truncated: r.finishReason === "length" }
}

/** A streamed completion: `onDelta` gets each text piece; resolves with the whole text and usage. */
export async function streamComplete(opts: LlmOptions, onDelta: (d: string) => void): Promise<LlmResult> {
    const started = Date.now()
    const { url, init } = request(opts, true)
    const res = await send(url, init)
    if (!res.body) throw new AppError("network", "Boli's model sent no reply.")
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let text = ""
    let inputTokens = 0
    let outputTokens = 0
    const line = (raw: string) => {
        const l = raw.trim()
        if (!l.startsWith("data:")) return
        const data = l.slice(5).trim()
        if (!data || data === "[DONE]") return
        try {
            const j = JSON.parse(data) as {
                choices?: { delta?: { content?: string | null } }[]
                usage?: { prompt_tokens?: number; completion_tokens?: number } | null
            }
            const d = j.choices?.[0]?.delta?.content
            if (d) {
                text += d
                onDelta(d)
            }
            if (j.usage) {
                inputTokens = j.usage.prompt_tokens ?? inputTokens
                outputTokens = j.usage.completion_tokens ?? outputTokens
            }
        } catch { /* a broken SSE line is skipped */ }
    }
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl = buffer.indexOf("\n")
        while (nl !== -1) {
            line(buffer.slice(0, nl))
            buffer = buffer.slice(nl + 1)
            nl = buffer.indexOf("\n")
        }
    }
    line(buffer + decoder.decode())
    return { text, finishReason: null, inputTokens, outputTokens, ms: Date.now() - started }
}
