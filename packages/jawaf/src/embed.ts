import { AppError } from "@repo/errors"

/**
 * BGE-M3 embeddings (1024 dims, cosine) behind ONE adapter (plan/main/jawaf/jawaf-v1.md "Embeddings"):
 *
 * - `llama` (default; dev and pilots): a second llama-server running the bge-m3 GGUF with `--embedding`, at
 *   LLAMA_EMBED_BASE_URL (OpenAI-compatible POST /v1/embeddings). LLAMA_EMBED_API_KEY is sent when set (falls back to
 *   LLAMA_API_KEY when the two servers share a key).
 * - `workers_ai` (production): Cloudflare Workers AI `@cf/baai/bge-m3` - the same model, so the same vectors. Not
 *   callable yet (no Workers AI billing on the account): it throws a clear error naming what is missing.
 *
 * Chosen by JAWAF_EMBED_PROVIDER=llama|workers_ai. Texts go in batches of 16; each text is cut to ~8,000 characters.
 * BGE-M3 needs no query/document prefix. Vectors are L2-normalised here so cosine = dot product everywhere.
 */

export const EMBED_DIMS = 1024
const BATCH = 16
const MAX_CHARS = 8000

export type EmbedProvider = "llama" | "workers_ai"

function env(name: string): string | undefined {
    const v = process.env[name]?.trim()
    return v ? v : undefined
}

export function embedProvider(): EmbedProvider {
    const p = env("JAWAF_EMBED_PROVIDER")?.toLowerCase()
    if (!p || p === "llama") return "llama"
    if (p === "workers_ai") return "workers_ai"
    throw new AppError("unknown", `JAWAF_EMBED_PROVIDER must be "llama" or "workers_ai" (it is "${p}").`)
}

/** True when the chosen provider has what it needs (a page can show a plain line instead of failing). */
export function embedConfigured(): boolean {
    try {
        return embedProvider() === "llama" ? Boolean(env("LLAMA_EMBED_BASE_URL")) : Boolean(env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_AI_TOKEN"))
    } catch {
        return false
    }
}

function normalise(v: number[]): number[] {
    let s = 0
    for (const x of v) s += x * x
    const n = Math.sqrt(s) || 1
    return v.map((x) => x / n)
}

async function llamaBatch(texts: string[]): Promise<number[][]> {
    const base = env("LLAMA_EMBED_BASE_URL")
    if (!base) throw new AppError("unknown", "LLAMA_EMBED_BASE_URL is not set (the bge-m3 embedding server).")
    const key = env("LLAMA_EMBED_API_KEY") ?? env("LLAMA_API_KEY")
    const origin = base.replace(/\/+$/, "").replace(/\/v1$/, "")
    let res: Response
    try {
        res = await fetch(`${origin}/v1/embeddings`, {
            method: "POST",
            headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
            body: JSON.stringify({ input: texts, model: "bge-m3", encoding_format: "float" }),
            signal: AbortSignal.timeout(60_000),
        })
    } catch (err) {
        throw new AppError("network", "The embedding server did not answer. Try again in a moment.", { cause: err })
    }
    if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new AppError(res.status >= 500 || res.status === 429 ? "network" : "unknown", `The embedding server rejected the request (${res.status}).`, {
            cause: new Error(body.slice(0, 300)),
        })
    }
    const json = (await res.json()) as { data?: { index?: number; embedding?: number[] }[] }
    const rows = [...(json.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    if (rows.length !== texts.length) throw new AppError("unknown", `The embedding server returned ${rows.length} vectors for ${texts.length} texts.`)
    return rows.map((r) => {
        const v = r.embedding ?? []
        if (v.length !== EMBED_DIMS) throw new AppError("unknown", `Expected ${EMBED_DIMS}-dimension embeddings, got ${v.length}.`)
        return normalise(v)
    })
}

async function workersAiBatch(_texts: string[]): Promise<number[][]> {
    const missing = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_TOKEN"].filter((n) => !env(n))
    if (missing.length) {
        throw new AppError("unknown", `Workers AI embeddings are not set up yet (${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} not set). Use JAWAF_EMBED_PROVIDER=llama.`)
    }
    // POST https://api.cloudflare.com/client/v4/accounts/<id>/ai/run/@cf/baai/bge-m3 { text: [...] } -> { result: { data } }.
    // Not enabled until Workers AI billing is on; kept as a stub so the switch is one env value.
    throw new AppError("unknown", "Workers AI embeddings are not enabled on this account yet. Use JAWAF_EMBED_PROVIDER=llama.")
}

/** Embed texts (documents or queries) -> unit vectors, in input order. Empty input = []. Throws AppError. */
export async function embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return []
    const provider = embedProvider()
    const call = provider === "llama" ? llamaBatch : workersAiBatch
    const out: number[][] = []
    for (let i = 0; i < texts.length; i += BATCH) {
        const batch = texts.slice(i, i + BATCH).map((t) => (t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) : t) || " ")
        out.push(...(await call(batch)))
    }
    return out
}

/** One query vector. */
export async function embedOne(text: string): Promise<number[]> {
    const [v] = await embed([text])
    if (!v) throw new AppError("unknown", "No embedding came back.")
    return v
}

/** pgvector literal: "[0.1,0.2,...]". */
export function vectorLiteral(v: number[]): string {
    return `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : "0")).join(",")}]`
}
