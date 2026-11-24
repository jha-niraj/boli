"use server"

/**
 * Jawaf owner knowledge: the fact sheet (sections, drafts to approve), Q&A pairs (+ CSV import) and notes / tables.
 * Every save is indexed before it returns (auto-apply: answers use it within seconds). Session + Jawaf level checked in
 * every export (view to read, edit to change); ActionResult always.
 */
import { requireSession } from "@repo/auth/next"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { loadBot } from "@/lib/jawaf/bots"
import {
    approveFacts, approveQa, deleteFact, deleteNote, deleteQa, importQaCsv, listFacts, listNotes, listQa, saveFact, saveNote, saveQa,
} from "@/lib/jawaf/knowledge"
import { requireWorkspaceAccess } from "@/lib/workspace"
import {
    importJawafQaCsvSchema, jawafBotItemSchema, jawafIdSchema, saveJawafFactSchema, saveJawafNoteSchema, saveJawafQaSchema,
    type ImportJawafQaCsvInput, type JawafBotItemInput, type SaveJawafFactInput, type SaveJawafNoteInput, type SaveJawafQaInput,
} from "@/schemas/jawaf"
import { z } from "zod"
import type { JawafCsvImportResult, JawafFactSection, JawafNote, JawafQa } from "@/types/jawaf"

const badBot = () => failWith("validation", "That bot could not be found.")
const approveSchema = z.object({ botId: jawafIdSchema, ids: z.array(jawafIdSchema).max(500).default([]) })

async function botFor(botId: string, level: "view" | "edit") {
    const ws = await requireWorkspaceAccess("jawaf", level)
    return loadBot(ws.id, botId)
}

// --- facts -----------------------------------------------------------------------------------------------------------

export async function listJawafFacts(botId: string): Promise<ActionResult<JawafFactSection[]>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const bot = await botFor(id.data, "view")
        return ok(await listFacts(bot.id))
    } catch (err) {
        return fail(err, "jawaf.facts.list")
    }
}

/** Create or update a section (saving approves it unless `approved: false`). */
export async function saveJawafFact(input: SaveJawafFactInput): Promise<ActionResult<JawafFactSection>> {
    try {
        await requireSession()
        const parsed = saveJawafFactSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the section.")
        const bot = await botFor(parsed.data.botId, "edit")
        const { botId: _b, ...rest } = parsed.data
        return ok(await saveFact(bot, rest))
    } catch (err) {
        return fail(err, "jawaf.facts.save")
    }
}

/** Approve drafted sections: the given ids, or every draft when `ids` is empty (the Review step's "Approve all"). */
export async function approveJawafFacts(input: { botId: string; ids?: string[] }): Promise<ActionResult<{ approved: number }>> {
    try {
        await requireSession()
        const parsed = approveSchema.safeParse(input)
        if (!parsed.success) return badBot()
        const bot = await botFor(parsed.data.botId, "edit")
        return ok({ approved: await approveFacts(bot, parsed.data.ids) })
    } catch (err) {
        return fail(err, "jawaf.facts.approve")
    }
}

export async function deleteJawafFact(input: JawafBotItemInput): Promise<ActionResult<{ id: string }>> {
    try {
        await requireSession()
        const parsed = jawafBotItemSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That section could not be found.")
        const bot = await botFor(parsed.data.botId, "edit")
        await deleteFact(bot, parsed.data.id)
        return ok({ id: parsed.data.id })
    } catch (err) {
        return fail(err, "jawaf.facts.delete")
    }
}

// --- Q&A -------------------------------------------------------------------------------------------------------------

export async function listJawafQa(botId: string): Promise<ActionResult<JawafQa[]>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const bot = await botFor(id.data, "view")
        return ok(await listQa(bot.id))
    } catch (err) {
        return fail(err, "jawaf.qa.list")
    }
}

export async function saveJawafQa(input: SaveJawafQaInput): Promise<ActionResult<JawafQa>> {
    try {
        const session = await requireSession()
        const parsed = saveJawafQaSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the question and answer.")
        const bot = await botFor(parsed.data.botId, "edit")
        const { botId: _b, ...rest } = parsed.data
        return ok(await saveQa(bot, { ...rest, userId: session.user.id }))
    } catch (err) {
        return fail(err, "jawaf.qa.save")
    }
}

/** Approve drafted FAQs (the given ids, or all drafts). */
export async function approveJawafQa(input: { botId: string; ids?: string[] }): Promise<ActionResult<{ approved: number }>> {
    try {
        await requireSession()
        const parsed = approveSchema.safeParse(input)
        if (!parsed.success) return badBot()
        const bot = await botFor(parsed.data.botId, "edit")
        return ok({ approved: await approveQa(bot, parsed.data.ids) })
    } catch (err) {
        return fail(err, "jawaf.qa.approve")
    }
}

export async function deleteJawafQa(input: JawafBotItemInput): Promise<ActionResult<{ id: string }>> {
    try {
        await requireSession()
        const parsed = jawafBotItemSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That question could not be found.")
        const bot = await botFor(parsed.data.botId, "edit")
        await deleteQa(bot, parsed.data.id)
        return ok({ id: parsed.data.id })
    } catch (err) {
        return fail(err, "jawaf.qa.delete")
    }
}

/** CSV: question,answer[,"phrasing 1; phrasing 2"]. A header row is skipped. */
export async function importJawafQaCsv(input: ImportJawafQaCsvInput): Promise<ActionResult<JawafCsvImportResult>> {
    try {
        const session = await requireSession()
        const parsed = importJawafQaCsvSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That CSV could not be read.")
        const bot = await botFor(parsed.data.botId, "edit")
        return ok(await importQaCsv(bot, parsed.data.csv, session.user.id))
    } catch (err) {
        return fail(err, "jawaf.qa.import")
    }
}

// --- notes and tables ------------------------------------------------------------------------------------------------

export async function listJawafNotes(botId: string): Promise<ActionResult<JawafNote[]>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badBot()
        const bot = await botFor(id.data, "view")
        return ok(await listNotes(bot.id))
    } catch (err) {
        return fail(err, "jawaf.notes.list")
    }
}

export async function saveJawafNote(input: SaveJawafNoteInput): Promise<ActionResult<JawafNote>> {
    try {
        const session = await requireSession()
        const parsed = saveJawafNoteSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the note.")
        const bot = await botFor(parsed.data.botId, "edit")
        const { botId: _b, ...rest } = parsed.data
        return ok(await saveNote(bot, { ...rest, userId: session.user.id }))
    } catch (err) {
        return fail(err, "jawaf.notes.save")
    }
}

export async function deleteJawafNote(input: JawafBotItemInput): Promise<ActionResult<{ id: string }>> {
    try {
        await requireSession()
        const parsed = jawafBotItemSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That note could not be found.")
        const bot = await botFor(parsed.data.botId, "edit")
        await deleteNote(bot, parsed.data.id)
        return ok({ id: parsed.data.id })
    } catch (err) {
        return fail(err, "jawaf.notes.delete")
    }
}
