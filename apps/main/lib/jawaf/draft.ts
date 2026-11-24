import "server-only"
import { and, db, eq } from "@repo/db"
import { jawafFactSection, jawafQa } from "@repo/db/schema"
import { JAWAF_FACT_KEYS, JAWAF_FACT_TITLES, type JawafFactKey } from "@repo/boli/jawaf"
import type { BotRow } from "./bots"
import { completeJson } from "./llm"
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
        const r = await completeJson<{ found: boolean; rows: { item: string; price: string; notes: string }[] }>({
            messages: [
                { role: "system", content: COPY_SYSTEM },
                {
                    role: "user",
                    content: `Business: ${bot.name}\nTopic: ${title} - ${topic.hint}.\n\nWebsite text:\n---\n${ctx}\n---\n\nList every price or fee the text states, one row each: the item or plan, the price exactly as written (with its currency and period), and short notes. Only rows whose price is written in the text.`,
                },
            ],
            maxTokens: 900,
            temperature: 0,
            jsonSchema: {
                name: "prices",
                schema: {
                    type: "object",
                    properties: {
                        found: { type: "boolean" },
                        rows: {
                            type: "array",
                            maxItems: 30,
                            items: { type: "object", properties: { item: { type: "string" }, price: { type: "string" }, notes: { type: "string" } }, required: ["item", "price", "notes"] },
                        },
                    },
                    required: ["found", "rows"],
                },
            },
        })
        const rows = r.value.found ? r.value.rows : []
        const good = rows.filter((row) => /\d|[०-९]|free|निःशुल्क/i.test(row.price) && numbersOk(`${row.item} ${row.price} ${row.notes}`, allowed))
        const dropped = rows.length - good.length
        if (!good.length) return { step, saved: false, kept: 0, dropped, ms: Date.now() - started }
        const saved = await saveDraftSection(bot, "prices", "", { columns: ["Item", "Price", "Notes"], rows: good.map((g) => [g.item.trim(), g.price.trim(), g.notes.trim()]) })
        return { step, saved, kept: good.length, dropped, ms: Date.now() - started }
    }

    const r = await completeJson<{ found: boolean; lines: string[] }>({
        messages: [
            { role: "system", content: COPY_SYSTEM },
            {
                role: "user",
                content: `Business: ${bot.name}\nTopic: ${title} - ${topic.hint}.\n\nWebsite text:\n---\n${ctx}\n---\n\nWrite the "${title}" section as short plain lines, one fact per line, at most 8 lines, copied from the text.`,
            },
        ],
        maxTokens: 700,
        temperature: 0,
        jsonSchema: {
            name: "section",
            schema: {
                type: "object",
                properties: { found: { type: "boolean" }, lines: { type: "array", maxItems: 10, items: { type: "string" } } },
                required: ["found", "lines"],
            },
        },
    })
    const lines = r.value.found ? r.value.lines.map((l) => l.trim()).filter(Boolean) : []
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
    const r = await completeJson<{ faqs: { question: string; answer: string }[] }>({
        messages: [
            { role: "system", content: COPY_SYSTEM },
            {
                role: "user",
                content: `Business: ${bot.name}\n\nWebsite text:\n---\n${ctx}\n---\n\nWrite 5 to 10 questions a customer would ask this business, each with a short answer copied from the text. Only questions the text clearly answers.`,
            },
        ],
        maxTokens: 1400,
        temperature: 0,
        jsonSchema: {
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
    })
    const all = r.value.faqs.filter((f) => f.question.trim().length > 3 && f.answer.trim().length > 1)
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
