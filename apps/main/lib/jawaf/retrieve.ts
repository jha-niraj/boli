import "server-only"
import { db, sql } from "@repo/db"
import type { JawafOriginKind } from "@repo/boli/jawaf"
import { embed, vectorLiteral } from "./embed"

/**
 * Hybrid search over ONE bot's chunks, one database round trip (a db.batch: two SET LOCALs + one query per query
 * variant). Three ranked lists per variant, merged by reciprocal rank fusion (k = 60):
 *
 * 1. Vector: BGE-M3 cosine similarity (HNSW, iterative scan so the bot filter never starves the result).
 * 2. Keywords: Postgres full text (`simple` config - no stemming, works for Devanagari tokens) with an OR query of the
 *    question's content words (prefix match for words of 4+ letters).
 * 3. Fuzzy keywords: pg_trgm word similarity per query word (>= 0.55) - catches Romanized spelling variants
 *    ("shulka" / "sulka", "kati" / "katti") and typos the exact index misses.
 *
 * Variants: the question as typed, plus (for Romanized Nepali) a rough Devanagari transliteration - each is embedded and
 * searched, and every list joins the same fusion.
 */

export const RRF_K = 60

export interface RetrievalHit {
    id: string
    originKind: JawafOriginKind
    originId: string
    sourceId: string | null
    heading: string
    text: string
    /** Best cosine similarity of this chunk to any query variant (null = not in a vector list). */
    vecSim: number | null
    /** Distinct query words this chunk contains exactly. */
    kwMatched: number
    /** Distinct query words this chunk contains fuzzily (trigram). */
    fuzzyMatched: number
    rrf: number
}

export interface RetrievalResult {
    hits: RetrievalHit[]
    /** Highest vector similarity over everything searched (the main gate signal). */
    bestVecSim: number
    /** Query words used for keyword search. */
    words: string[]
    ms: number
}

const STOP = new Set([
    // English
    "a", "an", "the", "is", "are", "was", "were", "be", "do", "does", "did", "what", "which", "who", "whom", "how", "when", "where", "why", "can",
    "could", "will", "would", "should", "i", "me", "my", "we", "our", "you", "your", "it", "its", "this", "that", "these", "those", "of", "for",
    "to", "in", "on", "at", "by", "with", "and", "or", "any", "there", "have", "has", "please", "tell", "about", "get", "much", "many", "need",
    "want", "if", "so", "from", "us", "they", "them", "their", "know", "give", "also", "into", "than", "then",
    // Romanized Nepali function words
    "k", "ke", "ho", "cha", "chha", "xa", "ma", "maa", "ko", "ka", "ki", "le", "lai", "ra", "ni", "ta", "pani", "hajur", "tapai", "tapain",
    "hamro", "mero", "malai", "yo", "tyo", "kati", "kasari", "kun", "kaha", "kahan", "kina", "kahile", "huncha", "hunchha", "hunxa", "garnu",
    "garna", "parcha", "parchha", "milcha", "milchha", "bhayo", "thiyo", "hola", "garne", "dinu", "sakincha", "sakinchha", "aba", "ahile",
    // Devanagari particles
    "के", "हो", "छ", "मा", "को", "का", "की", "ले", "लाई", "र", "नि", "पनि", "यो", "त्यो", "कति", "कसरी", "कुन", "कहाँ", "किन", "कहिले",
    "हुन्छ", "गर्नु", "गर्न", "पर्छ", "मिल्छ", "तपाईं", "तपाईको", "तपाईंको", "हाम्रो", "मेरो", "मलाई", "हजुर",
])

/** Content words of a question (lower case, letters / digits / Devanagari marks only), at most 12. */
export function queryWords(text: string): string[] {
    const words = text
        .toLowerCase()
        .split(/[^\p{L}\p{N}\p{M}]+/u)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !STOP.has(w))
    return [...new Set(words)].slice(0, 12)
}

function tsQuery(words: string[]): string | null {
    if (!words.length) return null
    return words.map((w) => (w.length >= 4 && /^[a-z0-9]+$/.test(w) ? `${w}:*` : w)).join(" | ")
}

interface Row {
    id: string
    origin_kind: JawafOriginKind
    origin_id: string
    source_id: string | null
    heading: string
    text: string
    sim: number | string | null
    vr: number | string | null
    kr: number | string | null
    tr: number | string | null
    kw_matched: number | string | null
    fz_matched: number | string | null
}

/** A text[] literal for a single bind parameter (drizzle would expand a JS array into a list). Words are pre-sanitised. */
function pgTextArray(items: string[]): string {
    return `{${items.map((w) => `"${w.replace(/["\\]/g, "")}"`).join(",")}}`
}

const num = (v: number | string | null | undefined): number | null => (v === null || v === undefined ? null : Number(v))

export interface SearchOptions {
    botId: string
    /** Query variants (the question, a transliteration). The first is the primary. */
    texts: string[]
    /** Precomputed vectors for `texts` (else embedded here). */
    vectors?: number[][]
    /** Only these origin kinds (e.g. pages + files for drafting). */
    kinds?: JawafOriginKind[]
    /** Fused results returned. Default 8. */
    k?: number
    /** Depth of each ranked list. Default 20. */
    depth?: number
}

export async function searchChunks(opts: SearchOptions): Promise<RetrievalResult> {
    const started = Date.now()
    const texts = opts.texts.map((t) => t.trim()).filter(Boolean)
    if (!texts.length) return { hits: [], bestVecSim: 0, words: [], ms: 0 }
    const vectors = opts.vectors ?? (await embed(texts))
    const depth = opts.depth ?? 20
    const words = [...new Set(texts.flatMap(queryWords))].slice(0, 16)
    const tsq = tsQuery(words)
    const kinds = opts.kinds?.length ? opts.kinds : null
    const kindFilter = kinds ? sql`AND origin_kind = ANY(${pgTextArray(kinds)}::text[])` : sql``
    const wordArr = pgTextArray(words)

    const queries = vectors.map((v) => sql`
        WITH v AS (
            SELECT id, 1 - (embedding <=> ${vectorLiteral(v)}::vector) AS sim
              FROM jawaf_chunk
             WHERE bot_id = ${opts.botId} AND embedding IS NOT NULL ${kindFilter}
             ORDER BY embedding <=> ${vectorLiteral(v)}::vector
             LIMIT ${depth}
        ), vr AS (
            SELECT id, sim, row_number() OVER (ORDER BY sim DESC) AS r FROM v
        ), k AS (
            SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, q, 1) DESC) AS r
              FROM jawaf_chunk, to_tsquery('simple', ${tsq ?? "zzzznomatch"}) q
             WHERE bot_id = ${opts.botId} ${kindFilter} AND ${tsq !== null} AND tsv @@ q
             ORDER BY ts_rank_cd(tsv, q, 1) DESC
             LIMIT ${depth}
        ), f AS (
            SELECT c.id, s.m, row_number() OVER (ORDER BY s.m DESC, s.ws DESC) AS r
              FROM jawaf_chunk c
              CROSS JOIN LATERAL (
                  SELECT count(*) FILTER (WHERE word_similarity(w, c.text) >= 0.55) AS m,
                         coalesce(sum(word_similarity(w, c.text)), 0) AS ws
                    FROM unnest(${wordArr}::text[]) w
              ) s
             WHERE c.bot_id = ${opts.botId} ${kindFilter} AND s.m > 0
             ORDER BY s.m DESC, s.ws DESC
             LIMIT ${depth}
        ), ids AS (SELECT id FROM vr UNION SELECT id FROM k UNION SELECT id FROM f)
        SELECT c.id, c.origin_kind, c.origin_id, c.source_id, c.heading, c.text,
               vr.sim, vr.r AS vr, k.r AS kr, f.r AS tr,
               (SELECT count(*) FROM unnest(${wordArr}::text[]) w WHERE c.tsv @@ to_tsquery('simple', w)) AS kw_matched,
               coalesce(f.m, 0) AS fz_matched
          FROM jawaf_chunk c
          JOIN ids ON ids.id = c.id
          LEFT JOIN vr ON vr.id = c.id
          LEFT JOIN k ON k.id = c.id
          LEFT JOIN f ON f.id = c.id
    `)

    const results = await db.batch([
        db.execute(sql`SET LOCAL hnsw.iterative_scan = 'relaxed_order'`),
        db.execute(sql`SET LOCAL hnsw.ef_search = 100`),
        ...queries.map((q) => db.execute(q)),
    ] as [ReturnType<typeof db.execute>, ...ReturnType<typeof db.execute>[]])

    const merged = new Map<string, RetrievalHit>()
    let bestVecSim = 0
    for (const res of results.slice(2)) {
        const rows = ((res as { rows?: unknown[] }).rows ?? []) as Row[]
        for (const r of rows) {
            const sim = num(r.sim)
            if (sim !== null && sim > bestVecSim) bestVecSim = sim
            const add = [num(r.vr), num(r.kr), num(r.tr)].reduce<number>((s, rank) => (rank ? s + 1 / (RRF_K + rank) : s), 0)
            const prev = merged.get(r.id)
            if (prev) {
                prev.rrf += add
                if (sim !== null && (prev.vecSim === null || sim > prev.vecSim)) prev.vecSim = sim
                prev.kwMatched = Math.max(prev.kwMatched, Number(r.kw_matched ?? 0))
                prev.fuzzyMatched = Math.max(prev.fuzzyMatched, Number(r.fz_matched ?? 0))
            } else {
                merged.set(r.id, {
                    id: r.id,
                    originKind: r.origin_kind,
                    originId: r.origin_id,
                    sourceId: r.source_id,
                    heading: r.heading,
                    text: r.text,
                    vecSim: sim,
                    kwMatched: Number(r.kw_matched ?? 0),
                    fuzzyMatched: Number(r.fz_matched ?? 0),
                    rrf: add,
                })
            }
        }
    }
    const hits = [...merged.values()].sort((a, b) => b.rrf - a.rrf).slice(0, opts.k ?? 8)
    return { hits, bestVecSim, words, ms: Date.now() - started }
}
