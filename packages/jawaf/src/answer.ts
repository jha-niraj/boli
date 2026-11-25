import { and, asc, db, eq, inArray } from "@repo/db"
import { jawafFactSection, jawafNote, jawafPage, jawafQa, jawafSource } from "@repo/db/schema"
import { isAppError } from "@repo/errors"
import { JAWAF_BUSINESS_TYPE_INFO, JAWAF_NOT_FOUND, type JawafBusinessType, type JawafScript } from "@repo/boli/jawaf"
import type { JawafAnswerSource, JawafAnswerStatus } from "./types"
import type { BotRow } from "./bots"
import { isArticleUrl } from "./crawl"
import { embed } from "./embed"
import { factBody } from "./indexer"
import { complete, streamComplete, type LlmMessage } from "./llm"
import { queryWords, searchChunks, type RetrievalHit, type RetrievalResult } from "./retrieve"
import { detectScript, romanizedToDevanagari, scriptInstruction, scriptMatches } from "./script"
import { asciiDigits, extractNumbers } from "./text"

/**
 * THE answer engine (plan/main/jawaf/jawaf-v1.md "Jawaf - answers"): one function for the playground, the public
 * page, the widget and the API. Pure of conversations and money - `lib/jawaf/ask.ts` stores and meters around it.
 *
 *   question -> script -> hybrid retrieval (+ Devanagari transliteration for Romanized) -> GATE -> prompt -> boli-chat
 *            -> guards (NOT_FOUND sentinel, invented numbers, prices only from facts, citations mapped) -> result
 *
 * Guards in CODE, not trust in a 4B model:
 * 1. Gate: below the retrieval threshold, and no Q&A / fact match, the model is NOT called (not-found + contact card).
 * 2. The model may answer NOT_FOUND; that becomes the same not-found result.
 * 3. Every number in the reply must appear in the facts, the sources or the question; a sentence with an unknown number
 *    is removed (and a "please contact us for that detail" line added). Money amounts must appear in the FACTS when the
 *    bot has approved facts with numbers (prices only from the facts table).
 * 4. Citations [n] that do not map to a source given are stripped; the rest are renumbered 1..k in order of use.
 * 5. Price questions (priceIntent): the approved "Prices and fees" section goes FIRST (and passes the gate on its own),
 *    blog / news / guide pages drop to the end of the excerpts, and with NO approved price facts no amount is ever
 *    quoted - every sentence with money or a number next to a price word is removed, so the price part is not-found
 *    with the contact card (a page never sets a price; plan decision "prices only from approved facts").
 */

// ---------------------------------------------------------------------------------------------------------------------
// Tuning (measured on the eval set: ml/jawaf-eval)
// ---------------------------------------------------------------------------------------------------------------------

export const ENGINE = {
    /**
     * Gate (measured 2026-11-25 on gurukulhq.com, BGE-M3): answerable and unanswerable questions overlap between 0.50 and
     * 0.62 best similarity, so the gate only stops clearly unrelated questions; inside the band the model decides
     * (NOT_FOUND) and the absence guard below catches "the information does not say" replies.
     */
    vecStrong: 0.6,
    /** Below vecStrong, a match this good still goes to the model. */
    vecWeak: 0.47,
    /** ...or a weaker one when most query words also match as keywords. */
    vecFloor: 0.4,
    kwShare: 0.5,
    /** A Q&A phrasing this close answers outright. */
    qaStrong: 0.72,
    /** Sources sent to the model (after facts). */
    sources: 6,
    /** Characters of facts sent (all approved sections, each capped). */
    factsChars: 6000,
    factSectionChars: 1500,
    sourceChars: 1800,
    historyTurns: 2,
    /** Regenerate once when the reply is in the wrong script. */
    scriptRetry: true,
} as const

// ---------------------------------------------------------------------------------------------------------------------
// Price intent
// ---------------------------------------------------------------------------------------------------------------------

/** Words that make a question about money on their own (English, Romanized Nepali, Devanagari; not निःशुल्क = free). */
const PRICE_WORD = /\b(price|prices|pricing|priced|cost|costs|costing|fee|fees|charge|charges|charged|rate|rates|tariff|tariffs|paisa|paisaa|rupiya|rupaiya|rupaiyaa|rupaya|rupees?|rs|npr|shulk|shulka|sulka|mulya|mully?a|daam|bhada|bhaada|discount|discounts|how much)\b|(?<!निः)शुल्क|मूल्य|मुल्य|रुपैयाँ|रुपैया|पैसा|दाम|भाडा|छुट|(?:रु|रू)\.?\s*[\d०-९]/i
/** "kati" / "कति" = how much OR how many / what time. */
const KATI = /^(kati|katti|कति)$/
/** The word right after "kati" that makes it a count, not a price ("kati din", "कति जना", "कति बजे"). */
const COUNT_NEXT = /^(din|dinko|dina|jana|janaa|wata|ota|ghanta|minat|minute|baje|bajey|samaya|time|student|students|bidyarthi|credit|credits|thau|branch|km|kilo|barsa|barsha|years?|days?|दिन|दिनको|जना|वटा|घण्टा|बजे|समय|विद्यार्थी|क्रेडिट|ठाउँ|शाखा|वर्ष|बर्ष)$/
/** ...or the word right before it ("PAN number kati ho"). */
const COUNT_PREV = /^(number|no|नम्बर|संख्या|sankhya)$/

/** Is this question (also) asking about a price, fee or cost? Pure; exported for the eval. */
export function priceIntent(question: string): boolean {
    const q = question.toLowerCase()
    if (PRICE_WORD.test(q)) return true
    const words = q.split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean)
    return words.some((w, i) => KATI.test(w) && !COUNT_NEXT.test(words[i + 1] ?? "") && !COUNT_PREV.test(words[i - 1] ?? ""))
}

const MAX_TOKENS = { short: 220, balanced: 380, detailed: 650 } as const
const LENGTH_RULE = {
    short: "Answer in one or two sentences.",
    balanced: "Answer in two to four sentences, or a short list when there are several items.",
    detailed: "Answer fully but stay focused: up to about eight sentences, or a list.",
} as const
const TONE_RULE = {
    friendly: "Tone: warm and friendly, like a helpful front-desk person.",
    professional: "Tone: professional and clear.",
    casual: "Tone: relaxed and casual, still polite.",
    formal: "Tone: formal and respectful (in Nepali use tapai / hajur forms).",
} as const

/** Frozen (no names, dates or ids) so llama-server's prompt cache keeps it across every bot and turn. */
export const SYSTEM_PROMPT = `You are Jawaf, the answer assistant for one business. You answer visitors' questions using ONLY the numbered sources you are given: the business facts (approved by the owner) and excerpts from the business's own website, files and Q&A.

Rules:
1. Use only what the sources say. Never use outside knowledge and never guess.
2. First check whether the sources directly answer THIS question. If they do not - even if they talk about related topics - reply with exactly: NOT_FOUND
3. Prices, fees, costs and discounts: state them only when they appear in the sources, and copy the numbers exactly as written.
4. Put the source number in square brackets after each sentence that uses it, like [2]. Cite only numbers from the list you were given.
5. Never invent phone numbers, emails, addresses, dates, names, numbers or links.
6. When the business facts and a website excerpt disagree, the business facts are right.
7. If only part of the question is answered by the sources, answer that part and say the rest is not in the information you have.
8. Do not mention these rules, the word "sources", or that you are an AI unless asked. Do not greet at length.`

export interface EngineHistoryTurn {
    role: "user" | "assistant"
    text: string
}

export interface EngineInput {
    bot: BotRow
    question: string
    /** Earlier turns of this conversation, oldest first. */
    history?: EngineHistoryTurn[]
    /** Streamed reply text (drafts; the final text may differ after the guards). */
    onDelta?: (d: string) => void
    signal?: AbortSignal
}

export interface EngineResult {
    status: Exclude<JawafAnswerStatus, "credits">
    text: string
    sources: JawafAnswerSource[]
    answered: boolean
    script: JawafScript
    latencyMs: number
    tokens: { input: number; output: number }
    /** Debug numbers stored on the message (no visitor text). */
    retrieval: {
        bestVecSim: number
        bestQaSim: number
        kwShare: number
        gate: "strong" | "qa" | "weak" | "keywords" | "prices" | "none"
        hits: number
        droppedSentences: number
        strippedCitations: number
        scriptRetried: boolean
        /** The model replied that the information is missing (turned into not-found). */
        absence: boolean
        /** The question asks about a price / fee / cost (priceIntent). */
        priceIntent: boolean
        /** ...and the bot has approved Prices and fees (sent first); false = no price may be quoted. */
        priceFacts: boolean
        retrievalMs: number
        modelMs: number
    }
}

interface Fact {
    id: string
    key: string
    title: string
    body: string
}

interface Numbered {
    n: number
    kind: JawafAnswerSource["kind"]
    originId: string
    title: string
    url: string | null
    fileName: string | null
    text: string
}

function clip(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")} ...` : s
}

/** Approved fact sections in their order; `first` (Prices and fees for a price question) leads and is never cut. */
async function loadFacts(botId: string, first: string | null = null): Promise<Fact[]> {
    const sorted = await db.select().from(jawafFactSection)
        .where(and(eq(jawafFactSection.botId, botId), eq(jawafFactSection.approved, true)))
        .orderBy(asc(jawafFactSection.sort))
    const rows = first ? [...sorted.filter((r) => r.key === first), ...sorted.filter((r) => r.key !== first)] : sorted
    let used = 0
    const out: Fact[] = []
    for (const r of rows) {
        const body = clip(factBody(r), ENGINE.factSectionChars)
        if (!body.trim()) continue
        if (used + body.length > ENGINE.factsChars) break
        used += body.length
        out.push({ id: r.id, key: r.key, title: r.title, body })
    }
    return out
}

/** Titles / URLs / file names for the retrieved chunks' origins (one batch). */
async function describeOrigins(botId: string, hits: RetrievalHit[]): Promise<Map<string, { title: string; url: string | null; fileName: string | null }>> {
    const ids = (k: string) => [...new Set(hits.filter((h) => h.originKind === k).map((h) => h.originId))]
    const pageIds = [...ids("page"), ...ids("file")]
    const qaIds = ids("qa")
    const noteIds = ids("note")
    const out = new Map<string, { title: string; url: string | null; fileName: string | null }>()
    const none = ["__none__"]
    const [pages, qas, notes] = await db.batch([
        db.select({ id: jawafPage.id, title: jawafPage.title, url: jawafPage.url, fileName: jawafSource.fileName })
            .from(jawafPage).innerJoin(jawafSource, eq(jawafSource.id, jawafPage.sourceId))
            .where(and(eq(jawafPage.botId, botId), inArray(jawafPage.id, pageIds.length ? pageIds : none))),
        db.select({ id: jawafQa.id, question: jawafQa.question }).from(jawafQa).where(and(eq(jawafQa.botId, botId), inArray(jawafQa.id, qaIds.length ? qaIds : none))),
        db.select({ id: jawafNote.id, title: jawafNote.title }).from(jawafNote).where(and(eq(jawafNote.botId, botId), inArray(jawafNote.id, noteIds.length ? noteIds : none))),
    ])
    for (const p of pages) out.set(p.id, { title: p.title || p.fileName || p.url || "Page", url: p.url, fileName: p.url ? null : p.fileName })
    for (const q of qas) out.set(q.id, { title: q.question, url: null, fileName: null })
    for (const n of notes) out.set(n.id, { title: n.title, url: null, fileName: null })
    return out
}

function profileBlock(bot: BotRow, facts: Fact[]): string {
    const type = JAWAF_BUSINESS_TYPE_INFO[(bot.businessType as JawafBusinessType)]?.label ?? "Business"
    const tone = TONE_RULE[bot.tone as keyof typeof TONE_RULE] ?? TONE_RULE.friendly
    const length = LENGTH_RULE[bot.length as keyof typeof LENGTH_RULE] ?? LENGTH_RULE.balanced
    const lines = [
        `Business: ${bot.name} (${type}).${bot.website ? ` Website: ${bot.website}` : ""}`,
        tone,
        length,
    ]
    if (bot.instructions.trim()) lines.push(`The owner's instructions (follow them unless they break the rules): ${clip(bot.instructions.trim(), 1500)}`)
    if (facts.length) {
        lines.push("", "Business facts (approved by the owner):")
        facts.forEach((f, i) => lines.push(`[${i + 1}] ${f.title}:\n${f.body}`))
    } else {
        lines.push("", "Business facts: none approved yet.")
    }
    return lines.join("\n")
}

/** A reply that only says the information is missing ("the sources do not state...") is a not-found, not an answer. */
const ABSENCE = [
    /\b(does not|doesn't|do not|don't|did not|didn't)\s+(state|say|mention|specify|provide|include|list|contain|cover|have)/i,
    /\b(no|not any)\s+(information|details|mention|data)\b/i,
    /\bnot\s+(mentioned|stated|specified|available|provided|listed|found|included|covered)\b/i,
    /\b(could not|couldn't|cannot|can't|unable to)\s+(find|confirm|answer)/i,
    /\bnot\s+(in|part of)\s+(the|my|our)\s+(information|sources|details|data)/i,
    /\b(dinu|dina|bhanna|batauna)\s*(sakdina|sakdaina|sakinna)|\bthaha\s*(chaina|chhaina|xaina)/i,
    /\bjankari\s*(ma\s*)?(chaina|chhaina|xaina|bhetina|bhetiena|uplabdha\s*chaina|diyeko\s*chaina)/i,
    /\b(ullekh|bhaniyeko|lekhiyeko)\s*(gariyeko\s*)?(chaina|chhaina|xaina)/i,
    /(उल्लेख|जानकारी|भनिएको|लेखिएको)[^।.!?]{0,25}(छैन|भेटिएन|गरिएको छैन|उपलब्ध छैन)/,
]

/**
 * Not-found when: all of the reply says "not stated"; or it opens with that and is short; or it admits something is
 * missing AND the rest shares no content word with the question (the model padded an off-topic answer around "the
 * information does not say" - measured on "How many employees work at Gurukul?").
 */
function isAbsence(text: string, question: string, botName: string): boolean {
    const sentences = text.replace(/\[\d{1,2}\]/g, "").split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
    if (!sentences.length) return true
    const absent = sentences.filter((x) => ABSENCE.some((re) => re.test(x)))
    if (absent.length === sentences.length || (absent.includes(sentences[0]!) && sentences.length <= 2)) return true
    if (!absent.length) return false
    const nameWords = new Set(queryWords(botName))
    const asked = queryWords(question).filter((w) => !nameWords.has(w) && w.length >= 3)
    if (!asked.length) return false
    const rest = queryWords(sentences.filter((x) => !absent.includes(x)).join(" "))
    const restSet = new Set(rest)
    // Prefix match so "employee" / "employees" and "fee" / "fees" count as the same word.
    return !asked.some((w) => restSet.has(w) || rest.some((r) => r.startsWith(w.slice(0, 5)) && w.length >= 5))
}

const SENTENCE_SPLIT = /(?<=[.!?।])\s+|\n+/

/** A money amount: a number next to Rs / NPR / रु / रू / rupees. */
const MONEY = /(?:rs\.?|npr|रु\.?|रू\.?|रुपैयाँ|rupees?)\s*[\d०-९][\d०-९,]*(?:\.\d+)?|[\d०-९][\d०-९,]*(?:\.\d+)?\s*(?:\/-|rupees?|रुपैयाँ)/gi

function numbersOf(text: string): Set<string> {
    return new Set(extractNumbers(text))
}

/** Remove sentences that carry a number the sources do not have (money: the facts must have it when facts have numbers). */
function guardNumbers(text: string, allowed: Set<string>, factNumbers: Set<string>, strictMoney: boolean, noPrices = false): { text: string; dropped: number } {
    const parts = text.split(SENTENCE_SPLIT)
    let dropped = 0
    const kept = parts.filter((sentence) => {
        const plain = sentence.replace(/\[\d{1,2}(?:\s*,\s*\d{1,2})*\]/g, " ")
        // Single digits ("2 years", list numbers) are too common to judge; two digits and more must be in the sources.
        const bad = extractNumbers(plain).some((n) => n.replace(".", "").length >= 2 && !allowed.has(n))
        let badMoney = false
        if (strictMoney) {
            for (const m of asciiDigits(plain).matchAll(MONEY)) {
                const n = extractNumbers(m[0])[0]
                if (n && !factNumbers.has(n)) badMoney = true
            }
        }
        // No approved prices: "30 per student", "NPR 30" and "शुल्क ३०" all go.
        if (noPrices && PRICE_WORD.test(plain.toLowerCase()) && extractNumbers(plain).length > 0) badMoney = true
        if (bad || badMoney) dropped++
        return !(bad || badMoney)
    })
    return { text: kept.join(" ").replace(/\s+([.,!?])/g, "$1").trim(), dropped }
}

/** Map [n] / [n, m] markers to real sources, strip the rest, renumber in order of first use. */
function mapCitations(text: string, available: Numbered[]): { text: string; used: Numbered[]; stripped: number } {
    const byN = new Map(available.map((s) => [s.n, s]))
    const order: number[] = []
    let stripped = 0
    const out = text.replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g, (_m, list: string) => {
        const ns = list.split(",").map((x) => Number(x.trim()))
        const good = ns.filter((n) => byN.has(n))
        stripped += ns.length - good.length
        const mapped = [...new Set(good)].map((n) => {
            if (!order.includes(n)) order.push(n)
            return order.indexOf(n) + 1
        })
        return mapped.length ? mapped.map((n) => `[${n}]`).join("") : ""
    })
    return { text: out.replace(/\s+([.,!?।])/g, "$1").replace(/[ \t]{2,}/g, " ").trim(), used: order.map((n) => byN.get(n)!), stripped }
}

const CONTACT_FOR_REST: Record<JawafScript, string> = {
    english: "For the exact details, please contact us.",
    romanized: "Thap jankari ko lagi hamilai samparka garnuhos.",
    devanagari: "थप जानकारीका लागि हामीलाई सम्पर्क गर्नुहोस्।",
    mixed: "Thap details ko lagi please contact garnuhos.",
}

function notFound(script: JawafScript, started: number, retrieval: EngineResult["retrieval"], tokens = { input: 0, output: 0 }): EngineResult {
    return { status: "not_found", text: JAWAF_NOT_FOUND[script], sources: [], answered: false, script, latencyMs: Date.now() - started, tokens, retrieval }
}

/** Answer one question for one bot. Never throws for model / embedding outages: returns status 'offline' / 'error'. */
export async function answerQuestion(input: EngineInput): Promise<EngineResult> {
    const started = Date.now()
    const { bot } = input
    const question = input.question.trim()
    const script = detectScript(question).script
    const retrieval: EngineResult["retrieval"] = {
        bestVecSim: 0, bestQaSim: 0, kwShare: 0, gate: "none", hits: 0, droppedSentences: 0, strippedCitations: 0, scriptRetried: false, absence: false, priceIntent: false, priceFacts: false, retrievalMs: 0, modelMs: 0,
    }

    try {
        // Follow-ups ("ani tyo kati ho?") borrow the previous question for retrieval.
        const history = (input.history ?? []).slice(-ENGINE.historyTurns * 2)
        const prevUser = [...history].reverse().find((h) => h.role === "user")?.text
        // The question alone always leads; a short follow-up is ALSO searched with the previous question attached
        // (searching only the combined text re-answers the previous question - measured).
        const texts = [question]
        if (script === "romanized" || script === "mixed") {
            const deva = romanizedToDevanagari(question)
            if (deva !== question) texts.push(deva)
        }
        if (prevUser && question.split(/\s+/).length < 5) texts.push(`${prevUser} ${question}`)

        const price = priceIntent(question)
        const [vectors, facts] = await Promise.all([embed(texts), loadFacts(bot.id, price ? "prices" : null)])
        const priceFact = price ? facts.find((f) => f.key === "prices") ?? null : null
        retrieval.priceIntent = price
        retrieval.priceFacts = priceFact !== null
        const found: RetrievalResult = await searchChunks({ botId: bot.id, texts, vectors, k: ENGINE.sources + 6 })
        retrieval.retrievalMs = found.ms
        retrieval.bestVecSim = Number(found.bestVecSim.toFixed(4))
        retrieval.hits = found.hits.length
        const qaHits = found.hits.filter((h) => h.originKind === "qa")
        retrieval.bestQaSim = Number(Math.max(0, ...qaHits.map((h) => h.vecSim ?? 0)).toFixed(4))
        const words = found.words.length || 1
        const bestKw = Math.max(0, ...found.hits.map((h) => Math.max(h.kwMatched, h.fuzzyMatched)))
        retrieval.kwShare = Number((bestKw / words).toFixed(3))

        // --- the gate -------------------------------------------------------------------------------------------
        if (retrieval.bestQaSim >= ENGINE.qaStrong) retrieval.gate = "qa"
        else if (retrieval.bestVecSim >= ENGINE.vecStrong) retrieval.gate = "strong"
        else if (retrieval.bestVecSim >= ENGINE.vecWeak) retrieval.gate = "weak"
        else if (retrieval.bestVecSim >= ENGINE.vecFloor && retrieval.kwShare >= ENGINE.kwShare && found.words.length >= 1) retrieval.gate = "keywords"
        // A price question with an approved price list always reaches the model with that list (the model can still
        // say NOT_FOUND for "the price of an iPhone").
        else if (priceFact) retrieval.gate = "prices"
        else return notFound(script, started, retrieval)

        // --- sources: facts first (always), then retrieved non-fact chunks ----------------------------------------
        const origins = await describeOrigins(bot.id, found.hits)
        const numbered: Numbered[] = facts.map((f, i) => ({ n: i + 1, kind: "fact", originId: f.id, title: f.title, url: null, fileName: null, text: f.body }))
        // Price question: blog / news / guide pages go to the end (a general article about fees is not the price).
        const nonFact = found.hits.filter((h) => h.originKind !== "fact")
        const article = (h: RetrievalHit) => h.originKind === "page" && isArticleUrl(origins.get(h.originId)?.url)
        const ordered = price ? [...nonFact.filter((h) => !article(h)), ...nonFact.filter(article)] : nonFact
        const picked = ordered.slice(0, ENGINE.sources)
        // A Q&A answer appears once even when several phrasings matched.
        const seenQa = new Set<string>()
        for (const h of picked) {
            if (h.originKind === "qa") {
                if (seenQa.has(h.originId)) continue
                seenQa.add(h.originId)
            }
            const o = origins.get(h.originId)
            numbered.push({
                n: numbered.length + 1,
                kind: h.originKind,
                originId: h.originId,
                title: o?.title ?? (h.heading || "Excerpt"),
                url: o?.url ?? null,
                fileName: o?.fileName ?? null,
                text: clip(h.text, ENGINE.sourceChars),
            })
        }
        const retrieved = numbered.slice(facts.length)
        const sourcesBlock = retrieved.length
            ? retrieved.map((s) => `[${s.n}] ${s.title}${s.url ? ` (${s.url})` : ""}\n${s.text}`).join("\n\n")
            : "(no website excerpts matched)"

        // Per-turn price rule (after the history, so the cached prefix stays frozen).
        const priceRule = !price
            ? ""
            : priceFact
                ? `For any price, fee or cost use ONLY the business fact "${priceFact.title}" [1], the owner's approved price list; ignore amounts in website excerpts. `
                : "The owner has not approved any prices: do not state any price, fee, cost or amount of money, even if an excerpt mentions one; for that part say it is not in the information you have. "
        const messages: LlmMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "system", content: profileBlock(bot, facts) },
            ...history.map((h) => ({ role: h.role, content: h.text.replace(/\[\d{1,2}\]/g, "").slice(0, 1200) })),
            {
                role: "user",
                content: `Website and file excerpts:\n${sourcesBlock}\n\nVisitor's question: ${question}\n\n${priceRule}${scriptInstruction(script)} Cite sources like [n]. If the answer is not in the facts or excerpts, reply exactly NOT_FOUND.`,
            },
        ]
        const maxTokens = MAX_TOKENS[bot.length as keyof typeof MAX_TOKENS] ?? MAX_TOKENS.balanced

        // Stream, holding back the first characters until we know it is not the NOT_FOUND sentinel.
        let held = ""
        let released = false
        // A price question with no approved prices is not streamed: a draft could show an amount the guard removes.
        const onDelta = input.onDelta && !(price && !priceFact)
            ? (d: string) => {
                if (released) return input.onDelta!(d)
                held += d
                if (held.trimStart().length >= 10) {
                    if (/^\s*NOT_?FOUND/i.test(held)) return
                    released = true
                    input.onDelta!(held)
                }
            }
            : null
        const gen = onDelta
            ? await streamComplete({ messages, maxTokens, temperature: 0.1, signal: input.signal }, onDelta)
            : await complete({ messages, maxTokens, temperature: 0.1, signal: input.signal })
        if (onDelta && !released && held && !/NOT_?FOUND/i.test(held)) input.onDelta!(held)
        const tokens = { input: gen.inputTokens, output: gen.outputTokens }
        retrieval.modelMs = gen.ms

        let raw = gen.text.trim()
        if (/^\W*NOT_?FOUND\W*$/i.test(raw) || /^NOT_?FOUND\b/i.test(raw)) return notFound(script, started, retrieval, tokens)

        // One regeneration in the right script (never for mixed: any mix is fine).
        if (ENGINE.scriptRetry && script !== "mixed" && !scriptMatches(script, raw.replace(/\[\d+\]/g, ""))) {
            retrieval.scriptRetried = true
            const again = await complete({
                messages: [...messages, { role: "assistant", content: raw }, { role: "user", content: `${scriptInstruction(script)} Rewrite your answer in that script. Keep the [n] citations.` }],
                maxTokens,
                temperature: 0.1,
                signal: input.signal,
            })
            tokens.input += again.inputTokens
            tokens.output += again.outputTokens
            retrieval.modelMs += again.ms
            if (again.text.trim() && !/NOT_?FOUND/i.test(again.text)) raw = again.text.trim()
        }
        raw = raw.replace(/\bNOT_?FOUND\b\.?/g, "").trim()
        if (isAbsence(raw, question, bot.name)) {
            retrieval.absence = true
            return notFound(script, started, retrieval, tokens)
        }

        // --- guards ------------------------------------------------------------------------------------------------
        const allowed = numbersOf([question, bot.name, ...numbered.map((s) => s.text)].join("\n"))
        const factNumbers = numbersOf(facts.map((f) => f.body).join("\n"))
        // A price question with no approved prices: no amount may be quoted at all (factNumbers empty for money, and
        // any sentence pairing a price word with a number goes too).
        const noPrices = price && !priceFact
        const strictMoney = factNumbers.size > 0 || noPrices
        const g = guardNumbers(raw, allowed, noPrices ? new Set<string>() : factNumbers, strictMoney, noPrices)
        retrieval.droppedSentences = g.dropped
        let text = g.text
        if (!text.replace(/\[\d+\]/g, "").trim()) return notFound(script, started, retrieval, tokens)
        if (g.dropped > 0) text = `${text} ${CONTACT_FOR_REST[script]}`

        const cites = mapCitations(text, numbered)
        retrieval.strippedCitations = cites.stripped
        text = cites.text
        // No citation at all: show the strongest source so the visitor can still check.
        const used = cites.used.length ? cites.used : numbered.slice(facts.length, facts.length + 1)
        const sources: JawafAnswerSource[] = used.map((s, i) => ({
            n: i + 1,
            kind: s.kind,
            title: s.title,
            url: s.url,
            fileName: s.fileName,
            snippet: clip(s.text.replace(/\s+/g, " "), 220),
        }))
        return { status: "answered", text, sources, answered: true, script, latencyMs: Date.now() - started, tokens, retrieval }
    } catch (err) {
        const offline = isAppError(err) && (err.kind === "network" || err.kind === "ratelimit")
        console.error("[jawaf] answer failed", err instanceof Error ? err.message : err)
        return {
            status: offline ? "offline" : "error",
            text: JAWAF_NOT_FOUND[script],
            sources: [],
            answered: false,
            script,
            latencyMs: Date.now() - started,
            tokens: { input: 0, output: 0 },
            retrieval,
        }
    }
}
