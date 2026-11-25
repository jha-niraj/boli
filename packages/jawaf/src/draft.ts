import { and, db, eq } from "@repo/db"
import { jawafFactSection, jawafQa } from "@repo/db/schema"
import { JAWAF_FACT_KEYS, JAWAF_FACT_TITLES, type JawafFactKey } from "@repo/boli/jawaf"
import type { BotRow } from "./bots"
import { AppError } from "@repo/errors"
import { completeJson, isNotJsonError, type LlmMessage } from "./llm"
import { searchChunks } from "./retrieve"
import { extractNumbers, textToHtml } from "./text"

/**
 * Draft the fact sheet for the Review step from the pages already read: About, Services, Prices and fees (a table),
 * Hours, Location and contact, Policies, plus 5-10 FAQs. One boli-chat call per section (each a job step, so a slice
 * stays short), JSON-schema constrained, in "copy, do not invent" mode:
 *
 * - The model sees only the excerpts retrieved for that topic and is told to copy, not write.
 * - Every line, price row and FAQ is checked in code: a number that is not in the excerpts drops that line / row / FAQ
 *   (prices are never invented - they can only be copied).
 * - Drafts are saved with approved = false (facts) / approved = false, source 'draft' (FAQs): they answer nothing until
 *   the owner approves them. A section the owner already approved is never overwritten.
 * - Robust to a small model: llama-server's JSON-schema grammar constrains the output; a reply that still is not JSON
 *   (fences, prose around it, cut off at max_tokens) is read by parseJsonReply; failing that, ONE retry with a stricter
 *   instruction and more room; failing that, the section is left empty with a note (DraftStepResult.note) and the
 *   other sections still draft - one bad section never fails the read.
 */

export const DRAFT_STEPS = ["about", "services", "prices", "hours", "location", "policies", "faqs"] as const
export type DraftStep = (typeof DRAFT_STEPS)[number]

const TOPIC: Record<Exclude<DraftStep, "faqs">, { hint: string; query: string }> = {
    about: { hint: "what the business is and does, who it serves, how long it has run", query: "about us who we are introduction what we do mission our story" },
    services: { hint: "the services, products, courses or features it offers", query: "services products courses programs features what we offer solutions" },
    prices: { hint: "prices, fees, plans and packages with their amounts", query: "price pricing fee fees cost plans packages per month per year rupees Rs NPR" },
    hours: { hint: "opening hours, office hours, days open and closed", query: "opening hours office hours timing open close days sunday friday time" },
    location: { hint: "address, phone numbers, email, how to reach or contact the business", query: "contact us address location phone email call reach office map" },
    policies: { hint: "rules and policies: refunds, cancellation, admission requirements, terms, privacy", query: "policy refund cancellation terms rules requirements eligibility privacy" },
}

const COPY_SYSTEM = `You copy facts from a business's own website text into a fact sheet. Use ONLY the text you are given. Never add anything that is not written there, never guess, never use outside knowledge. Copy numbers, prices, names, phone numbers and emails exactly as written. If the text says nothing about the topic, set "found" to false and return no lines.`

const STRICT_RETRY = "Your last reply could not be read. Reply again with ONLY one JSON object that matches the schema: no words before or after it, no code fences, no comments. Keep every value short. If the text does not cover the topic, reply with found set to false and an empty list."

/** "left empty" note shown on the job and logged. */
const EMPTY_NOTE = (title: string) => `${title}: left empty - Boli's model did not return a readable draft. Fill it in or draft again.`

/**
 * One JSON draft call with the fallbacks: parse (incl. repair), then one stricter retry with 1.5x the tokens. null =
 * still unreadable (the caller leaves the section empty). Outages (retryable AppError) are thrown for the job to retry.
 */
async function draftJson<T>(messages: LlmMessage[], maxTokens: number, jsonSchema: { name: string; schema: Record<string, unknown> }): Promise<T | null> {
    try {
        return (await completeJson<T>({ messages, maxTokens, temperature: 0, jsonSchema })).value
    } catch (err) {
        if (!isNotJsonError(err)) throw err
        console.warn("[jawaf] draft reply was not JSON, retrying stricter", jsonSchema.name, err instanceof AppError && err.cause instanceof Error ? err.cause.message : "")
    }
    try {
        const again = await completeJson<T>({
            messages: [...messages, { role: "user", content: STRICT_RETRY }],
            maxTokens: Math.round(maxTokens * 1.5),
            temperature: 0,
            jsonSchema,
        })
        return again.value
    } catch (err) {
        if (!isNotJsonError(err)) throw err
        console.warn("[jawaf] draft reply was not JSON after the retry; section left empty", jsonSchema.name)
        return null
    }
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const str = (v: unknown): string => (typeof v === "string" ? v : "")

const SORT: Record<JawafFactKey, number> = Object.fromEntries(JAWAF_FACT_KEYS.map((k, i) => [k, i])) as Record<JawafFactKey, number>

async function context(bot: BotRow, query: string, maxChars = 9000): Promise<string> {
    const found = await searchChunks({ botId: bot.id, texts: [query], kinds: ["page", "file"], k: 8 })
    let out = ""
    for (const h of found.hits) {
        const block = `${h.heading ? `## ${h.heading}\n` : ""}${h.text}\n\n`
        if (out.length + block.length > maxChars) break
        out += block
    }
    return out.trim()
}

function numbersOk(text: string, allowed: Set<string>): boolean {
    return extractNumbers(text).every((n) => allowed.has(n))
}

async function saveDraftSection(bot: BotRow, key: JawafFactKey, text: string, table: { columns: string[]; rows: string[][] } | null): Promise<boolean> {
    const [existing] = await db.select().from(jawafFactSection)
        .where(and(eq(jawafFactSection.botId, bot.id), eq(jawafFactSection.key, key))).limit(1)
    if (existing?.approved) return false
    const values = {
        title: JAWAF_FACT_TITLES[key],
        html: textToHtml(text),
        text,
        table,
        approved: false,
        drafted: true,
        sort: SORT[key],
        updatedAt: new Date(),
    }
    if (existing) await db.update(jawafFactSection).set(values).where(eq(jawafFactSection.id, existing.id))
    else await db.insert(jawafFactSection).values({ workspaceId: bot.workspaceId, botId: bot.id, key, ...values })
    return true
}

export interface DraftStepResult {
    step: DraftStep
    saved: boolean
    /** Lines / rows / FAQs kept and dropped by the number check. */
    kept: number
    dropped: number
    ms: number
    /** Set when the section was left empty because the model's reply could not be read. */
    note?: string
}

/** Run one drafting step for a bot. */
export async function runDraftStep(bot: BotRow, step: DraftStep): Promise<DraftStepResult> {
    const started = Date.now()
    if (step === "faqs") return draftFaqs(bot, started)
    const topic = TOPIC[step]
    const ctx = await context(bot, topic.query)
    if (!ctx) return { step, saved: false, kept: 0, dropped: 0, ms: Date.now() - started }
    const allowed = new Set(extractNumbers(ctx))
    const title = JAWAF_FACT_TITLES[step]

    if (step === "prices") {
        const r = await draftJson<{ found?: boolean; rows?: { item?: string; price?: string; notes?: string }[] }>(
            [
                { role: "system", content: COPY_SYSTEM },
                {
                    role: "user",
                    content: `Business: ${bot.name}\nTopic: ${title} - ${topic.hint}.\n\nWebsite text:\n---\n${ctx}\n---\n\nList every price or fee the text states, one row each: the item or plan, the price exactly as written (with its currency and period), and short notes (a few words, or empty). Only rows whose price is written in the text. At most 25 rows.`,
                },
            ],
            1400,
            {
                name: "prices",
                schema: {
                    type: "object",
                    properties: {
                        found: { type: "boolean" },
                        rows: {
                            type: "array",
                            maxItems: 25,
                            items: { type: "object", properties: { item: { type: "string" }, price: { type: "string" }, notes: { type: "string" } }, required: ["item", "price", "notes"] },
                        },
                    },
                    required: ["found", "rows"],
                },
            },
        )
        if (!r) return { step, saved: false, kept: 0, dropped: 0, ms: Date.now() - started, note: EMPTY_NOTE(title) }
        const rows = r.found === false ? [] : arr<{ item?: unknown; price?: unknown; notes?: unknown }>(r.rows).map((row) => ({ item: str(row?.item), price: str(row?.price), notes: str(row?.notes) }))
        const good = rows.filter((row) => row.item.trim() && /\d|[०-९]|free|निःशुल्क/i.test(row.price) && numbersOk(`${row.item} ${row.price} ${row.notes}`, allowed))
        const dropped = rows.length - good.length
        if (!good.length) return { step, saved: false, kept: 0, dropped, ms: Date.now() - started }
        const saved = await saveDraftSection(bot, "prices", "", { columns: ["Item", "Price", "Notes"], rows: good.map((g) => [g.item.trim(), g.price.trim(), g.notes.trim()]) })
        return { step, saved, kept: good.length, dropped, ms: Date.now() - started }
    }

    const r = await draftJson<{ found?: boolean; lines?: string[] }>(
        [
            { role: "system", content: COPY_SYSTEM },
            {
                role: "user",
                content: `Business: ${bot.name}\nTopic: ${title} - ${topic.hint}.\n\nWebsite text:\n---\n${ctx}\n---\n\nWrite the "${title}" section as short plain lines, one fact per line, at most 8 lines, copied from the text.`,
            },
        ],
        900,
        {
            name: "section",
            schema: {
                type: "object",
                properties: { found: { type: "boolean" }, lines: { type: "array", maxItems: 10, items: { type: "string" } } },
                required: ["found", "lines"],
            },
        },
    )
    if (!r) return { step, saved: false, kept: 0, dropped: 0, ms: Date.now() - started, note: EMPTY_NOTE(title) }
    const lines = r.found === false ? [] : arr<unknown>(r.lines).map((l) => str(l).trim()).filter(Boolean)
    const good = lines.filter((l) => numbersOk(l, allowed))
    const dropped = lines.length - good.length
    if (!good.length) return { step, saved: false, kept: 0, dropped, ms: Date.now() - started }
    const text = good.map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n")
    const saved = await saveDraftSection(bot, step, text, null)
    return { step, saved, kept: good.length, dropped, ms: Date.now() - started }
}

async function draftFaqs(bot: BotRow, started: number): Promise<DraftStepResult> {
    const ctx = await context(bot, "frequently asked questions FAQ how does it work what is included who can price contact", 10_000)
    if (!ctx) return { step: "faqs", saved: false, kept: 0, dropped: 0, ms: Date.now() - started }
    const allowed = new Set(extractNumbers(ctx))
    const r = await draftJson<{ faqs?: { question?: string; answer?: string }[] }>(
        [
            { role: "system", content: COPY_SYSTEM },
            {
                role: "user",
                content: `Business: ${bot.name}\n\nWebsite text:\n---\n${ctx}\n---\n\nWrite 5 to 10 questions a customer would ask this business, each with a short answer copied from the text. Only questions the text clearly answers.`,
            },
        ],
        1600,
        {
            name: "faqs",
            schema: {
                type: "object",
                properties: {
                    faqs: {
                        type: "array",
                        maxItems: 10,
                        items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] },
                    },
                },
                required: ["faqs"],
            },
        },
    )
    // Unreadable: keep the earlier drafts (if any) rather than deleting them for nothing.
    if (!r) return { step: "faqs", saved: false, kept: 0, dropped: 0, ms: Date.now() - started, note: EMPTY_NOTE("Common questions") }
    const all = arr<{ question?: unknown; answer?: unknown }>(r.faqs).map((f) => ({ question: str(f?.question), answer: str(f?.answer) }))
        .filter((f) => f.question.trim().length > 3 && f.answer.trim().length > 1)
    const good = all.filter((f) => numbersOk(`${f.question} ${f.answer}`, allowed))
    // Replace the previous drafts that are still waiting for review.
    await db.delete(jawafQa).where(and(eq(jawafQa.botId, bot.id), eq(jawafQa.source, "draft"), eq(jawafQa.approved, false)))
    if (good.length) {
        await db.insert(jawafQa).values(good.map((f) => ({
            workspaceId: bot.workspaceId,
            botId: bot.id,
            question: f.question.trim().slice(0, 1000),
            phrasings: [],
            answer: f.answer.trim().slice(0, 4000),
            source: "draft" as const,
            approved: false,
        })))
    }
    return { step: "faqs", saved: good.length > 0, kept: good.length, dropped: all.length - good.length, ms: Date.now() - started }
}
