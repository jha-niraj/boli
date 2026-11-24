"use server"

/**
 * Jawaf bots: list (the switcher), read, slug check, create (onboarding), update (settings, look, setup step), publish
 * the look, delete. Every export checks the session and the current workspace's Jawaf level itself and returns
 * ActionResult. Levels (@repo/boli/workspace-access): view < answer < edit < manage.
 */
import { requireSession } from "@repo/auth/next"
import { and, count, db, eq } from "@repo/db"
import { jawafBot, jawafSource } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { deleteFile, isStorageConfigured } from "@repo/storage"
import { JAWAF_BUSINESS_TYPE_INFO, JAWAF_LIMITS, JAWAF_PRICES } from "@repo/boli/jawaf"
import { checkSlug, DEFAULT_CONTACT_FIELDS, DEFAULT_LOOK, loadBot, toBotSummary, toBotView } from "@/lib/jawaf/bots"
import { botCounts } from "@/lib/jawaf/knowledge"
import { answersThisMonth, nepalMonth } from "@/lib/jawaf/meter"
import { slugify } from "@/lib/jawaf/text"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { createJawafBotSchema, jawafIdSchema, jawafSlugSchema, updateJawafBotSchema, type CreateJawafBotInput, type UpdateJawafBotInput } from "@/schemas/jawaf"
import type { JawafBot, JawafBotCounts, JawafBotSummary, JawafSlugCheck, JawafUsageMonth } from "@/types/jawaf"

/** The workspace's bots, oldest first (the sidebar switcher). */
export async function listJawafBots(): Promise<ActionResult<JawafBotSummary[]>> {
    try {
        await requireSession()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const rows = await db.select().from(jawafBot).where(eq(jawafBot.workspaceId, ws.id)).orderBy(jawafBot.createdAt)
        return ok(rows.map(toBotSummary))
    } catch (err) {
        return fail(err, "jawaf.bots.list")
    }
}

export async function getJawafBot(botId: string): Promise<ActionResult<JawafBot>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        return ok(toBotView(await loadBot(ws.id, id.data)))
    } catch (err) {
        return fail(err, "jawaf.bots.get")
    }
}

/** Knowledge counts for Home and the setup checklist. */
export async function getJawafBotCounts(botId: string): Promise<ActionResult<JawafBotCounts>> {
    try {
        await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, id.data)
        return ok(await botCounts(bot.id))
    } catch (err) {
        return fail(err, "jawaf.bots.counts")
    }
}

/** Visitor answers this Nepal-time month and the free answers left (workspace-wide). */
export async function getJawafUsage(): Promise<ActionResult<JawafUsageMonth>> {
    try {
        await requireSession()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const answers = await answersThisMonth(ws.id)
        return ok({ month: nepalMonth(), answers, freeLeft: Math.max(0, JAWAF_PRICES.freeAnswersPerMonth - answers) })
    } catch (err) {
        return fail(err, "jawaf.usage")
    }
}

/** Is this public page name free? (`app.bolihq.com/j/<slug>`) Suggests a free one when not. */
export async function checkJawafSlug(slug: string, botId?: string): Promise<ActionResult<JawafSlugCheck>> {
    try {
        await requireSession()
        await requireWorkspaceAccess("jawaf", "edit")
        return ok(await checkSlug(slug, botId))
    } catch (err) {
        return fail(err, "jawaf.bots.slug")
    }
}

/** Onboarding: business type, name, website, tone. The slug comes from the name when not given. */
export async function createJawafBot(input: CreateJawafBotInput): Promise<ActionResult<JawafBotSummary>> {
    try {
        const session = await requireSession({ fresh: true })
        const parsed = createJawafBotSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        const ws = await requireWorkspaceAccess("jawaf", "manage")
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jawafBot).where(eq(jawafBot.workspaceId, ws.id))
        if (Number(n) >= JAWAF_LIMITS.botsPerWorkspace) return failWith("validation", `A workspace can have up to ${JAWAF_LIMITS.botsPerWorkspace} bots.`)
        const d = parsed.data
        const wanted = d.slug ?? slugify(d.name)
        const check = await checkSlug(wanted)
        const slug = check.available ? check.slug : check.suggestion
        if (!slug) return failWith("conflict", "Choose a different page name.")
        const info = JAWAF_BUSINESS_TYPE_INFO[d.businessType]
        const [row] = await db.insert(jawafBot).values({
            workspaceId: ws.id,
            name: d.name,
            slug,
            businessType: d.businessType,
            website: d.website ?? null,
            tone: d.tone,
            length: d.length,
            greeting: `Namaste! Ask me anything about ${d.name}.`,
            suggestedQuestions: info.suggested.slice(0, JAWAF_LIMITS.suggestedQuestions),
            contactFields: DEFAULT_CONTACT_FIELDS,
            look: DEFAULT_LOOK,
            setupStep: d.website ? "pages" : "review",
            createdById: session.user.id,
        }).onConflictDoNothing().returning()
        if (!row) return failWith("conflict", "That page name was just taken. Try again.")
        return ok(toBotSummary(row))
    } catch (err) {
        return fail(err, "jawaf.bots.create")
    }
}

/** Settings, look (the editing copy), setup step, status. Send only what changed. */
export async function updateJawafBot(input: UpdateJawafBotInput): Promise<ActionResult<JawafBot>> {
    try {
        await requireSession({ fresh: true })
        const parsed = updateJawafBotSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        // The setup checklist step is moved by anyone who can edit; everything else needs manage.
        const { botId, ...rest } = parsed.data
        const onlyStep = Object.keys(rest).every((k) => k === "setupStep")
        const ws = await requireWorkspaceAccess("jawaf", onlyStep ? "edit" : "manage")
        const bot = await loadBot(ws.id, botId)
        if (rest.slug && rest.slug !== bot.slug) {
            const check = await checkSlug(rest.slug, bot.id)
            if (!check.available) return failWith("conflict", check.reason === "reserved" ? "That page name is reserved. Choose another." : "That page name is taken. Choose another.")
        }
        const [row] = await db.update(jawafBot).set({ ...rest, updatedAt: new Date() }).where(and(eq(jawafBot.id, bot.id), eq(jawafBot.workspaceId, ws.id))).returning()
        if (!row) return failWith("notfound", "That bot could not be found.")
        return ok(toBotView(row))
    } catch (err) {
        if (err instanceof Error && /jawaf_bot_slug_uq/.test(err.message)) return failWith("conflict", "That page name is taken. Choose another.")
        return fail(err, "jawaf.bots.update")
    }
}

/** Publish the edited look to the public page and widget. */
export async function publishJawafLook(botId: string): Promise<ActionResult<{ publishedAt: string }>> {
    try {
        await requireSession({ fresh: true })
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "manage")
        const bot = await loadBot(ws.id, id.data)
        const now = new Date()
        await db.update(jawafBot).set({ publishedLook: bot.look, updatedAt: now }).where(eq(jawafBot.id, bot.id))
        return ok({ publishedAt: now.toISOString() })
    } catch (err) {
        return fail(err, "jawaf.bots.publish")
    }
}

/** Delete a bot and everything under it (pages, chunks, facts, Q&A, conversations, contacts; uploaded files in R2). */
export async function deleteJawafBot(botId: string): Promise<ActionResult<{ id: string }>> {
    try {
        await requireSession({ fresh: true })
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "manage")
        const bot = await loadBot(ws.id, id.data)
        const files = await db.select({ key: jawafSource.fileKey }).from(jawafSource).where(and(eq(jawafSource.botId, bot.id), eq(jawafSource.kind, "file")))
        await db.delete(jawafBot).where(and(eq(jawafBot.id, bot.id), eq(jawafBot.workspaceId, ws.id)))
        if (isStorageConfigured()) {
            for (const f of files) if (f.key) await deleteFile(f.key).catch(() => undefined)
        }
        return ok({ id: bot.id })
    } catch (err) {
        return fail(err, "jawaf.bots.delete")
    }
}

/** The slug a name would get (onboarding live preview). Read-only. */
export async function suggestJawafSlug(name: string): Promise<ActionResult<JawafSlugCheck>> {
    try {
        await requireSession()
        await requireWorkspaceAccess("jawaf", "view")
        const base = jawafSlugSchema.safeParse(slugify(name))
        return ok(await checkSlug(base.success ? base.data : slugify(name)))
    } catch (err) {
        return fail(err, "jawaf.bots.suggestSlug")
    }
}
