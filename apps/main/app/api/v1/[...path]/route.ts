import { API_ERRORS, BOLI_CHAT, KURA_DEFAULTS, KURA_LIMITS, MODELS, type ApiErrorCode } from "@repo/boli"
import { authenticateKey } from "@/lib/platform/keys"
import { chargeInference, hasBalance } from "@/lib/platform/credits"
import { checkRateLimit } from "@/lib/platform/ratelimit"
import { upstreamChat } from "@/lib/platform/upstream"
import { chatCompletionSchema } from "@/schemas/chat-completions"

/**
 * The public, OpenAI-compatible API. ONE dispatcher route (the Worker's size rule); next.config.js rewrites
 * `/v1/:path*` here and the middleware skips `/v1`.
 *
 *   GET  /v1/models            the models we serve (key required, like every /v1 call)
 *   POST /v1/chat/completions  key -> rate limit -> balance -> validate -> llama-server -> charge
 *
 * Metadata only: prompts and answers are passed through and never stored. Money is charged INLINE: after the JSON
 * answer is read, or at the end of a stream before it closes - never in after().
 */

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ path?: string[] }> }
type Json = Record<string, unknown>

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v)
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0)

function apiError(code: ApiErrorCode, message: string, headers?: Record<string, string>): Response {
    const e = API_ERRORS[code]
    return Response.json({ error: { message, type: e.type, code } }, { status: e.status, headers })
}

const MODELS_CREATED = Math.floor(Date.UTC(2026, 10, 24) / 1000)

export async function GET(req: Request, ctx: Ctx): Promise<Response> {
    const path = (await ctx.params).path ?? []
    // Every /v1 call needs a key (owner, 2026-11-24), the model list included.
    const token = readKey(req)
    if (!token) return apiError("invalid_api_key", "No API key sent. Send your key as `Authorization: Bearer boli_sk_...` (or the `x-api-key` header). Create one on the API keys page.")
    if (!(await authenticateKey(token))) return apiError("invalid_api_key", "That API key is not valid or was revoked. Check you copied the whole key, or create a new one on the API keys page.")
    if (path.length === 1 && path[0] === "models") {
        return Response.json({
            object: "list",
            data: MODELS.map((m) => ({ id: m.id, object: "model", created: MODELS_CREATED, owned_by: "boli" })),
        })
    }
    if (path.length === 2 && path[0] === "models" && path[1]) {
        const m = MODELS.find((x) => x.id === path[1])
        if (m) return Response.json({ id: m.id, object: "model", created: MODELS_CREATED, owned_by: "boli" })
        return apiError("not_found", `There is no model "${path[1]}". GET /v1/models lists the models you can use.`)
    }
    return notFound(path)
}

function notFound(path: string[]): Response {
    return apiError("not_found", `There is no endpoint /v1/${path.join("/")}. Use POST /v1/chat/completions or GET /v1/models.`)
}

function readKey(req: Request): string | null {
    const auth = req.headers.get("authorization")
    if (auth) {
        const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
        if (m?.[1]) return m[1].trim()
    }
    const x = req.headers.get("x-api-key")
    return x && x.trim() ? x.trim() : null
}

type Usage = { input: number; output: number; reasoning: number }

/** The OpenAI usage object -> our token counts. */
function usageOf(u: unknown): Usage | null {
    if (!isObj(u)) return null
    const details = isObj(u.completion_tokens_details) ? u.completion_tokens_details : null
    return { input: num(u.prompt_tokens), output: num(u.completion_tokens), reasoning: num(details?.reasoning_tokens) }
}

async function upstreamMessage(res: Response): Promise<string | null> {
    try {
        const body: unknown = await res.json()
        if (isObj(body) && isObj(body.error) && typeof body.error.message === "string") return body.error.message
    } catch {
        return null
    }
    return null
}

export async function POST(req: Request, ctx: Ctx): Promise<Response> {
    const path = (await ctx.params).path ?? []
    if (!(path.length === 2 && path[0] === "chat" && path[1] === "completions")) return notFound(path)
    const started = Date.now()

    const token = readKey(req)
    if (!token) return apiError("invalid_api_key", "No API key sent. Send your key as `Authorization: Bearer boli_sk_...` (or the `x-api-key` header). Create one on the API keys page.")
    const key = await authenticateKey(token)
    if (!key) return apiError("invalid_api_key", "That API key is not valid or was revoked. Check you copied the whole key, or create a new one on the API keys page.")

    const limit = await checkRateLimit(key.userId)
    if (!limit.ok) {
        return apiError("rate_limit_exceeded", `Too many requests: your account is limited per minute across all keys and Kura. Wait ${limit.retryAfterSec} seconds and try again.`, { "Retry-After": String(limit.retryAfterSec) })
    }
    if (!(await hasBalance(key.userId))) {
        return apiError("insufficient_quota", "Your account has no credits left. Add credits on the Billing page, then retry.")
    }

    let raw: unknown
    try {
        raw = await req.json()
    } catch {
        return apiError("invalid_request", "The request body is not valid JSON. Send a JSON object with `model` and `messages`.")
    }
    const parsed = chatCompletionSchema.safeParse(raw)
    if (!parsed.success) {
        const issue = parsed.error.issues[0]
        const where = issue?.path.length ? ` (at ${issue.path.join(".")})` : ""
        return apiError("invalid_request", `${issue?.message ?? "The request is not valid."}${where}`)
    }
    const { max_completion_tokens, max_tokens, ...body } = parsed.data
    const stream = body.stream === true
    const model = body.model
    const upstreamBody: Json = { ...body, max_tokens: max_tokens ?? max_completion_tokens ?? KURA_DEFAULTS.maxTokens }

    const base = { userId: key.userId, apiKeyId: key.keyId, source: "api" as const, model, stream }
    const recordError = async (errorCode: ApiErrorCode) => {
        try {
            await chargeInference({ ...base, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started, status: "error", errorCode })
        } catch (err) {
            console.error("[api] could not record a failed call", err instanceof Error ? err.message : err)
        }
    }
    const unavailable = async () => {
        await recordError("model_unavailable")
        return apiError("model_unavailable", `${BOLI_CHAT.id} is not reachable right now. Wait a minute and retry; nothing was charged.`)
    }

    let res: Response
    try {
        res = await upstreamChat(upstreamBody, { stream })
    } catch (err) {
        console.error("[api] upstream call failed", err instanceof Error ? err.message : err)
        return unavailable()
    }
    if (!res.ok) {
        if (res.status === 400) {
            const msg = await upstreamMessage(res)
            await recordError("invalid_request")
            return apiError("invalid_request", `The model could not take this request${msg ? `: ${msg}` : "."} The context is ${BOLI_CHAT.contextTokens.toLocaleString("en")} tokens (prompt + answer); shorten the messages or lower max_tokens.`)
        }
        console.error(`[api] upstream answered ${res.status}`)
        return unavailable()
    }

    if (!stream) return answerJson(res, base, started)
    return answerStream(res, base, started)
}

type Base = { userId: string; apiKeyId: string; source: "api"; model: string; stream: boolean }

async function answerJson(res: Response, base: Base, started: number): Promise<Response> {
    let json: unknown
    try {
        json = await res.json()
    } catch {
        json = null
    }
    if (!isObj(json)) {
        await chargeInference({ ...base, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started, status: "error", errorCode: "model_unavailable" })
            .catch(() => undefined)
        return apiError("model_unavailable", "The model sent an answer we could not read. Retry; nothing was charged.")
    }
    json.model = base.model
    const usage = usageOf(json.usage)
    const charge = await chargeInference({
        ...base,
        inputTokens: usage?.input ?? 0,
        outputTokens: usage?.output ?? 0,
        reasoningTokens: usage?.reasoning ?? 0,
        latencyMs: Date.now() - started,
        status: "ok",
    })
    return Response.json(json, { headers: { "x-boli-request-id": charge.requestId } })
}

/**
 * Pass the SSE stream through, rewriting `model` in each chunk, and charge once at the end - inline, before the
 * stream closes. The upstream is NOT tied to the client's signal: a request already running finishes and is charged
 * (owner rule). If the final usage chunk never comes, the streamed deltas are counted as output tokens.
 */
function answerStream(res: Response, base: Base, started: number): Response {
    const upstream = res.body
    if (!upstream) return apiError("model_unavailable", "The model returned an empty stream. Retry; nothing was charged.")
    const requestId = crypto.randomUUID()
    const enc = new TextEncoder()
    const dec = new TextDecoder()

    const out = new ReadableStream<Uint8Array>({
        async start(controller) {
            let open = true
            const send = (text: string) => {
                if (!open) return
                try { controller.enqueue(enc.encode(text)) } catch { open = false }
            }
            const seen: { usage: Usage | null } = { usage: null }
            let deltas = 0
            let reasoningDeltas = 0
            let firstTokenMs: number | null = null
            let failed = false
            let buffer = ""

            const handleLine = (line: string) => {
                if (!line.startsWith("data:")) { send(`${line}\n`); return }
                const data = line.slice(5).trim()
                if (data === "[DONE]" || !data) { send(`${line}\n`); return }
                let chunk: unknown
                try { chunk = JSON.parse(data) } catch { send(`${line}\n`); return }
                if (!isObj(chunk)) { send(`${line}\n`); return }
                if (isObj(chunk.error)) failed = true
                if (chunk.usage) seen.usage = usageOf(chunk.usage) ?? seen.usage
                if (Array.isArray(chunk.choices)) {
                    for (const c of chunk.choices) {
                        const d = isObj(c) && isObj(c.delta) ? c.delta : null
                        if (!d) continue
                        if (typeof d.content === "string" && d.content) deltas++
                        if (typeof d.reasoning_content === "string" && d.reasoning_content) { deltas++; reasoningDeltas++ }
                        if (firstTokenMs === null && (d.content || d.reasoning_content)) firstTokenMs = Date.now() - started
                    }
                }
                if ("model" in chunk) chunk.model = base.model
                send(`data: ${JSON.stringify(chunk)}\n`)
            }

            const reader = upstream.getReader()
            try {
                for (;;) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += dec.decode(value, { stream: true })
                    let nl = buffer.indexOf("\n")
                    while (nl !== -1) {
                        handleLine(buffer.slice(0, nl).replace(/\r$/, ""))
                        buffer = buffer.slice(nl + 1)
                        nl = buffer.indexOf("\n")
                    }
                }
                buffer += dec.decode()
                if (buffer) handleLine(buffer)
            } catch (err) {
                failed = deltas === 0
                console.error("[api] stream from the model broke", err instanceof Error ? err.message : err)
            }

            const u = seen.usage
            const ok = !failed && (u !== null || deltas > 0)
            try {
                await chargeInference({
                    ...base,
                    id: requestId,
                    inputTokens: u?.input ?? 0,
                    outputTokens: u?.output ?? deltas,
                    reasoningTokens: u?.reasoning ?? reasoningDeltas,
                    latencyMs: Date.now() - started,
                    firstTokenMs,
                    status: ok ? "ok" : "error",
                    errorCode: ok ? null : "model_unavailable",
                })
            } catch (err) {
                console.error("[api] could not charge a streamed call", err instanceof Error ? err.message : err)
            }
            if (open) {
                try { controller.close() } catch { /* the client already left */ }
            }
        },
    })

    return new Response(out, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "x-boli-request-id": requestId,
        },
    })
}
