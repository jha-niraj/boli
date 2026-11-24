"use server"

/**
 * Jawaf knowledge sources: map the website, tick pages, add a URL, start reading, Train now, job progress (read only -
 * the page's poll that ADVANCES a job is POST /api/jawaf/jobs/<id>/tick), files (upload ticket -> finish -> read job),
 * list / delete sources, re-draft the fact sheet. Session + Jawaf level checked in every export; ActionResult always.
 */
import { requireSession } from "@repo/auth/next"
import { db, eq } from "@repo/db"
import { jawafBot, jawafSource } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { deleteFile, generateKey, getUploadUrl, isStorageConfigured, objectExists } from "@repo/storage"
import { botLimits, loadBot } from "@/lib/jawaf/bots"
import { activeJobFor, enqueueJob, loadJob, startRead, toJobView } from "@/lib/jawaf/jobs"
import { addUrl, countFiles, deleteSource, listPages, listSources, mapAndStoreSite, setPagesIncluded } from "@/lib/jawaf/knowledge"
import { requireWorkspaceAccess } from "@/lib/workspace"
import {
    addJawafUrlSchema, finishJawafUploadSchema, jawafBotItemSchema, jawafIdSchema, listJawafPagesSchema, mapJawafSiteSchema, setJawafPagesSchema,
    startJawafUploadSchema, type AddJawafUrlInput, type FinishJawafUploadInput, type JawafBotItemInput, type ListJawafPagesInput, type MapJawafSiteInput,
    type SetJawafPagesInput, type StartJawafUploadInput,
} from "@/schemas/jawaf"
import type { JawafJobView, JawafMapResult, JawafPageView, JawafSourceView, JawafUploadTicket } from "@/types/jawaf"

const badBot = () => failWith("validation", "That bot could not be found.")

/** Map the website (a few seconds; Firecrawl map + robots.txt) and store the pages, useful ones pre-ticked. */
export async function mapJawafSite(input: MapJawafSiteInput): Promise<ActionResult<JawafMapResult>> {
    try {
        const session = await requireSession()
        const parsed = mapJawafSiteSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Enter a website address.")
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, parsed.data.botId)
        return ok(await mapAndStoreSite(bot, parsed.data.url, session.user.id))
    } catch (err) {
        return fail(err, "jawaf.knowledge.map")
    }
}

/** Tick or untick pages (the bot's page limit applies). */
export async function setJawafPagesIncluded(input: SetJawafPagesInput): Promise<ActionResult<{ changed: number }>> {
    try {
        await requireSession()
        const parsed = setJawafPagesSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "Choose at least one page.")
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, parsed.data.botId)
        return ok({ changed: await setPagesIncluded(bot, parsed.data.pageIds, parsed.data.included) })
    } catch (err) {
        return fail(err, "jawaf.knowledge.setPages")
    }
}

/** Add one page by address and start reading it. */
export async function addJawafUrl(input: AddJawafUrlInput): Promise<ActionResult<{ page: JawafPageView; job: JawafJobView }>> {
    try {
        const session = await requireSession()
        const parsed = addJawafUrlSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Enter a web address.")
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, parsed.data.botId)
        const page = await addUrl(bot, parsed.data.url, session.user.id)
        const job = await startRead(bot, { createdById: session.user.id })
        return ok({ page, job: toJobView(job) })
    } catch (err) {
        return fail(err, "jawaf.knowledge.addUrl")
    }
}

export async function listJawafPages(input: ListJawafPagesInput): Promise<ActionResult<JawafPageView[]>> {
    try {
        await requireSession()
        const parsed = listJawafPagesSchema.safeParse(input)
        if (!parsed.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, parsed.data.botId)
        return ok(await listPages(bot.id, { sourceId: parsed.data.sourceId, filter: parsed.data.filter }))
    } catch (err) {
        return fail(err, "jawaf.knowledge.pages")
    }
}

/** Website sources and added URLs (files have their own list). */
export async function listJawafSources(botId: string): Promise<ActionResult<JawafSourceView[]>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, id.data)
        return ok(await listSources(bot.id, ["site", "url", "qa_csv"]))
    } catch (err) {
        return fail(err, "jawaf.knowledge.sources")
    }
}

/**
 * Read the ticked pages in the background (first read: drafts the fact sheet afterwards). Returns the job; the page
 * polls POST /api/jawaf/jobs/<id>/tick until it is done.
 */
export async function startJawafReading(botId: string): Promise<ActionResult<JawafJobView>> {
    try {
        const session = await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, id.data)
        const firstRead = bot.setupStep === "business" || bot.setupStep === "pages" || bot.setupStep === "reading"
        const job = await startRead(bot, { draft: firstRead, createdById: session.user.id })
        if (firstRead) await db.update(jawafBot).set({ setupStep: "reading", updatedAt: new Date() }).where(eq(jawafBot.id, bot.id))
        return ok(toJobView(job))
    } catch (err) {
        return fail(err, "jawaf.knowledge.read")
    }
}

/** Train now: re-read every ticked page (unchanged pages are skipped by their hash; re-reads never charge). */
export async function trainJawafNow(botId: string): Promise<ActionResult<JawafJobView>> {
    try {
        const session = await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, id.data)
        return ok(toJobView(await startRead(bot, { reread: true, createdById: session.user.id })))
    } catch (err) {
        return fail(err, "jawaf.knowledge.train")
    }
}

/** Draft the fact sheet again from the pages already read (approved sections are kept). */
export async function redraftJawafFacts(botId: string): Promise<ActionResult<JawafJobView>> {
    try {
        const session = await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, id.data)
        return ok(toJobView(await enqueueJob({ workspaceId: ws.id, botId: bot.id, kind: "draft", createdById: session.user.id, label: "Drafting your fact sheet" })))
    } catch (err) {
        return fail(err, "jawaf.knowledge.redraft")
    }
}

/** A job's progress (read only). */
export async function getJawafJob(jobId: string): Promise<ActionResult<JawafJobView>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(jobId)
        if (!id.success) return failWith("validation", "That job could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        return ok(toJobView(await loadJob(ws.id, id.data)))
    } catch (err) {
        return fail(err, "jawaf.knowledge.job")
    }
}

/** The bot's running job, if any (the Knowledge page resumes its progress bar on load). */
export async function getActiveJawafJob(botId: string): Promise<ActionResult<JawafJobView | null>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, id.data)
        const job = await activeJobFor(bot.id)
        return ok(job ? toJobView(job) : null)
    } catch (err) {
        return fail(err, "jawaf.knowledge.activeJob")
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Files: ticket (presigned PUT straight to R2) -> the browser uploads -> finish (source row + read job)
// ---------------------------------------------------------------------------------------------------------------------

export async function startJawafFileUpload(input: StartJawafUploadInput): Promise<ActionResult<JawafUploadTicket>> {
    try {
        await requireSession()
        const parsed = startJawafUploadSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "That file cannot be uploaded.")
        if (!isStorageConfigured()) return failWith("unknown", "File uploads are not set up on this server (R2 storage is not configured).")
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, parsed.data.botId)
        const limits = botLimits(bot)
        if (parsed.data.size > limits.fileMaxBytes) return failWith("validation", `Files can be up to ${Math.round(limits.fileMaxBytes / 1024 / 1024)} MB.`)
        if ((await countFiles(bot.id)) >= limits.filesPerBot) return failWith("validation", `A bot can hold up to ${limits.filesPerBot} files. Delete one first.`)
        const key = generateKey("jawaf", ws.id, parsed.data.fileName)
        return ok({ key, uploadUrl: await getUploadUrl(key, parsed.data.mimeType) })
    } catch (err) {
        return fail(err, "jawaf.files.start")
    }
}

/** After the browser's PUT: record the file and start reading it. */
export async function finishJawafFileUpload(input: FinishJawafUploadInput): Promise<ActionResult<{ source: JawafSourceView; job: JawafJobView }>> {
    try {
        const session = await requireSession()
        const parsed = finishJawafUploadSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That upload could not be finished.")
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, parsed.data.botId)
        const d = parsed.data
        if (!d.key.startsWith(`jawaf/${ws.id}/`)) return failWith("forbidden", "That upload does not belong to this workspace.")
        if (!(await objectExists(d.key))) return failWith("validation", "The upload did not arrive. Try again.")
        const [src] = await db.insert(jawafSource).values({
            workspaceId: ws.id, botId: bot.id, kind: "file", fileKey: d.key, fileName: d.fileName, fileSize: d.size, mimeType: d.mimeType, status: "queued",
            createdById: session.user.id,
        }).returning()
        const job = await enqueueJob({ workspaceId: ws.id, botId: bot.id, kind: "file", sourceId: src!.id, createdById: session.user.id, label: "Reading the file" })
        const [view] = await listSources(bot.id, ["file"]).then((all) => all.filter((s) => s.id === src!.id))
        return ok({ source: view!, job: toJobView(job) })
    } catch (err) {
        return fail(err, "jawaf.files.finish")
    }
}

export async function listJawafFiles(botId: string): Promise<ActionResult<JawafSourceView[]>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, id.data)
        return ok(await listSources(bot.id, ["file"]))
    } catch (err) {
        return fail(err, "jawaf.files.list")
    }
}

/** Delete a source (a file, an added URL, or the whole website) with its pages and search chunks. */
export async function deleteJawafSource(input: JawafBotItemInput): Promise<ActionResult<{ id: string }>> {
    try {
        await requireSession({ fresh: true })
        const parsed = jawafBotItemSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That source could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "edit")
        const bot = await loadBot(ws.id, parsed.data.botId)
        const { fileKey } = await deleteSource(bot, parsed.data.id)
        if (fileKey && isStorageConfigured()) await deleteFile(fileKey).catch(() => undefined)
        return ok({ id: parsed.data.id })
    } catch (err) {
        return fail(err, "jawaf.files.delete")
    }
}
