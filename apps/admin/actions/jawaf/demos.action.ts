"use server"

/**
 * Jawaf > Demos: the demo tracker (jawaf_prospect) and creating a demo bot in the Boli Demos workspace. Every export
 * checks the admin and the `jawaf` module itself and returns ActionResult. Reads: `jawaf` read; writes: `jawaf` write.
 */
import { revalidatePath } from "next/cache"
import { and, db, eq } from "@repo/db"
import { jawafProspect, workspaceMember } from "@repo/db/schema"
import { appBaseUrl } from "@repo/billing"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { requireAdminAction } from "../guard"
import { auditJawaf, demoDetail, insertDemoBot, listDemos, loadBotOr404, prospectRow, requireHouse } from "@/lib/jawaf"
import { createDemoSchema, jawafIdSchema, updateProspectSchema, type CreateDemoInput, type UpdateProspectInput } from "@/schemas/jawaf"
import type { DemoDetail, DemosData, ProspectRow } from "@/types/jawaf"

const DEMOS = "/jawaf/demos"

export async function getJawafDemos(): Promise<ActionResult<DemosData>> {
    try {
        await requireAdminAction("jawaf", "read")
        return ok(await listDemos())
    } catch (err) {
        return fail(err, "jawaf.demos.list")
    }
}

export async function getJawafDemo(prospectId: string): Promise<ActionResult<DemoDetail>> {
    try {
        await requireAdminAction("jawaf", "read")
        const id = jawafIdSchema.safeParse(prospectId)
        if (!id.success) return failWith("validation", "That demo could not be found.")
        return ok(await demoDetail(id.data))
    } catch (err) {
        return fail(err, "jawaf.demos.get")
    }
}

/**
 * New demo: the prospect + its bot in the Boli Demos workspace (demo = true), the creating admin made a member of the
 * house when they are not one yet (so Open in Jawaf works). The crawl / read / draft runs in the app's Jawaf setup when
 * the admin opens the bot there (one Jawaf UI - plan/admin/jawaf/admin-v1.md).
 */
export async function createJawafDemo(input: CreateDemoInput): Promise<ActionResult<ProspectRow>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = createDemoSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        const d = parsed.data
        const houseId = await requireHouse()
        const bot = await insertDemoBot({ houseId, name: d.business, businessType: d.businessType, website: d.website, createdById: admin.userId })
        const [p] = await db.insert(jawafProspect).values({
            business: d.business, website: d.website, businessType: d.businessType, sector: d.sector, city: d.city, contactName: d.contactName,
            phone: d.phone, email: d.email, ownerUserId: d.ownerUserId ?? admin.userId, botId: bot.id, sourceContactMessageId: d.sourceContactMessageId,
            createdById: admin.userId,
        }).returning({ id: jawafProspect.id })
        if (!p) return failWith("unknown", "The demo could not be saved. Try again.")
        await ensureHouseMember(houseId, admin.userId)
        await auditJawaf(admin.id, {
            action: "CREATE", resourceType: "JawafProspect", resourceId: p.id, description: `Created a demo for ${d.business}`,
            metadata: { botId: bot.id, slug: bot.slug, fromContactMessage: d.sourceContactMessageId },
        })
        revalidatePath(DEMOS)
        return ok(await prospectRow(p.id))
    } catch (err) {
        return fail(err, "jawaf.demos.create")
    }
}

async function ensureHouseMember(houseId: string, userId: string): Promise<void> {
    await db.insert(workspaceMember).values({
        workspaceId: houseId, userId, role: "member", access: { kura: false, api: false, jawaf: { access: true, level: "manage" } },
    }).onConflictDoNothing()
}

/** Edit the prospect from its sheet (send only what changed). */
export async function updateJawafProspect(input: UpdateProspectInput): Promise<ActionResult<ProspectRow>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = updateProspectSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        const { id, nextStepAt, ...rest } = parsed.data
        const before = await prospectRow(id)
        const set: Partial<typeof jawafProspect.$inferInsert> = { updatedAt: new Date() }
        for (const [k, v] of Object.entries(rest)) if (v !== undefined) (set as Record<string, unknown>)[k] = v
        // A day from the DatePicker is midnight in Kathmandu (UTC+5:45), stored as that UTC instant.
        if (input.nextStepAt !== undefined) set.nextStepAt = nextStepAt ? new Date(`${nextStepAt}T00:00:00+05:45`) : null
        await db.update(jawafProspect).set(set).where(eq(jawafProspect.id, id))
        if (rest.stage && rest.stage !== before.stage) {
            await auditJawaf(admin.id, { action: "UPDATE", resourceType: "JawafProspect", resourceId: id, description: `${before.business}: stage ${before.stage} -> ${rest.stage}`, changes: { stage: { from: before.stage, to: rest.stage } } })
        }
        revalidatePath(DEMOS)
        return ok(await prospectRow(id))
    } catch (err) {
        return fail(err, "jawaf.demos.update")
    }
}

/**
 * "Open in Jawaf": the app's link that switches to the house workspace and this bot (GET /api/jawaf/open on the app;
 * only cookies change). The admin is made a member of the house first when they are not one yet.
 */
export async function openInJawafUrl(botId: string): Promise<ActionResult<{ url: string }>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const bot = await loadBotOr404(id.data)
        const houseId = await requireHouse()
        if (bot.workspaceId !== houseId) {
            const [member] = await db.select({ id: workspaceMember.id }).from(workspaceMember)
                .where(and(eq(workspaceMember.workspaceId, bot.workspaceId), eq(workspaceMember.userId, admin.userId))).limit(1)
            if (!member) return failWith("forbidden", "This bot is in a customer's workspace. Open its public page instead.")
        } else {
            await ensureHouseMember(houseId, admin.userId)
        }
        const url = new URL("/api/jawaf/open", appBaseUrl())
        url.searchParams.set("workspace", bot.workspaceId)
        url.searchParams.set("bot", bot.id)
        return ok({ url: url.toString() })
    } catch (err) {
        return fail(err, "jawaf.demos.open")
    }
}
