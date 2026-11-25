/**
 * Jawaf text helpers - pure functions (no I/O, no server imports), shared by ingest, the answer engine and the eval.
 *
 * - `chunkMarkdown`: a page's markdown -> chunks of ~300-500 tokens cut at headings, each keeping its heading path
 *   ("Admissions > Fees"), with a small overlap (the previous paragraph when it is short).
 * - `extractNumbers`: every number in a text, normalised (Devanagari digits -> ASCII, "1,20,000" -> "120000") - the
 *   invented-number guard compares an answer's numbers against its sources with it.
 */

/** Rough token count: ~4 Latin characters or ~2.5 Devanagari characters per token (BGE-M3 / Gemma tokenizers). */
export function estimateTokens(text: string): number {
    let deva = 0
    for (const ch of text) {
        const c = ch.codePointAt(0) ?? 0
        if (c >= 0x0900 && c <= 0x097f) deva++
    }
    const other = text.length - deva
    return Math.ceil(other / 4 + deva / 2.5)
}

export async function sha256Hex(text: string): Promise<string> {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Rich text HTML -> plain text (block tags become new lines). For indexing and the model; rendering sanitizes the HTML. */
export function htmlToText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi, "\n")
        .replace(/<\/t[dh]>/gi, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

/** Plain text -> minimal safe HTML paragraphs (for drafted facts). */
export function textToHtml(text: string): string {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    return text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
            const lines = p.split("\n").map((l) => l.trim())
            if (lines.every((l) => /^[-*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`
            return `<p>${lines.map(esc).join("<br>")}</p>`
        })
        .join("")
}

/** A table as plain text rows (for indexing and the model). */
export function tableToText(table: { columns: string[]; rows: string[][] } | null | undefined): string {
    if (!table || !table.columns.length) return ""
    const head = table.columns.join(" | ")
    return [head, ...table.rows.map((r) => table.columns.map((_, i) => r[i] ?? "").join(" | "))].join("\n")
}

/**
 * The URL a page is deduped by: lower-case host without `www.`, no hash, no trailing slash, tracking parameters
 * dropped, the rest of the query kept sorted. Null for a non-http URL.
 */
export function urlKey(raw: string): string | null {
    try {
        const u = new URL(raw)
        if (u.protocol !== "http:" && u.protocol !== "https:") return null
        const host = u.hostname.toLowerCase().replace(/^www\./, "")
        const params = [...u.searchParams.entries()]
            .filter(([k]) => !/^(utm_|fbclid|gclid|ref$|source$)/i.test(k))
            .sort(([a], [b]) => a.localeCompare(b))
        const q = params.length ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}` : ""
        const path = u.pathname.replace(/\/+$/, "") || ""
        return `${host}${path}${q}`
    } catch {
        return null
    }
}

/** "Gurukul HQ School" -> "gurukul-hq-school" (3-40 chars, the public page slug). */
export function slugify(name: string): string {
    const s = name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
        .replace(/-+$/g, "")
    return s.length >= 3 ? s : `${s || "bot"}-${Math.random().toString(36).slice(2, 6)}`
}

// ---------------------------------------------------------------------------------------------------------------------
// Markdown cleanup + chunking
// ---------------------------------------------------------------------------------------------------------------------

/** Firecrawl markdown -> readable text: images dropped, links kept as their words, bare URL lines and nav noise gone. */
export function cleanMarkdown(md: string): string {
    return md
        .replace(/\r\n/g, "\n")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, "$1")
        .replace(/<[^>]+>/g, "")
        .split("\n")
        .map((l) => l.replace(/\s+$/g, ""))
        .filter((l) => !/^\s*(https?:\/\/\S+|\[\s*\]|[-*|_=\s]{3,})\s*$/.test(l) || /^\s*\|/.test(l))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

export interface TextChunk {
    /** "About > Fees" - the heading path the chunk starts under. */
    heading: string
    text: string
    tokens: number
}

interface Unit {
    path: string[]
    /** The heading line itself (inlined when a chunk holds several sections). */
    title: string | null
    blocks: string[]
}

function splitLong(block: string, maxTokens: number): string[] {
    if (estimateTokens(block) <= maxTokens) return [block]
    // Sentences (Latin and Devanagari danda), then lines, then hard cuts.
    const parts = block.split(/(?<=[.!?।])\s+|\n/).filter((p) => p.trim())
    const out: string[] = []
    let cur = ""
    for (const p of parts) {
        const next = cur ? `${cur} ${p}` : p
        if (estimateTokens(next) > maxTokens && cur) {
            out.push(cur)
            cur = p
        } else cur = next
    }
    if (cur) out.push(cur)
    return out.flatMap((s) => {
        if (estimateTokens(s) <= maxTokens) return [s]
        const size = Math.max(200, Math.floor(s.length * (maxTokens / estimateTokens(s))))
        const pieces: string[] = []
        for (let i = 0; i < s.length; i += size) pieces.push(s.slice(i, i + size))
        return pieces
    })
}

/**
 * Cut markdown into chunks: sections at headings (# .. ######), packed in order up to `targetTokens` (default 400),
 * never above `maxTokens` (500); a long paragraph is split at sentences. When a chunk is full the next one repeats
 * the last paragraph if it is short (<= `overlapTokens`, default 60) so an answer that straddles the cut is still found.
 */
export function chunkMarkdown(markdown: string, opts: { title?: string | null; targetTokens?: number; maxTokens?: number; overlapTokens?: number } = {}): TextChunk[] {
    const target = opts.targetTokens ?? 400
    const max = opts.maxTokens ?? 500
    const overlap = opts.overlapTokens ?? 60
    const md = cleanMarkdown(markdown)
    if (!md) return []

    const units: Unit[] = []
    let path: string[] = opts.title ? [opts.title.trim()] : []
    let unit: Unit = { path: [...path], title: null, blocks: [] }
    let para: string[] = []
    const flushPara = () => {
        const t = para.join("\n").trim()
        if (t) unit.blocks.push(t)
        para = []
    }
    const base = opts.title ? 1 : 0
    for (const line of md.split("\n")) {
        const h = /^(#{1,6})\s+(.*)$/.exec(line)
        if (h) {
            flushPara()
            if (unit.blocks.length || unit.title) units.push(unit)
            const level = h[1]!.length
            const text = h[2]!.replace(/[#*_`]/g, "").trim()
            path = [...path.slice(0, base + level - 1), text].filter(Boolean)
            unit = { path: [...path], title: text, blocks: [] }
            continue
        }
        if (!line.trim()) flushPara()
        else para.push(line)
    }
    flushPara()
    if (unit.blocks.length || unit.title) units.push(unit)

    const chunks: TextChunk[] = []
    let curHeading: string | null = null
    let cur: string[] = []
    let curTokens = 0
    const push = () => {
        const text = cur.join("\n\n").trim()
        if (text && estimateTokens(text) >= 8) chunks.push({ heading: curHeading ?? "", text, tokens: estimateTokens(text) })
    }
    for (const u of units) {
        const blocks = u.blocks.flatMap((b) => splitLong(b, max - 20))
        if (!blocks.length) continue
        const headingLine = u.title ? u.title : null
        const pieces = headingLine && cur.length ? [headingLine, ...blocks] : blocks
        for (const piece of pieces) {
            const t = estimateTokens(piece)
            if (cur.length && curTokens + t > target) {
                push()
                const last = cur[cur.length - 1]!
                const lastT = estimateTokens(last)
                cur = lastT <= overlap && lastT + t <= max ? [last] : []
                curTokens = cur.length ? lastT : 0
                curHeading = u.path.join(" > ")
            }
            if (!cur.length) curHeading = u.path.join(" > ")
            cur.push(piece)
            curTokens += t
        }
    }
    push()
    return chunks
}

// ---------------------------------------------------------------------------------------------------------------------
// Numbers (the invented-number guard)
// ---------------------------------------------------------------------------------------------------------------------

const DEVA_DIGITS = "०१२३४५६७८९"

export function asciiDigits(text: string): string {
    return text.replace(/[०-९]/g, (d) => String(DEVA_DIGITS.indexOf(d)))
}

/**
 * Every number in `text`, normalised: Devanagari digits -> ASCII, thousands separators removed ("1,20,000" -> "120000"),
 * leading zeros dropped, a decimal kept ("1.5"). Citation markers like [2] are ignored.
 */
export function extractNumbers(text: string): string[] {
    const t = asciiDigits(text).replace(/\[\d{1,2}\]/g, " ")
    const out: string[] = []
    for (const m of t.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
        let n = m[0].replace(/,(?=\d)/g, "").replace(/,+$/, "")
        if (n.includes(".")) n = n.replace(/\.?0+$/, "")
        n = n.replace(/^0+(?=\d)/, "")
        if (n) out.push(n)
    }
    return out
}
