"use server"

/**
 * Jawaf > All bots: every bot across all workspaces (customer bots: NUMBERS ONLY) and the bot tools - pause / resume,
 * raise limits, grant credits to its workspace, health, Re-read now / Retry failed, the quality check, change owner.
 * Every export checks the admin and the `jawaf` module itself and returns ActionResult; every write is audited.
 */
import { revalidatePath } from "next/cache"
import { and, db, eq, isNull, moveJawafBot, sql } from "@repo/db"
import { jawafBot, jawafClaim, notification, user } from "@repo/db/schema"
import { accountForWorkspace, addCredits, appBaseUrl, creditsToMicro, ensurePersonalWorkspace } from "@repo/billing"
import { jawafBotPausedEmail, sendEmail } from "@repo/email"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { requireAdminAction } from "../guard"
import { bridgeConfigured, bridgeEval, bridgeHealth, bridgeTick } from "@/lib/jawaf-bridge"
import { evalSetFor } from "@/lib/jawaf-eval-sets"
import { auditJawaf, botHealth, botRow, getHouseOrNull, listBots, loadBotOr404, queueRead, workspaceOwners } from "@/lib/jawaf"
import { botLimitsSchema, changeOwnerSchema, evalBatchSchema, grantBotCreditsSchema, jawafIdSchema, pauseBotSchema } from "@/schemas/jawaf"
import type { BotHealth, BotRow, BotsData, EmbedHealth, EvalRowResult, JobBrief } from "@/types/jawaf"

const BOTS = "/jawaf/bots"
/** Questions per quality-check call (each is one model answer, a few seconds). */
const EVAL_BATCH = 3

function revalidate() {
    revalidatePath(BOTS)
    revalidatePath("/jawaf/demos")
}

function badId() {
    return failWith("validation", "That bot could not be found.")
}

export async function getJawafBots(): Promise<ActionResult<BotsData>> {
    try {
        await requireAdminAction("jawaf", "read")
        return ok(await listBots())
    } catch (err) {
        return fail(err, "jawaf.bots.list")
    }
}

export async function getJawafBotRow(botId: string): Promise<ActionResult<BotRow>> {
    try {
        await requireAdminAction("jawaf", "read")
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badId()
        return ok(await botRow(id.data))
    } catch (err) {
        return fail(err, "jawaf.bots.get")
    }
}

export async function getJawafBotHealth(botId: string): Promise<ActionResult<BotHealth>> {
    try {
        await requireAdminAction("jawaf", "read")
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badId()
        return ok(await botHealth(id.data))
    } catch (err) {
        return fail(err, "jawaf.bots.health")
    }
}

/** Is the embedding server reachable from the app? (one tiny embed through the bridge). Read only. */
export async function getJawafEmbedHealth(): Promise<ActionResult<EmbedHealth>> {
    try {
        await requireAdminAction("jawaf", "read")
        if (!bridgeConfigured()) return ok({ reachable: null, ms: null, note: "JAWAF_ADMIN_SECRET is not set, so the admin cannot ask the app." })
        const h = await bridgeHealth()
        return ok({ reachable: h.embed.ok, ms: h.embed.ms, note: h.embed.error })
    } catch (err) {
        return fail(err, "jawaf.bots.embed")
    }
}

/** Pause or resume the public page, widget and API. The workspace owners get a bell notification and an email. */
export async function setJawafBotPaused(input: { botId: string; paused: boolean; reason?: string }): Promise<ActionResult<BotRow>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = pauseBotSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        const { botId, paused } = parsed.data
        const reason = parsed.data.reason || null
        const bot = await loadBotOr404(botId)
        if (bot.paused === paused) return ok(await botRow(bot.id))
        await db.update(jawafBot).set({ paused, pausedReason: paused ? reason : null, pausedAt: paused ? new Date() : null, updatedAt: new Date() }).where(eq(jawafBot.id, bot.id))
        await auditJawaf(admin.id, {
            action: "UPDATE", resourceType: "JawafBot", resourceId: bot.id, description: `${paused ? "Paused" : "Resumed"} ${bot.name}`,
            changes: { paused: { from: bot.paused, to: paused } }, metadata: { reason },
        })
        // The owners hear about it (a house demo's owner is the Boli team itself - still told, it is cheap and honest).
        const owners = await workspaceOwners(bot.workspaceId)
        const title = paused ? `${bot.name} is paused` : `${bot.name} is answering again`
        const message = paused
            ? `The Boli team paused ${bot.name}'s public page and widget.${reason ? ` Why: ${reason}` : ""}`
            : `The Boli team resumed ${bot.name}. Its public page and widget answer visitors again.`
        if (owners.length) {
            await db.insert(notification).values(owners.map((o) => ({ userId: o.id, title, message, type: paused ? ("warning" as const) : ("info" as const), actionUrl: "/jawaf", actionLabel: "Open Jawaf" })))
            for (const o of owners) {
                const r = await sendEmail({ kind: "transactional", to: o.email, replyTo: admin.email, ...jawafBotPausedEmail({ botName: bot.name, paused, reason, appUrl: `${appBaseUrl()}/jawaf` }) })
                if (r.status === "failed") console.error(`[jawaf] pause email to an owner failed: ${r.error}`)
            }
        }
        revalidate()
        return ok(await botRow(bot.id))
    } catch (err) {
        return fail(err, "jawaf.bots.pause")
    }
}

/** Raise (or reset with null) the bot's page and file limits. Other overrides (file size) are kept. */
export async function setJawafBotLimits(input: { botId: string; pagesPerBot: number | null; filesPerBot: number | null }): Promise<ActionResult<BotRow>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = botLimitsSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Enter whole numbers.")
        const bot = await loadBotOr404(parsed.data.botId)
        const before = bot.limits && typeof bot.limits === "object" && !Array.isArray(bot.limits) ? (bot.limits as Record<string, unknown>) : {}
        const next: Record<string, unknown> = { ...before }
        for (const k of ["pagesPerBot", "filesPerBot"] as const) {
            const v = parsed.data[k]
            if (v === null) delete next[k]
            else next[k] = v
        }
        await db.update(jawafBot).set({ limits: next, updatedAt: new Date() }).where(eq(jawafBot.id, bot.id))
        await auditJawaf(admin.id, { action: "UPDATE", resourceType: "JawafBot", resourceId: bot.id, description: `Changed the limits of ${bot.name}`, changes: { limits: { from: before, to: next } } })
        revalidate()
        return ok(await botRow(bot.id))
    } catch (err) {
        return fail(err, "jawaf.bots.limits")
    }
}

/** Grant (or, negative, take back) credits on the bot's WORKSPACE account. `requestId` once per sheet: a double press is one grant. */
export async function grantJawafBotCredits(input: { botId: string; credits: number; reason: string; requestId: string }): Promise<ActionResult<{ balanceMicro: number; applied: boolean }>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = grantBotCreditsSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        const { credits, reason, requestId } = parsed.data
        const bot = await loadBotOr404(parsed.data.botId)
        const account = await accountForWorkspace(bot.workspaceId)
        const r = await addCredits(account.id, { kind: credits > 0 ? "grant" : "expiry", amountMicro: creditsToMicro(credits), key: `grant:${requestId}`, description: reason, grantedBy: admin.id })
        if (r.applied) {
            await auditJawaf(admin.id, {
                action: credits > 0 ? "CREATE" : "UPDATE", resourceType: "Workspace", resourceId: bot.workspaceId,
                description: credits > 0 ? `Granted ${credits} credits to ${bot.name}'s workspace` : `Removed ${Math.abs(credits)} credits from ${bot.name}'s workspace`,
                changes: { credits, balanceAfterMicro: r.balanceMicro }, metadata: { reason, requestId, botId: bot.id },
            })
        }
        revalidate()
        return ok(r)
    } catch (err) {
        return fail(err, "jawaf.bots.grant")
    }
}

/** Re-read now (every included page; unchanged pages are skipped, re-reads never charge) or Retry failed. */
export async function rereadJawafBot(input: { botId: string; mode: "all" | "failed" }): Promise<ActionResult<JobBrief>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const id = jawafIdSchema.safeParse(input.botId)
        if (!id.success) return badId()
        const mode = input.mode === "failed" ? "failed" : "all"
        const bot = await loadBotOr404(id.data)
        const job = await queueRead(bot, mode, admin.userId)
        await auditJawaf(admin.id, { action: "UPDATE", resourceType: "JawafBot", resourceId: bot.id, description: `${mode === "all" ? "Re-read" : "Retried the failed pages of"} ${bot.name}`, metadata: { jobId: job.id } })
        return ok(job)
    } catch (err) {
        return fail(err, "jawaf.bots.reread")
    }
}

/** Advance a reading job by one slice through the app (the sheet calls this while it shows progress). */
export async function driveJawafJob(jobId: string): Promise<ActionResult<{ status: string; label: string; done: number; total: number; error: string | null }>> {
    try {
        await requireAdminAction("jawaf", "write")
        const id = jawafIdSchema.safeParse(jobId)
        if (!id.success) return failWith("validation", "That job could not be found.")
        const j = await bridgeTick(id.data)
        return ok({ status: j.status, label: j.progress.label, done: j.progress.done, total: j.progress.total, error: j.error })
    } catch (err) {
        return fail(err, "jawaf.bots.drive")
    }
}

/** How many quality-check questions the bot has (0 = no question set for its page name yet). */
export async function getJawafEvalInfo(botId: string): Promise<ActionResult<{ total: number; batch: number; bridge: boolean }>> {
    try {
        await requireAdminAction("jawaf", "read")
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return badId()
        const bot = await loadBotOr404(id.data)
        return ok({ total: evalSetFor(bot.slug)?.length ?? 0, batch: EVAL_BATCH, bridge: bridgeConfigured() })
    } catch (err) {
        return fail(err, "jawaf.bots.evalInfo")
    }
}

/** One batch of the quality check (questions offset..offset+3) through THE answer engine: no rows, no charges. */
export async function runJawafEvalBatch(input: { botId: string; offset: number }): Promise<ActionResult<EvalRowResult[]>> {
    try {
        await requireAdminAction("jawaf", "write")
        const parsed = evalBatchSchema.safeParse(input)
        if (!parsed.success) return badId()
        const bot = await loadBotOr404(parsed.data.botId)
        const set = evalSetFor(bot.slug)
        if (!set) return failWith("conflict", `There is no question set for ${bot.slug} yet. Write ml/jawaf-eval/questions/<site>.json first.`)
        const slice = set.slice(parsed.data.offset, parsed.data.offset + EVAL_BATCH)
        if (!slice.length) return ok([])
        return ok((await bridgeEval(bot.id, slice)).rows)
    } catch (err) {
        return fail(err, "jawaf.bots.eval")
    }
}

/**
 * Change owner by email: the bot and everything under it move to that person's PERSONAL workspace (made if missing).
 * A demo moved to someone else stops being a demo; open claim links die. Audited.
 */
export async function changeJawafBotOwner(input: { botId: string; email: string }): Promise<ActionResult<BotRow>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = changeOwnerSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Enter an email.")
        const bot = await loadBotOr404(parsed.data.botId)
        const [person] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.email, parsed.data.email)).limit(1)
        if (!person) return failWith("notfound", "No one has that email. They need a Boli account first.")
        const ws = await ensurePersonalWorkspace(person.id, person.name)
        await accountForWorkspace(ws.id)
        if (ws.id === bot.workspaceId) return failWith("conflict", `${bot.name} is already in ${ws.name}.`)
        const house = await getHouseOrNull()
        const moved = await moveJawafBot({ botId: bot.id, fromWorkspaceId: bot.workspaceId, toWorkspaceId: ws.id, clearDemo: ws.id !== house })
        if (!moved) return failWith("conflict", "The bot moved in the meantime. Refresh and try again.")
        await db.update(jawafClaim).set({ revokedAt: sql`now()` }).where(and(eq(jawafClaim.botId, bot.id), isNull(jawafClaim.claimedAt), isNull(jawafClaim.revokedAt)))
        await auditJawaf(admin.id, {
            action: "UPDATE", resourceType: "JawafBot", resourceId: bot.id, description: `Moved ${bot.name} to ${person.email} (${ws.name})`,
            changes: { workspaceId: { from: bot.workspaceId, to: ws.id }, demo: { from: bot.demo, to: ws.id === house ? bot.demo : false } },
        })
        revalidate()
        return ok(await botRow(bot.id))
    } catch (err) {
        return fail(err, "jawaf.bots.owner")
    }
}
