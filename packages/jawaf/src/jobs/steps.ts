import { and, asc, count, db, eq, inArray, sql } from "@repo/db"
import { jawafBot, jawafFactSection, jawafPage, jawafSource } from "@repo/db/schema"
import { AppError, isAppError } from "@repo/errors"
import { firecrawlScrape } from "@repo/webdata"
import { extractPdfText } from "@repo/pdf"
import { digitiseOutput, digitiseStatus, docxToText, submitDigitise, DOC_MAX_PAGES } from "@repo/sarvamai"
import { getObject } from "@repo/storage"
import { JAWAF_FACT_TITLES, JAWAF_LIMITS, JAWAF_TEXT_CHARS_PER_PAGE, type JawafJobKind } from "@repo/boli/jawaf"
import type { JawafJobProgress } from "../types"
import type { BotRow } from "../bots"
import { DRAFT_STEPS, runDraftStep, type DraftStep } from "../draft"
import { evalQuestions, type EvalQuestionInput, type EvalRow } from "../eval"
import { indexOrigin, pagePieces, unindex } from "../indexer"
import { mapAndStoreSitePages } from "../map"
import { billFilePages, billPageRead, botHasFreePages, canSpendOnIngest } from "../meter"
import { cleanMarkdown, extractNumbers, sha256Hex } from "../text"
import type { JobRow } from "./rows"

/**
 * THE job steps, written once. A step is a plain async function: (job row, bot, cursor) -> the next cursor + progress
 * (+ done / failed / waitMs). It reads everything it needs from the database and the cursor, and every write is
 * idempotent (pages carry read_status and a content hash; billing keys are per page / file; index writes replace an
 * origin's chunks), so a step that dies half-way - or a Workflow step.do that is retried - is simply run again.
 *
 * Two runners call these (./runner.ts): the local slice runner (tick route + hourly cron, many steps per slice) and the
 * Workflow runner in apps/jobs (one step per step.do). Neither runner knows what a step does.
 *
 *   read     pages: 3 pending pages per step (scrape -> hash -> chunk -> embed -> bill) | draft: 1 of 7 fact sections
 *            per step (first read only) | finish: sources ready, next weekly re-read set, setup moves to review
 *   file     extract (R2 -> text) or ocr-submit (Sarvam) | ocr: poll (waitMs while Sarvam works) then fetch | index
 *   draft    1 of 7 fact sections per step
 *   reindex  5 read pages re-chunked and re-embedded per step
 *   map      the site map (Firecrawl map + robots.txt) stored as pages, one step
 *   eval     3 quality-check questions per step, rows kept in the cursor
 */

export interface StepOutcome {
    cursor: object
    progress: JawafJobProgress
    done?: boolean
    failed?: { error: string; code?: "credits" | "limit" | "provider" | null }
    /** Nothing to do until later (Sarvam is still reading): the local runner pauses 2 s, a Workflow sleeps this long. */
    waitMs?: number
}

export const PAGES_PER_STEP = 3
const SCRAPE_TIMEOUT_MS = 20_000
const REINDEX_PER_STEP = 5
const EVAL_PER_STEP = 3
const OCR_POLL_MS = 5_000
/** A section whose model call fails for an outage is tried this many times (with a growing wait), then left empty. */
const DRAFT_MAX_TRIES = 4
const DRAFT_RETRY_MS = 15_000

/** Drafting progress, shared by the read job's draft phase and the draft job. */
export interface DraftProgressCursor {
    draftStep?: number
    /** Retryable failures (boli-chat down) of the CURRENT section; reset when it moves on. */
    draftTries?: number
    /** Epoch ms before which the current section is not tried again (a backoff both runners honour). */
    retryAt?: number
    /** Sections left empty, one plain sentence each (shown with the job, logged). */
    draftNotes?: string[]
}
export interface ReadCursor extends DraftProgressCursor {
    phase?: "pages" | "draft" | "finish"
    draft?: boolean
    total?: number
}
export interface FileCursor {
    phase?: "extract" | "ocr" | "index" | "finish"
    sarvamJobId?: string
    text?: string
    pages?: number
}
export type DraftCursor = DraftProgressCursor
export interface ReindexCursor {
    afterId?: string
    total?: number
    done?: number
}
export interface MapCursor {
    url?: string
    userId?: string | null
    sourceId?: string
    included?: number
    dropped?: number
}
export interface EvalCursor {
    questions?: EvalQuestionInput[]
    offset?: number
    rows?: EvalRow[]
}

export function runStep(job: JobRow, bot: BotRow, cursor: object): Promise<StepOutcome> {
    switch (job.kind as JawafJobKind) {
        case "read":
            return readStep(bot, cursor as ReadCursor)
        case "file":
            return fileStep(job, bot, cursor as FileCursor)
        case "draft":
            return draftOnlyStep(bot, cursor as DraftCursor)
        case "reindex":
            return reindexStep(bot, cursor as ReindexCursor)
        case "map":
            return mapStep(bot, cursor as MapCursor)
        case "eval":
            return evalStep(bot, cursor as EvalCursor)
        default:
            return Promise.resolve({ cursor, progress: { done: 0, total: 0, label: "Unknown job" }, failed: { error: `Unknown job kind ${job.kind}` } })
    }
}

/** A short name for the step a cursor is about to run (Workflow step names; logs). Deterministic from the cursor. */
export function describeNextStep(kind: string, cursor: object): string {
    const c = cursor as Record<string, unknown>
    if (kind === "read") {
        const phase = (c.phase as string | undefined) ?? "pages"
        if (phase === "draft") return `draft ${Number(c.draftStep ?? 0) + 1} of ${DRAFT_STEPS.length}`
        return phase === "pages" ? "read pages" : "finish"
    }
    if (kind === "file") {
        const phase = (c.phase as string | undefined) ?? "extract"
        return phase === "extract" ? "extract or submit to Sarvam" : phase === "ocr" ? "Sarvam poll / fetch" : phase === "index" ? "chunk + embed" : "finish"
    }
    if (kind === "draft") return `draft ${Number(c.draftStep ?? 0) + 1} of ${DRAFT_STEPS.length}`
    if (kind === "reindex") return "re-index pages"
    if (kind === "map") return "map site"
    if (kind === "eval") return `eval from ${Number(c.offset ?? 0) + 1}`
    return kind
}

// ---------------------------------------------------------------------------------------------------------------------
// read: the bot's included pages that are pending -> scrape -> hash -> chunk -> embed; then draft facts; then finish
// ---------------------------------------------------------------------------------------------------------------------

async function pendingPages(botId: string, limit: number) {
    return db.select().from(jawafPage)
        .where(and(eq(jawafPage.botId, botId), eq(jawafPage.status, "included"), eq(jawafPage.readStatus, "pending")))
        .orderBy(asc(jawafPage.rank)).limit(limit)
}

async function countPending(botId: string): Promise<number> {
    const [r] = await db.select({ n: count() }).from(jawafPage)
        .where(and(eq(jawafPage.botId, botId), eq(jawafPage.status, "included"), eq(jawafPage.readStatus, "pending")))
    return Number(r?.n ?? 0)
}

/** Currency amounts on a page that the approved Prices and fees do not have ("Website disagrees"). */
async function approvedPriceNumbers(botId: string): Promise<Set<string> | null> {
    const [f] = await db.select().from(jawafFactSection)
        .where(and(eq(jawafFactSection.botId, botId), eq(jawafFactSection.key, "prices"), eq(jawafFactSection.approved, true))).limit(1)
    if (!f) return null
    return new Set(extractNumbers(`${f.text}\n${JSON.stringify(f.table ?? "")}`))
}

const MONEY = /(?:rs\.?|npr|रु\.?|रू\.?)\s*[\d०-९][\d०-९,]*(?:\.\d+)?/gi

function disagrees(markdown: string, prices: Set<string> | null): boolean {
    if (!prices || prices.size === 0) return false
    for (const m of markdown.matchAll(MONEY)) {
        const n = extractNumbers(m[0])[0]
        if (n && !prices.has(n)) return true
    }
    return false
}

async function readOnePage(bot: BotRow, page: typeof jawafPage.$inferSelect, prices: Set<string> | null): Promise<"read" | "failed" | "removed" | "credits"> {
    if (!page.url) {
        await db.update(jawafPage).set({ readStatus: "failed", error: "No address", updatedAt: new Date() }).where(eq(jawafPage.id, page.id))
        return "failed"
    }
    if (!page.billed && !(await botHasFreePages(bot.id)) && !(await canSpendOnIngest(bot.workspaceId))) return "credits"
    let res
    try {
        res = await firecrawlScrape(page.url, { onlyMainContent: true, pdfMaxPages: 5, timeoutMs: SCRAPE_TIMEOUT_MS })
    } catch (err) {
        const msg = isAppError(err) ? err.userMessage : "Could not read this page."
        // Rate limits and outages leave the page pending for the next slice.
        if (isAppError(err) && (err.kind === "ratelimit" || err.kind === "network")) throw err
        await db.update(jawafPage).set({ readStatus: "failed", error: msg.slice(0, 300), updatedAt: new Date() }).where(eq(jawafPage.id, page.id))
        return "failed"
    }
    if (res.statusCode === 404 || res.statusCode === 410) {
        await unindex(bot.id, "page", [page.id])
        await db.update(jawafPage).set({ readStatus: "removed", change: "removed", error: null, lastReadAt: new Date(), updatedAt: new Date() }).where(eq(jawafPage.id, page.id))
        return "removed"
    }
    const markdown = cleanMarkdown(res.markdown).slice(0, 200_000)
    const hash = await sha256Hex(markdown)
    const title = (res.title ?? page.title ?? "").trim().slice(0, 300) || null
    if (page.contentHash === hash) {
        await db.update(jawafPage).set({ readStatus: "read", change: null, error: null, title, lastReadAt: new Date(), updatedAt: new Date() }).where(eq(jawafPage.id, page.id))
        return "read"
    }
    const change = page.contentHash ? "changed" : "new"
    await indexOrigin({ workspaceId: bot.workspaceId, botId: bot.id, kind: "page", originId: page.id, sourceId: page.sourceId }, pagePieces(markdown, title))
    await db.update(jawafPage).set({
        readStatus: "read",
        change,
        error: null,
        title,
        markdown,
        contentHash: hash,
        chars: markdown.length,
        disagreesWithFacts: disagrees(markdown, prices),
        lastReadAt: new Date(),
        updatedAt: new Date(),
    }).where(eq(jawafPage.id, page.id))
    await billPageRead(page)
    return "read"
}

async function readStep(bot: BotRow, c: ReadCursor): Promise<StepOutcome> {
    const phase = c.phase ?? "pages"
    if (phase === "pages") {
        const total = c.total ?? (await countPending(bot.id))
        const batch = await pendingPages(bot.id, PAGES_PER_STEP)
        if (!batch.length) {
            const next: ReadCursor = { ...c, total, phase: c.draft ? "draft" : "finish", draftStep: 0 }
            return { cursor: next, progress: { done: total, total, label: c.draft ? "Drafting your fact sheet" : "Finishing" } }
        }
        const prices = await approvedPriceNumbers(bot.id)
        const results = await Promise.all(batch.map((p) => readOnePage(bot, p, prices)))
        if (results.includes("credits")) {
            return { cursor: { ...c, total }, progress: { done: total - (await countPending(bot.id)), total, label: "Stopped: out of credits" }, failed: { error: "Out of credits. Add credits to read more pages.", code: "credits" } }
        }
        const left = await countPending(bot.id)
        return { cursor: { ...c, total, phase: "pages" }, progress: { done: Math.max(0, total - left), total, label: `Reading ${Math.max(0, total - left)} of ${total} pages` } }
    }
    if (phase === "draft") {
        const out = await draftOneSection(bot, c)
        if (out.allDone) return { cursor: { ...out.cursor, phase: "finish" }, progress: { ...out.progress, label: "Finishing" } }
        return { cursor: out.cursor, progress: out.progress, waitMs: out.waitMs }
    }
    // finish: sources read, weekly re-read scheduled, setup moves on.
    const now = new Date()
    const next = new Date(now.getTime() + JAWAF_LIMITS.rereadDays * 86_400_000)
    await db.batch([
        db.update(jawafSource).set({ status: "ready", error: null, lastReadAt: now, nextReadAt: next, updatedAt: now })
            .where(and(eq(jawafSource.botId, bot.id), inArray(jawafSource.kind, ["site", "url"]))),
        db.update(jawafBot).set({ setupStep: sql`CASE WHEN ${jawafBot.setupStep} IN ('pages', 'reading') THEN 'review' ELSE ${jawafBot.setupStep} END`, updatedAt: now })
            .where(eq(jawafBot.id, bot.id)),
    ])
    const total = c.total ?? 0
    return { cursor: c, progress: { done: total, total, label: "Done" }, done: true }
}

// ---------------------------------------------------------------------------------------------------------------------
// file: R2 -> text (txt / md / docx / PDF text layer) or Sarvam OCR (scans, images) -> one jawaf_page -> chunks; bill
// ---------------------------------------------------------------------------------------------------------------------

const TEXT_TYPES = new Set(["text/plain", "text/markdown"])

/** Text of a file's bytes that needs no OCR, or null when it needs OCR (images, scanned PDFs). */
export async function extractFileText(bytes: Uint8Array, mimeType: string): Promise<{ text: string; pages: number } | null> {
    if (TEXT_TYPES.has(mimeType)) {
        const text = new TextDecoder().decode(bytes)
        return { text, pages: Math.max(1, Math.ceil(text.length / JAWAF_TEXT_CHARS_PER_PAGE)) }
    }
    if (mimeType.includes("wordprocessingml")) {
        const text = docxToText(bytes)
        return { text, pages: Math.max(1, Math.ceil(text.length / JAWAF_TEXT_CHARS_PER_PAGE)) }
    }
    if (mimeType === "application/pdf") {
        const pdf = await extractPdfText(bytes)
        if (!pdf.looksScanned) return { text: pdf.pages.map((p, i) => `## Page ${i + 1}\n\n${p}`).join("\n\n"), pages: pdf.totalPages }
        if (pdf.totalPages > DOC_MAX_PAGES) {
            throw new AppError("validation", `This scanned PDF has ${pdf.totalPages} pages; scans can be at most ${DOC_MAX_PAGES} pages. Split it and upload the parts.`)
        }
        return null
    }
    return null
}

async function fileStep(job: JobRow, bot: BotRow, c: FileCursor): Promise<StepOutcome> {
    const [src] = job.sourceId ? await db.select().from(jawafSource).where(and(eq(jawafSource.id, job.sourceId), eq(jawafSource.botId, bot.id))).limit(1) : []
    if (!src || !src.fileKey) return { cursor: c, progress: { done: 0, total: 3, label: "File missing" }, failed: { error: "The file could not be found." } }
    const phase = c.phase ?? "extract"
    const fail = async (error: string, code: "credits" | "limit" | "provider" | null = null): Promise<StepOutcome> => {
        await db.update(jawafSource).set({ status: "failed", error, updatedAt: new Date() }).where(eq(jawafSource.id, src.id))
        return { cursor: c, progress: { done: 0, total: 3, label: "Could not read the file" }, failed: { error, code } }
    }
    if (phase === "extract") {
        if (!(await canSpendOnIngest(bot.workspaceId))) return fail("Out of credits. Add credits to read files.", "credits")
        await db.update(jawafSource).set({ status: "reading", updatedAt: new Date() }).where(eq(jawafSource.id, src.id))
        const file = await getObject(src.fileKey)
        if (!file) return fail("The uploaded file was not found. Upload it again.")
        let got: { text: string; pages: number } | null
        try {
            got = await extractFileText(file.body, src.mimeType ?? "")
        } catch (err) {
            return fail(isAppError(err) ? err.userMessage : "That file could not be read.")
        }
        if (got) return { cursor: { phase: "index", text: got.text, pages: got.pages }, progress: { done: 1, total: 3, label: "Indexing the file" } }
        // Sarvam submit. A retry after a lost response submits again (one extra Sarvam job, nothing stored twice).
        const { jobId } = await submitDigitise({ bytes: file.body, fileName: src.fileName ?? "document", language: "ne-IN", outputFormat: "md" })
        return { cursor: { phase: "ocr", sarvamJobId: jobId }, progress: { done: 1, total: 3, label: "Reading the scan" } }
    }
    if (phase === "ocr") {
        // Sarvam poll, then fetch: both reads, safe to repeat.
        const st = await digitiseStatus(c.sarvamJobId!)
        if (!st.finished) {
            return { cursor: c, progress: { done: 1, total: 3, label: `Reading the scan${st.pagesTotal ? ` (${st.pagesProcessed} of ${st.pagesTotal} pages)` : ""}` }, waitMs: OCR_POLL_MS }
        }
        if (!st.succeeded) return fail("The scan could not be read. Try a clearer copy.", "provider")
        const out = await digitiseOutput(c.sarvamJobId!, "md")
        return { cursor: { phase: "index", text: out.text, pages: Math.max(1, st.pagesProcessed || st.pagesTotal) }, progress: { done: 2, total: 3, label: "Indexing the file" } }
    }
    if (phase === "index") {
        const text = cleanMarkdown(c.text ?? "")
        if (!text.trim()) return fail("No text was found in this file.")
        const title = src.fileName ?? "File"
        const [existing] = await db.select().from(jawafPage).where(and(eq(jawafPage.sourceId, src.id), eq(jawafPage.botId, bot.id))).limit(1)
        const hash = await sha256Hex(text)
        const pageId = existing?.id ?? crypto.randomUUID()
        if (!existing) {
            await db.insert(jawafPage).values({ id: pageId, workspaceId: bot.workspaceId, botId: bot.id, sourceId: src.id, title, status: "included", readStatus: "pending" })
        }
        await indexOrigin({ workspaceId: bot.workspaceId, botId: bot.id, kind: "file", originId: pageId, sourceId: src.id }, pagePieces(text, title))
        const now = new Date()
        await db.batch([
            db.update(jawafPage).set({ markdown: text.slice(0, 500_000), contentHash: hash, chars: text.length, readStatus: "read", change: existing ? "changed" : "new", lastReadAt: now, updatedAt: now }).where(eq(jawafPage.id, pageId)),
            db.update(jawafSource).set({ status: "ready", error: null, filePages: c.pages ?? 1, lastReadAt: now, updatedAt: now }).where(eq(jawafSource.id, src.id)),
        ])
        await billFilePages(bot.workspaceId, src.id, c.pages ?? 1)
        return { cursor: { phase: "finish", pages: c.pages }, progress: { done: 3, total: 3, label: "Done" }, done: true }
    }
    return { cursor: c, progress: { done: 3, total: 3, label: "Done" }, done: true }
}

// ---------------------------------------------------------------------------------------------------------------------
// draft (re-draft on demand) and reindex (re-embed stored text, e.g. after a chunker change)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Draft the next fact section. NEVER fails the job: a reply that cannot be read leaves that section empty with a note
 * (draft.ts), any other non-outage error does the same, and an outage (boli-chat down) is retried DRAFT_MAX_TRIES times
 * with a growing wait (cursor.retryAt, honoured by both runners) before the section is left empty too. A read that
 * failed here used to end without its finish step and left the setup stuck at "reading".
 */
async function draftOneSection<C extends DraftProgressCursor>(bot: BotRow, c: C): Promise<{ cursor: C; progress: JawafJobProgress; allDone: boolean; waitMs?: number }> {
    const i = c.draftStep ?? 0
    const total = DRAFT_STEPS.length
    if (i >= total) return { cursor: c, progress: { done: total, total, label: "Done" }, allDone: true }
    const label = `Drafting your fact sheet (${i + 1} of ${total})`
    if (c.retryAt && Date.now() < c.retryAt) {
        return { cursor: c, progress: { done: i, total, label: `${label} - waiting for Boli's model` }, allDone: false, waitMs: c.retryAt - Date.now() }
    }
    const step = DRAFT_STEPS[i] as DraftStep
    let note: string | undefined
    try {
        note = (await runDraftStep(bot, step)).note
    } catch (err) {
        const retryable = isAppError(err) && err.retryable
        const tries = (c.draftTries ?? 0) + 1
        console.error("[jawaf] draft section failed", step, `try ${tries}`, err instanceof Error ? err.message : err)
        if (retryable && tries < DRAFT_MAX_TRIES) {
            const wait = DRAFT_RETRY_MS * tries
            return { cursor: { ...c, draftTries: tries, retryAt: Date.now() + wait }, progress: { done: i, total, label: `${label} (retrying)` }, allDone: false, waitMs: wait }
        }
        note = `${DRAFT_TITLE[step]}: left empty - ${retryable ? "Boli's model did not answer" : "it could not be drafted"}. Fill it in or draft again.`
    }
    const notes = note ? [...(c.draftNotes ?? []), note] : c.draftNotes
    const next: C = { ...c, draftStep: i + 1, draftTries: 0, retryAt: undefined, ...(notes ? { draftNotes: notes } : {}) }
    const done = i + 1 >= total
    return { cursor: next, progress: { done: i + 1, total, label: done ? "Done" : `Drafting your fact sheet (${i + 2} of ${total})` }, allDone: done }
}

const DRAFT_TITLE: Record<DraftStep, string> = { ...JAWAF_FACT_TITLES, faqs: "Common questions" } as Record<DraftStep, string>

async function draftOnlyStep(bot: BotRow, c: DraftCursor): Promise<StepOutcome> {
    const out = await draftOneSection(bot, c)
    return { cursor: out.cursor, progress: out.progress, waitMs: out.waitMs, done: out.allDone }
}

async function reindexStep(bot: BotRow, c: ReindexCursor): Promise<StepOutcome> {
    const total = c.total ?? Number((await db.select({ n: count() }).from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.readStatus, "read"))))[0]?.n ?? 0)
    const batch = await db.select().from(jawafPage)
        .where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.readStatus, "read"), c.afterId ? sql`${jawafPage.id} > ${c.afterId}` : sql`true`))
        .orderBy(asc(jawafPage.id)).limit(REINDEX_PER_STEP)
    if (!batch.length) return { cursor: c, progress: { done: total, total, label: "Done" }, done: true }
    for (const p of batch) {
        if (!p.markdown) continue
        const kind = p.url ? "page" : "file"
        await indexOrigin({ workspaceId: bot.workspaceId, botId: bot.id, kind, originId: p.id, sourceId: p.sourceId }, pagePieces(p.markdown, p.title))
    }
    const done = (c.done ?? 0) + batch.length
    return { cursor: { afterId: batch[batch.length - 1]!.id, total, done }, progress: { done, total, label: `Re-indexing ${done} of ${total}` } }
}

// ---------------------------------------------------------------------------------------------------------------------
// map (site map as a job) and eval (quality check as a job)
// ---------------------------------------------------------------------------------------------------------------------

async function mapStep(bot: BotRow, c: MapCursor): Promise<StepOutcome> {
    if (!c.url) return { cursor: c, progress: { done: 0, total: 1, label: "No website" }, failed: { error: "Enter a website address." } }
    const m = await mapAndStoreSitePages(bot, c.url, c.userId ?? null)
    return { cursor: { ...c, sourceId: m.sourceId, included: m.included, dropped: m.dropped }, progress: { done: 1, total: 1, label: "Done" }, done: true }
}

async function evalStep(bot: BotRow, c: EvalCursor): Promise<StepOutcome> {
    const questions = c.questions ?? []
    const offset = c.offset ?? 0
    const total = questions.length
    if (offset >= total) return { cursor: c, progress: { done: total, total, label: "Done" }, done: true }
    const rows = await evalQuestions(bot, questions.slice(offset, offset + EVAL_PER_STEP))
    const next = Math.min(total, offset + EVAL_PER_STEP)
    return { cursor: { ...c, offset: next, rows: [...(c.rows ?? []), ...rows] }, progress: { done: next, total, label: next >= total ? "Done" : `Checking ${next} of ${total}` }, done: next >= total }
}
