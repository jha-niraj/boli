import "server-only"
import { and, asc, count, countDistinct, db, desc, eq, inArray, sql } from "@repo/db"
import { jawafChunk, jawafFactSection, jawafNote, jawafPage, jawafQa, jawafSource } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { JAWAF_LIMITS, type JawafFactKey, type JawafNoteKind, type JawafQaSource } from "@repo/boli/jawaf"
import type {
    JawafBotCounts, JawafCsvImportResult, JawafFactSection, JawafMapResult, JawafNote, JawafPageView, JawafQa, JawafSourceView, JawafTable,
} from "@/types/jawaf"
import { botLimits, type BotRow } from "./bots"
import { mapAndStoreSitePages } from "@repo/jawaf/map"
import { jobs } from "@/lib/jobs"
import { mapSiteJob } from "./jobs"
import { indexFact, indexNote, indexQa, unindex } from "./indexer"
import { htmlToText, urlKey } from "./text"

/**
 * Knowledge writes and reads for one bot (every query filters by bot id; the caller has already loaded the bot through
 * `loadBot(workspaceId, botId)`, which checked the workspace). Writes to facts, Q&A and notes are indexed in the same
 * call (auto-apply: searchable within seconds).
 */

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

function asTable(v: unknown): JawafTable | null {
    if (!v || typeof v !== "object") return null
    const o = v as { columns?: unknown; rows?: unknown }
    if (!Array.isArray(o.columns) || !Array.isArray(o.rows)) return null
    return { columns: o.columns.map((c) => String(c ?? "")), rows: o.rows.filter(Array.isArray).map((r) => (r as unknown[]).map((c) => String(c ?? ""))) }
}

// ---------------------------------------------------------------------------------------------------------------------
// Pages and sources
// ---------------------------------------------------------------------------------------------------------------------

type PageRow = typeof jawafPage.$inferSelect

export function toPageView(p: PageRow): JawafPageView {
    return {
        id: p.id,
        sourceId: p.sourceId,
        url: p.url,
        title: p.title,
        status: p.status === "excluded" ? "excluded" : "included",
        readStatus: (["pending", "read", "failed", "removed"].includes(p.readStatus) ? p.readStatus : "pending") as JawafPageView["readStatus"],
        change: (["new", "changed", "removed"].includes(p.change ?? "") ? p.change : null) as JawafPageView["change"],
        chars: p.chars,
        error: p.error,
        lastReadAt: iso(p.lastReadAt),
        suggested: p.suggested,
        disagreesWithFacts: p.disagreesWithFacts,
    }
}

/**
 * Map the bot's website and store every page found (useful ones pre-ticked up to the page limit, the rest excluded).
 * Re-mapping keeps the owner's earlier choices and read state for pages already known.
 */
export async function mapAndStoreSite(bot: BotRow, url: string, userId: string | null): Promise<JawafMapResult> {
    // JOBS_RUNNER=workflow: the map runs as a `map` Workflow (waited for); local: inline, as before.
    if (jobs.runner() === "workflow") {
        const m = await mapSiteJob(bot, url, userId)
        const pages = await db.select().from(jawafPage).where(eq(jawafPage.sourceId, m.sourceId)).orderBy(asc(jawafPage.rank))
        return { sourceId: m.sourceId, pages: pages.map(toPageView), included: m.included, dropped: m.dropped }
    }
    const m = await mapAndStoreSitePages(bot, url, userId)
    return { sourceId: m.sourceId, pages: m.pages.map(toPageView), included: m.included, dropped: m.dropped }
}

/** Tick / untick pages. Including past the bot's limit throws AppError('validation'). Excluding drops their chunks. */
export async function setPagesIncluded(bot: BotRow, pageIds: string[], included: boolean): Promise<number> {
    if (included) {
        const limit = botLimits(bot).pagesPerBot
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jawafPage)
            .where(and(eq(jawafPage.botId, bot.id), sql`(${jawafPage.status} = 'included' OR ${jawafPage.id} IN ${pageIds})`))
        if (Number(n) > limit) throw new AppError("validation", `A bot can read up to ${limit} pages. Untick some first.`)
    }
    const rows = await db.update(jawafPage).set({ status: included ? "included" : "excluded", updatedAt: new Date() })
        .where(and(eq(jawafPage.botId, bot.id), inArray(jawafPage.id, pageIds))).returning({ id: jawafPage.id, url: jawafPage.url })
    if (!included) {
        await unindex(bot.id, "page", rows.map((r) => r.id))
        // A page excluded and later included again is re-read (its chunks are gone).
        await db.update(jawafPage).set({ readStatus: "pending", contentHash: null }).where(and(eq(jawafPage.botId, bot.id), inArray(jawafPage.id, rows.map((r) => r.id))))
    }
    return rows.length
}

/** Add one URL (its own 'url' source); included and pending. Returns the page. */
export async function addUrl(bot: BotRow, url: string, userId: string | null): Promise<JawafPageView> {
    const key = urlKey(url)
    if (!key) throw new AppError("validation", "That is not a web address.")
    const limit = botLimits(bot).pagesPerBot
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included")))
    if (Number(n) >= limit) throw new AppError("validation", `A bot can read up to ${limit} pages. Untick some first.`)
    const [existing] = await db.select().from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.urlKey, key))).limit(1)
    if (existing) {
        const [row] = await db.update(jawafPage).set({ status: "included", readStatus: existing.readStatus === "read" ? "read" : "pending", updatedAt: new Date() }).where(eq(jawafPage.id, existing.id)).returning()
        return toPageView(row ?? existing)
    }
    const [src] = await db.insert(jawafSource).values({ workspaceId: bot.workspaceId, botId: bot.id, kind: "url", url, status: "queued", pagesFound: 1, createdById: userId }).returning()
    const [row] = await db.insert(jawafPage).values({ workspaceId: bot.workspaceId, botId: bot.id, sourceId: src!.id, url, urlKey: key, status: "included", readStatus: "pending", suggested: true }).returning()
    return toPageView(row!)
}

export async function listPages(botId: string, opts: { sourceId?: string; filter?: "all" | "included" | "excluded" | "changed" | "failed" }): Promise<JawafPageView[]> {
    const conds = [eq(jawafPage.botId, botId), sql`${jawafPage.url} IS NOT NULL`]
    if (opts.sourceId) conds.push(eq(jawafPage.sourceId, opts.sourceId))
    if (opts.filter === "included") conds.push(eq(jawafPage.status, "included"))
    if (opts.filter === "excluded") conds.push(eq(jawafPage.status, "excluded"))
    if (opts.filter === "changed") conds.push(sql`${jawafPage.change} IS NOT NULL`)
    if (opts.filter === "failed") conds.push(eq(jawafPage.readStatus, "failed"))
    const rows = await db.select().from(jawafPage).where(and(...conds)).orderBy(asc(jawafPage.status), asc(jawafPage.rank)).limit(1000)
    return rows.map(toPageView)
}

export async function listSources(botId: string, kinds?: ("site" | "url" | "file" | "qa_csv")[]): Promise<JawafSourceView[]> {
    const rows = await db.select({
        s: jawafSource,
        total: count(jawafPage.id),
        included: sql<number>`count(*) FILTER (WHERE ${jawafPage.status} = 'included')`,
        read: sql<number>`count(*) FILTER (WHERE ${jawafPage.readStatus} = 'read')`,
    }).from(jawafSource).leftJoin(jawafPage, eq(jawafPage.sourceId, jawafSource.id))
        .where(and(eq(jawafSource.botId, botId), kinds?.length ? inArray(jawafSource.kind, kinds) : sql`true`))
        .groupBy(jawafSource.id).orderBy(desc(jawafSource.createdAt))
    return rows.map(({ s, total, included, read }) => ({
        id: s.id,
        kind: s.kind as JawafSourceView["kind"],
        url: s.url,
        fileName: s.fileName,
        fileSize: s.fileSize,
        mimeType: s.mimeType,
        status: s.status as JawafSourceView["status"],
        error: s.error,
        pagesTotal: Math.max(Number(total), s.pagesFound),
        pagesIncluded: Number(included),
        pagesRead: Number(read),
        filePages: s.filePages,
        lastReadAt: iso(s.lastReadAt),
        nextReadAt: iso(s.nextReadAt),
        createdAt: s.createdAt.toISOString(),
    }))
}

/** Delete a source with its pages and chunks (FK cascade for pages; chunks by source id). Returns the R2 key to delete. */
export async function deleteSource(bot: BotRow, sourceId: string): Promise<{ fileKey: string | null }> {
    const [src] = await db.select().from(jawafSource).where(and(eq(jawafSource.id, sourceId), eq(jawafSource.botId, bot.id))).limit(1)
    if (!src) throw new AppError("notfound", "That source could not be found.")
    await db.batch([
        db.delete(jawafChunk).where(and(eq(jawafChunk.botId, bot.id), eq(jawafChunk.sourceId, sourceId))),
        db.delete(jawafSource).where(eq(jawafSource.id, sourceId)),
    ])
    return { fileKey: src.fileKey }
}

export async function countFiles(botId: string): Promise<number> {
    const [r] = await db.select({ n: count() }).from(jawafSource).where(and(eq(jawafSource.botId, botId), eq(jawafSource.kind, "file")))
    return Number(r?.n ?? 0)
}

// ---------------------------------------------------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------------------------------------------------

type FactRow = typeof jawafFactSection.$inferSelect

export function toFactView(f: FactRow): JawafFactSection {
    return {
        id: f.id,
        key: f.key as JawafFactKey,
        title: f.title,
        html: f.html,
        text: f.text,
        table: asTable(f.table),
        approved: f.approved,
        drafted: f.drafted,
        sort: f.sort,
        updatedAt: f.updatedAt.toISOString(),
    }
}

export async function listFacts(botId: string): Promise<JawafFactSection[]> {
    const rows = await db.select().from(jawafFactSection).where(eq(jawafFactSection.botId, botId)).orderBy(asc(jawafFactSection.sort), asc(jawafFactSection.createdAt))
    return rows.map(toFactView)
}

export async function saveFact(bot: BotRow, input: { id?: string; key: JawafFactKey; title: string; html: string; table: JawafTable | null; approved: boolean }): Promise<JawafFactSection> {
    const values = { key: input.key, title: input.title, html: input.html, text: htmlToText(input.html), table: input.table, approved: input.approved, drafted: false, updatedAt: new Date() }
    let row: FactRow | undefined
    if (input.id) {
        ;[row] = await db.update(jawafFactSection).set(values).where(and(eq(jawafFactSection.id, input.id), eq(jawafFactSection.botId, bot.id))).returning()
        if (!row) throw new AppError("notfound", "That section could not be found.")
    } else {
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jawafFactSection).where(eq(jawafFactSection.botId, bot.id))
        ;[row] = await db.insert(jawafFactSection).values({ workspaceId: bot.workspaceId, botId: bot.id, sort: Number(n), ...values }).returning()
    }
    await indexFact(row!)
    return toFactView(row!)
}

/** Approve drafted sections (one, or every draft when `ids` is empty) and index them. */
export async function approveFacts(bot: BotRow, ids: string[]): Promise<number> {
    const rows = await db.update(jawafFactSection).set({ approved: true, updatedAt: new Date() })
        .where(and(eq(jawafFactSection.botId, bot.id), eq(jawafFactSection.approved, false), ids.length ? inArray(jawafFactSection.id, ids) : sql`true`)).returning()
    for (const r of rows) await indexFact(r)
    return rows.length
}

export async function deleteFact(bot: BotRow, id: string): Promise<void> {
    const rows = await db.delete(jawafFactSection).where(and(eq(jawafFactSection.id, id), eq(jawafFactSection.botId, bot.id))).returning({ id: jawafFactSection.id })
    if (!rows.length) throw new AppError("notfound", "That section could not be found.")
    await unindex(bot.id, "fact", [id])
}

// ---------------------------------------------------------------------------------------------------------------------
// Q&A
// ---------------------------------------------------------------------------------------------------------------------

type QaRow = typeof jawafQa.$inferSelect

export function toQaView(q: QaRow): JawafQa {
    return {
        id: q.id,
        question: q.question,
        phrasings: q.phrasings,
        answer: q.answer,
        source: q.source as JawafQaSource,
        approved: q.approved,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
    }
}

export async function listQa(botId: string): Promise<JawafQa[]> {
    const rows = await db.select().from(jawafQa).where(eq(jawafQa.botId, botId)).orderBy(desc(jawafQa.updatedAt)).limit(JAWAF_LIMITS.qaPerBot)
    return rows.map(toQaView)
}

export async function saveQa(bot: BotRow, input: { id?: string; question: string; phrasings: string[]; answer: string; approved: boolean; source?: JawafQaSource; sourceMessageId?: string | null; userId?: string | null }): Promise<JawafQa> {
    const phrasings = [...new Set(input.phrasings.map((p) => p.trim()).filter((p) => p && p !== input.question.trim()))].slice(0, JAWAF_LIMITS.phrasingsPerQa)
    let row: QaRow | undefined
    if (input.id) {
        ;[row] = await db.update(jawafQa).set({ question: input.question, phrasings, answer: input.answer, approved: input.approved, updatedAt: new Date() })
            .where(and(eq(jawafQa.id, input.id), eq(jawafQa.botId, bot.id))).returning()
        if (!row) throw new AppError("notfound", "That question could not be found.")
    } else {
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jawafQa).where(eq(jawafQa.botId, bot.id))
        if (Number(n) >= JAWAF_LIMITS.qaPerBot) throw new AppError("validation", `A bot can hold up to ${JAWAF_LIMITS.qaPerBot} questions.`)
        ;[row] = await db.insert(jawafQa).values({
            workspaceId: bot.workspaceId, botId: bot.id, question: input.question, phrasings, answer: input.answer, approved: input.approved,
            source: input.source ?? "owner", sourceMessageId: input.sourceMessageId ?? null, createdById: input.userId ?? null,
        }).returning()
    }
    await indexQa(row!)
    return toQaView(row!)
}

export async function deleteQa(bot: BotRow, id: string): Promise<void> {
    const rows = await db.delete(jawafQa).where(and(eq(jawafQa.id, id), eq(jawafQa.botId, bot.id))).returning({ id: jawafQa.id })
    if (!rows.length) throw new AppError("notfound", "That question could not be found.")
    await unindex(bot.id, "qa", [id])
}

export async function approveQa(bot: BotRow, ids: string[]): Promise<number> {
    const rows = await db.update(jawafQa).set({ approved: true, updatedAt: new Date() })
        .where(and(eq(jawafQa.botId, bot.id), eq(jawafQa.approved, false), ids.length ? inArray(jawafQa.id, ids) : sql`true`)).returning()
    for (const r of rows) await indexQa(r)
    return rows.length
}

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, commas and new lines inside quotes). */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let quoted = false
    for (let i = 0; i < text.length; i++) {
        const c = text[i]!
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
            else cell += c
            continue
        }
        if (c === '"') quoted = true
        else if (c === ",") { row.push(cell); cell = "" } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++
            row.push(cell); cell = ""
            if (row.some((x) => x.trim())) rows.push(row)
            row = []
        } else cell += c
    }
    row.push(cell)
    if (row.some((x) => x.trim())) rows.push(row)
    return rows
}

/** question,answer[,phrasings separated by ;] - a header row ("question") is skipped. Each pair is indexed. */
export async function importQaCsv(bot: BotRow, csv: string, userId: string | null): Promise<JawafCsvImportResult> {
    const rows = parseCsv(csv.replace(/^﻿/, ""))
    const problems: string[] = []
    let added = 0
    let skipped = 0
    const start = rows[0] && /question|prashna|प्रश्न/i.test(rows[0][0] ?? "") ? 1 : 0
    for (let i = start; i < rows.length; i++) {
        const [q, a, p] = rows[i]!.map((x) => x.trim())
        if (!q || !a) {
            skipped++
            if (problems.length < 10) problems.push(`Row ${i + 1}: ${!q ? "no question" : "no answer"}`)
            continue
        }
        try {
            await saveQa(bot, { question: q.slice(0, JAWAF_LIMITS.questionChars), answer: a.slice(0, JAWAF_LIMITS.answerChars), phrasings: (p ?? "").split(";").map((x) => x.trim()).filter(Boolean), approved: true, source: "import", userId })
            added++
        } catch (err) {
            skipped++
            if (problems.length < 10) problems.push(`Row ${i + 1}: ${err instanceof AppError ? err.userMessage : "could not be saved"}`)
            if (err instanceof AppError && err.kind === "validation") break
        }
    }
    await db.insert(jawafSource).values({ workspaceId: bot.workspaceId, botId: bot.id, kind: "qa_csv", status: "ready", pagesFound: added, createdById: userId, fileName: "Q&A import" })
    return { added, skipped, problems }
}

// ---------------------------------------------------------------------------------------------------------------------
// Notes and tables
// ---------------------------------------------------------------------------------------------------------------------

type NoteRow = typeof jawafNote.$inferSelect

export function toNoteView(n: NoteRow): JawafNote {
    return { id: n.id, kind: n.kind === "table" ? "table" : "note", title: n.title, html: n.html, text: n.text, table: asTable(n.table), updatedAt: n.updatedAt.toISOString() }
}

export async function listNotes(botId: string): Promise<JawafNote[]> {
    const rows = await db.select().from(jawafNote).where(eq(jawafNote.botId, botId)).orderBy(desc(jawafNote.updatedAt)).limit(JAWAF_LIMITS.notesPerBot)
    return rows.map(toNoteView)
}

export async function saveNote(bot: BotRow, input: { id?: string; kind: JawafNoteKind; title: string; html: string; table: JawafTable | null; userId?: string | null }): Promise<JawafNote> {
    const values = { kind: input.kind, title: input.title, html: input.html, text: htmlToText(input.html), table: input.table, updatedAt: new Date() }
    let row: NoteRow | undefined
    if (input.id) {
        ;[row] = await db.update(jawafNote).set(values).where(and(eq(jawafNote.id, input.id), eq(jawafNote.botId, bot.id))).returning()
        if (!row) throw new AppError("notfound", "That note could not be found.")
    } else {
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jawafNote).where(eq(jawafNote.botId, bot.id))
        if (Number(n) >= JAWAF_LIMITS.notesPerBot) throw new AppError("validation", `A bot can hold up to ${JAWAF_LIMITS.notesPerBot} notes.`)
        ;[row] = await db.insert(jawafNote).values({ workspaceId: bot.workspaceId, botId: bot.id, createdById: input.userId ?? null, ...values }).returning()
    }
    await indexNote(row!)
    return toNoteView(row!)
}

export async function deleteNote(bot: BotRow, id: string): Promise<void> {
    const rows = await db.delete(jawafNote).where(and(eq(jawafNote.id, id), eq(jawafNote.botId, bot.id))).returning({ id: jawafNote.id })
    if (!rows.length) throw new AppError("notfound", "That note could not be found.")
    await unindex(bot.id, "note", [id])
}

// ---------------------------------------------------------------------------------------------------------------------
// Counts (Home / setup checklist) - one batch
// ---------------------------------------------------------------------------------------------------------------------

export async function botCounts(botId: string): Promise<JawafBotCounts> {
    const [pages, files, facts, qa, notes, chunks] = await db.batch([
        db.select({
            included: sql<number>`count(*) FILTER (WHERE ${jawafPage.status} = 'included' AND ${jawafPage.url} IS NOT NULL)`,
            read: sql<number>`count(*) FILTER (WHERE ${jawafPage.readStatus} = 'read' AND ${jawafPage.url} IS NOT NULL)`,
        }).from(jawafPage).where(eq(jawafPage.botId, botId)),
        db.select({ n: count() }).from(jawafSource).where(and(eq(jawafSource.botId, botId), eq(jawafSource.kind, "file"))),
        db.select({
            n: count(),
            approved: sql<number>`count(*) FILTER (WHERE ${jawafFactSection.approved})`,
            draft: sql<number>`count(*) FILTER (WHERE NOT ${jawafFactSection.approved})`,
        }).from(jawafFactSection).where(eq(jawafFactSection.botId, botId)),
        db.select({ n: count() }).from(jawafQa).where(eq(jawafQa.botId, botId)),
        db.select({ n: count() }).from(jawafNote).where(eq(jawafNote.botId, botId)),
        db.select({ n: countDistinct(jawafChunk.id) }).from(jawafChunk).where(eq(jawafChunk.botId, botId)),
    ])
    return {
        pagesIncluded: Number(pages[0]?.included ?? 0),
        pagesRead: Number(pages[0]?.read ?? 0),
        files: Number(files[0]?.n ?? 0),
        facts: Number(facts[0]?.n ?? 0),
        factsApproved: Number(facts[0]?.approved ?? 0),
        factsDraft: Number(facts[0]?.draft ?? 0),
        qa: Number(qa[0]?.n ?? 0),
        notes: Number(notes[0]?.n ?? 0),
        chunks: Number(chunks[0]?.n ?? 0),
    }
}
