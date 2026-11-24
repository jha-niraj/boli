import "server-only"
import { and, asc, count, db, eq, inArray, isNull, lt, or, sql } from "@repo/db"
import { jawafBot, jawafFactSection, jawafJob, jawafPage, jawafSource } from "@repo/db/schema"
import { AppError, isAppError } from "@repo/errors"
import { firecrawlScrape } from "@repo/webdata"
import { extractPdfText } from "@repo/pdf"
import { digitiseOutput, digitiseStatus, docxToText, submitDigitise, DOC_MAX_PAGES } from "@repo/sarvamai"
import { getObject } from "@repo/storage"
import { JAWAF_LIMITS, JAWAF_TEXT_CHARS_PER_PAGE, type JawafJobKind, type JawafJobStatus } from "@repo/boli/jawaf"
import type { JawafJobProgress, JawafJobView } from "@/types/jawaf"
import { loadBot, type BotRow } from "./bots"
import { DRAFT_STEPS, runDraftStep, type DraftStep } from "./draft"
import { indexOrigin, pagePieces, unindex } from "./indexer"
import { billFilePages, billPageRead, botHasFreePages, canSpendOnIngest } from "./meter"
import { cleanMarkdown, extractNumbers, sha256Hex } from "./text"

/**
 * Jawaf's long jobs (AGENTS.md section 5: a site read takes minutes and must survive a closed tab).
 *
 * WHY NOT A CLOUDFLARE WORKFLOW: the repo has no Workflow / Queue yet (packages/cron says "a job that can run for
 * minutes belongs in a Workflow", but none exists), `next dev` cannot run one, and a Workflow binding would be a new
 * deploy surface for the owner. So a job is a RESUMABLE ROW (jawaf_job: status, progress, cursor, lease) advanced in
 * SLICES of < ~25 s by two drivers:
 *   1. the page's poll: `POST /api/jawaf/jobs/<id>/tick` (lib/jawaf/routes.ts) runs one slice and returns progress
 *      (a route, not a server action: Next runs a client's actions one at a time, so a 20 s action would freeze every
 *      other action on the page);
 *   2. the hourly cron job `jawaf-jobs` (lib/jawaf/cron.ts) runs slices for any job nobody is polling (tab closed) and
 *      queues the weekly re-reads.
 * The lease (`lease_until`, claimed by one conditional UPDATE) makes two drivers never run one job at once; a crashed
 * slice's lease simply expires (60 s). Each step is idempotent (pages carry read_status; billing keys are per page /
 * file), so a step that dies half-way is redone safely. Moving to a Workflow later = calling `runSlice` from its steps.
 */

export type JobRow = typeof jawafJob.$inferSelect

/** A slice stops starting new steps after this long (a step itself is bounded: 3 scrapes, or one model call). */
export const SLICE_BUDGET_MS = 12_000
const LEASE_SECONDS = 60
const PAGES_PER_STEP = 3
const SCRAPE_TIMEOUT_MS = 20_000

interface ReadCursor {
    phase?: "pages" | "draft" | "finish"
    draft?: boolean
    draftStep?: number
    total?: number
}
interface FileCursor {
    phase?: "extract" | "ocr" | "index" | "finish"
    sarvamJobId?: string
    text?: string
    pages?: number
}
interface DraftCursor {
    draftStep?: number
}
interface ReindexCursor {
    afterId?: string
    total?: number
    done?: number
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

export function toJobView(j: JobRow): JawafJobView {
    const p = obj(j.progress)
    const progress: JawafJobProgress = {
        done: typeof p.done === "number" ? p.done : 0,
        total: typeof p.total === "number" ? p.total : 0,
        label: typeof p.label === "string" ? p.label : "Waiting to start",
    }
    const code = j.errorCode === "credits" || j.errorCode === "limit" || j.errorCode === "provider" ? j.errorCode : null
    return {
        id: j.id,
        botId: j.botId,
        kind: j.kind as JawafJobKind,
        status: j.status as JawafJobStatus,
        progress,
        error: j.error,
        errorCode: code,
        createdAt: j.createdAt.toISOString(),
        startedAt: j.startedAt?.toISOString() ?? null,
        finishedAt: j.finishedAt?.toISOString() ?? null,
    }
}

/**
 * Queue a job, or return the one already active for (bot, kind, source) - the partial unique index makes "Train now"
 * pressed twice one job.
 */
export async function enqueueJob(input: { workspaceId: string; botId: string; kind: JawafJobKind; sourceId?: string | null; createdById?: string | null; cursor?: object; label?: string }): Promise<JobRow> {
    const inserted = await db.insert(jawafJob).values({
        workspaceId: input.workspaceId,
        botId: input.botId,
        kind: input.kind,
        sourceId: input.sourceId ?? null,
        createdById: input.createdById ?? null,
        cursor: input.cursor ?? {},
        progress: { done: 0, total: 0, label: input.label ?? "Waiting to start" },
    }).onConflictDoNothing().returning()
    if (inserted[0]) return inserted[0]
    const [active] = await db.select().from(jawafJob).where(and(
        eq(jawafJob.botId, input.botId),
        eq(jawafJob.kind, input.kind),
        input.sourceId ? eq(jawafJob.sourceId, input.sourceId) : isNull(jawafJob.sourceId),
        inArray(jawafJob.status, ["queued", "running"]),
    )).limit(1)
    if (!active) throw new AppError("conflict", "That job could not be started. Try again.")
    return active
}

export async function loadJob(workspaceId: string, jobId: string): Promise<JobRow> {
    const [j] = await db.select().from(jawafJob).where(and(eq(jawafJob.id, jobId), eq(jawafJob.workspaceId, workspaceId))).limit(1)
    if (!j) throw new AppError("notfound", "That job could not be found.")
    return j
}

/** The newest job of a bot that is still running (for the Knowledge page's progress bar). */
export async function activeJobFor(botId: string): Promise<JobRow | null> {
    const [j] = await db.select().from(jawafJob)
        .where(and(eq(jawafJob.botId, botId), inArray(jawafJob.status, ["queued", "running"])))
        .orderBy(asc(jawafJob.createdAt)).limit(1)
    return j ?? null
}

async function claim(jobId: string): Promise<JobRow | null> {
    const rows = await db.update(jawafJob)
        .set({
            leaseUntil: sql`now() + make_interval(secs => ${LEASE_SECONDS})`,
            status: "running",
            startedAt: sql`coalesce(${jawafJob.startedAt}, now())`,
            slices: sql`${jawafJob.slices} + 1`,
            updatedAt: new Date(),
        })
        .where(and(eq(jawafJob.id, jobId), inArray(jawafJob.status, ["queued", "running"]), or(isNull(jawafJob.leaseUntil), lt(jawafJob.leaseUntil, sql`now()`))))
        .returning()
    return rows[0] ?? null
}

interface StepOutcome {
    cursor: object
    progress: JawafJobProgress
    done?: boolean
    failed?: { error: string; code?: "credits" | "limit" | "provider" | null }
}

/**
 * Run one slice of a job: claim the lease, run steps until SLICE_BUDGET_MS, save progress after every step, release.
 * Returns the job as it stands (unchanged when someone else holds the lease or it already finished).
 */
export async function runSlice(jobId: string, budgetMs = SLICE_BUDGET_MS): Promise<JobRow> {
    const job = await claim(jobId)
    if (!job) {
        const [current] = await db.select().from(jawafJob).where(eq(jawafJob.id, jobId)).limit(1)
        if (!current) throw new AppError("notfound", "That job could not be found.")
        return current
    }
    const deadline = Date.now() + budgetMs
    let cursor: object = obj(job.cursor)
    let progress = toJobView(job).progress
    let bot: BotRow
    try {
        bot = await loadBot(job.workspaceId, job.botId)
    } catch {
        return finish(job.id, "cancelled", { error: "The bot was deleted.", progress, cursor })
    }
    try {
        for (;;) {
            const out = await step(job, bot, cursor)
            cursor = out.cursor
            progress = out.progress
            if (out.failed) return finish(job.id, "failed", { error: out.failed.error, code: out.failed.code ?? null, progress, cursor })
            if (out.done) return finish(job.id, "done", { progress, cursor })
            await db.update(jawafJob).set({ cursor, progress, updatedAt: new Date() }).where(eq(jawafJob.id, job.id))
            if (Date.now() >= deadline) break
        }
    } catch (err) {
        // A provider outage leaves the job running; the next slice retries. Anything else fails it with a plain line.
        const retryable = isAppError(err) && err.retryable
        console.error("[jawaf] job slice failed", job.kind, err instanceof Error ? err.message : err)
        if (!retryable) {
            return finish(job.id, "failed", { error: isAppError(err) ? err.userMessage : "Something went wrong while reading. Try again.", code: "provider", progress, cursor })
        }
        progress = { ...progress, label: `${progress.label} (retrying)` }
    }
    const [released] = await db.update(jawafJob).set({ leaseUntil: null, cursor, progress, updatedAt: new Date() }).where(eq(jawafJob.id, job.id)).returning()
    return released ?? job
}

async function finish(jobId: string, status: JawafJobStatus, o: { error?: string; code?: string | null; progress: JawafJobProgress; cursor: object }): Promise<JobRow> {
    const label = status === "done" ? "Done" : status === "cancelled" ? "Stopped" : o.progress.label
    const [row] = await db.update(jawafJob).set({
        status,
        error: o.error ?? null,
        errorCode: o.code ?? null,
        progress: { ...o.progress, label },
        cursor: o.cursor,
        leaseUntil: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
    }).where(eq(jawafJob.id, jobId)).returning()
    if (!row) throw new AppError("notfound", "That job could not be found.")
    return row
}

function step(job: JobRow, bot: BotRow, cursor: object): Promise<StepOutcome> {
    switch (job.kind) {
        case "read":
            return readStep(job, bot, cursor as ReadCursor)
        case "file":
            return fileStep(job, bot, cursor as FileCursor)
        case "draft":
            return draftOnlyStep(bot, cursor as DraftCursor)
        case "reindex":
            return reindexStep(bot, cursor as ReindexCursor)
        default:
            return Promise.resolve({ cursor, progress: { done: 0, total: 0, label: "Unknown job" }, failed: { error: `Unknown job kind ${job.kind}` } })
    }
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

async function readStep(job: JobRow, bot: BotRow, c: ReadCursor): Promise<StepOutcome> {
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
        const i = c.draftStep ?? 0
        const total = DRAFT_STEPS.length
        if (i >= total) return { cursor: { ...c, phase: "finish" }, progress: { done: total, total, label: "Finishing" } }
        await runDraftStep(bot, DRAFT_STEPS[i] as DraftStep)
        return { cursor: { ...c, draftStep: i + 1 }, progress: { done: i + 1, total, label: `Drafting your fact sheet (${i + 1} of ${total})` } }
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

/**
 * Start reading a bot's included pages. `reread`: every included page goes back to pending (Train now / weekly);
 * unchanged pages are then skipped by their hash. `draft`: draft the fact sheet afterwards (first read).
 */
export async function startRead(bot: BotRow, opts: { reread?: boolean; draft?: boolean; createdById?: string | null } = {}): Promise<JobRow> {
    if (opts.reread) {
        await db.update(jawafPage).set({ readStatus: "pending", updatedAt: new Date() })
            .where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included"), inArray(jawafPage.readStatus, ["read", "failed"]), sql`${jawafPage.url} IS NOT NULL`))
    }
    await db.update(jawafSource).set({ status: "reading", updatedAt: new Date() }).where(and(eq(jawafSource.botId, bot.id), inArray(jawafSource.kind, ["site", "url"])))
    return enqueueJob({ workspaceId: bot.workspaceId, botId: bot.id, kind: "read", createdById: opts.createdById, cursor: { draft: Boolean(opts.draft) }, label: "Starting to read" })
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
        const obj = await getObject(src.fileKey)
        if (!obj) return fail("The uploaded file was not found. Upload it again.")
        let got: { text: string; pages: number } | null
        try {
            got = await extractFileText(obj.body, src.mimeType ?? "")
        } catch (err) {
            return fail(isAppError(err) ? err.userMessage : "That file could not be read.")
        }
        if (got) return { cursor: { phase: "index", text: got.text, pages: got.pages }, progress: { done: 1, total: 3, label: "Indexing the file" } }
        const { jobId } = await submitDigitise({ bytes: obj.body, fileName: src.fileName ?? "document", language: "ne-IN", outputFormat: "md" })
        return { cursor: { phase: "ocr", sarvamJobId: jobId }, progress: { done: 1, total: 3, label: "Reading the scan" } }
    }
    if (phase === "ocr") {
        const st = await digitiseStatus(c.sarvamJobId!)
        if (!st.finished) {
            // Nothing to do yet; end this slice so the poll comes back later.
            await new Promise((r) => setTimeout(r, 2000))
            return { cursor: c, progress: { done: 1, total: 3, label: `Reading the scan${st.pagesTotal ? ` (${st.pagesProcessed} of ${st.pagesTotal} pages)` : ""}` } }
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

async function draftOnlyStep(bot: BotRow, c: DraftCursor): Promise<StepOutcome> {
    const i = c.draftStep ?? 0
    const total = DRAFT_STEPS.length
    if (i >= total) return { cursor: c, progress: { done: total, total, label: "Done" }, done: true }
    await runDraftStep(bot, DRAFT_STEPS[i] as DraftStep)
    const done = i + 1 >= total
    return { cursor: { draftStep: i + 1 }, progress: { done: i + 1, total, label: done ? "Done" : `Drafting your fact sheet (${i + 1} of ${total})` }, done }
}

async function reindexStep(bot: BotRow, c: ReindexCursor): Promise<StepOutcome> {
    const total = c.total ?? Number((await db.select({ n: count() }).from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.readStatus, "read"))))[0]?.n ?? 0)
    const batch = await db.select().from(jawafPage)
        .where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.readStatus, "read"), c.afterId ? sql`${jawafPage.id} > ${c.afterId}` : sql`true`))
        .orderBy(asc(jawafPage.id)).limit(5)
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
// Drivers for the cron
// ---------------------------------------------------------------------------------------------------------------------

/** Run slices for jobs nobody holds (oldest first) until `budgetMs` is used. Returns how many slices ran. */
export async function runDueJobs(budgetMs: number): Promise<{ slices: number; finished: number }> {
    const deadline = Date.now() + budgetMs
    let slices = 0
    let finished = 0
    const due = await db.select({ id: jawafJob.id }).from(jawafJob)
        .where(and(inArray(jawafJob.status, ["queued", "running"]), or(isNull(jawafJob.leaseUntil), lt(jawafJob.leaseUntil, sql`now()`))))
        .orderBy(asc(jawafJob.updatedAt)).limit(20)
    for (const j of due) {
        if (Date.now() >= deadline) break
        const after = await runSlice(j.id, Math.min(SLICE_BUDGET_MS, Math.max(2000, deadline - Date.now())))
        slices++
        if (after.status !== "queued" && after.status !== "running") finished++
    }
    return { slices, finished }
}

/** Queue the weekly re-read for every bot whose site source is due (re-reads never charge; unchanged pages are skipped). */
export async function queueWeeklyRereads(now: Date): Promise<number> {
    const due = await db.selectDistinct({ botId: jawafSource.botId, workspaceId: jawafSource.workspaceId }).from(jawafSource)
        .where(and(inArray(jawafSource.kind, ["site", "url"]), lt(jawafSource.nextReadAt, now))).limit(50)
    let queued = 0
    for (const d of due) {
        const bot = await loadBot(d.workspaceId, d.botId).catch(() => null)
        if (!bot) continue
        await db.update(jawafSource).set({ nextReadAt: new Date(now.getTime() + JAWAF_LIMITS.rereadDays * 86_400_000) })
            .where(and(eq(jawafSource.botId, bot.id), inArray(jawafSource.kind, ["site", "url"])))
        await startRead(bot, { reread: true })
        queued++
    }
    return queued
}
