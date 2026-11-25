import "server-only"
import { and, count, db, eq, isNull, sql } from "@repo/db"
import { adminAuditLog, jawafBot, jawafClaim, jawafFactSection, jawafPage, jawafProspect, jawafQa, workspace } from "@repo/db/schema"
import { getJawafHouseWorkspaceId, moveJawafBot } from "@repo/db"
import { sha256Hex } from "@repo/crypto"
import { AppError } from "@repo/errors"
import type { JawafClaimPreview } from "@/types/jawaf"

/**
 * A demo bot's one-time claim link (plan/admin/jawaf/admin-v1.md "Claim"): apps/admin makes it (only the SHA-256 of the
 * token is stored, the token is shown once), the business opens `/claim/<token>` here. The page only READS
 * (previewClaim); opening is marked by a POST from the page (markClaimOpened); claiming moves the bot with everything
 * under it to the chosen workspace (@repo/db moveJawafBot, one batch), clears the demo flag, kills the link and writes
 * the audit row.
 */

type ClaimRow = typeof jawafClaim.$inferSelect

async function findClaim(token: string): Promise<ClaimRow | null> {
    const [row] = await db.select().from(jawafClaim).where(eq(jawafClaim.tokenHash, sha256Hex(token))).limit(1)
    return row ?? null
}

function stateOf(c: ClaimRow, now = Date.now()): JawafClaimPreview["state"] {
    if (c.claimedAt) return "claimed"
    if (c.revokedAt) return "revoked"
    if (c.expiresAt.getTime() <= now) return "expired"
    return "valid"
}

const EMPTY: JawafClaimPreview = { state: "notfound", botName: null, botSlug: null, pages: 0, facts: 0, qa: 0, expiresAt: null }

/** What the link shows: the bot's name and how much it knows. A read - never marks anything. */
export async function previewClaim(token: string): Promise<JawafClaimPreview> {
    const c = await findClaim(token)
    if (!c) return EMPTY
    const state = stateOf(c)
    const [bot] = await db.select({ id: jawafBot.id, name: jawafBot.name, slug: jawafBot.slug }).from(jawafBot).where(eq(jawafBot.id, c.botId)).limit(1)
    if (!bot) return EMPTY
    if (state !== "valid") return { ...EMPTY, state, botName: bot.name }
    const [pages, facts, qa] = await db.batch([
        db.select({ n: count() }).from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.readStatus, "read"))),
        db.select({ n: count() }).from(jawafFactSection).where(and(eq(jawafFactSection.botId, bot.id), eq(jawafFactSection.approved, true))),
        db.select({ n: count() }).from(jawafQa).where(and(eq(jawafQa.botId, bot.id), eq(jawafQa.approved, true))),
    ])
    return {
        state, botName: bot.name, botSlug: bot.slug,
        pages: Number(pages[0]?.n ?? 0), facts: Number(facts[0]?.n ?? 0), qa: Number(qa[0]?.n ?? 0),
        expiresAt: c.expiresAt.toISOString(),
    }
}

/** The first open of a valid link (a POST from the page, never the render). Idempotent. */
export async function markOpened(token: string): Promise<void> {
    await db.update(jawafClaim).set({ linkOpenedAt: sql`now()` })
        .where(and(eq(jawafClaim.tokenHash, sha256Hex(token)), isNull(jawafClaim.linkOpenedAt)))
}

/**
 * Claim: the caller checked the session and that the person OWNS `toWorkspaceId`. The link is taken first by one
 * conditional UPDATE (claimed_at IS NULL, not revoked, not expired), so two presses claim once; then the move.
 */
export async function claimBot(input: { token: string; toWorkspaceId: string; userId: string; userEmail: string }): Promise<{ botId: string; botName: string }> {
    const c = await findClaim(input.token)
    if (!c) throw new AppError("notfound", "That claim link is not valid. Ask the Boli team for a new one.")
    const state = stateOf(c)
    if (state === "claimed") throw new AppError("conflict", "This bot was already claimed. Sign in with the account that claimed it.")
    if (state === "revoked") throw new AppError("conflict", "This claim link was replaced by a newer one. Use the latest link, or ask the Boli team.")
    if (state === "expired") throw new AppError("conflict", "This claim link expired. Ask the Boli team for a new one.")
    const [bot] = await db.select().from(jawafBot).where(eq(jawafBot.id, c.botId)).limit(1)
    if (!bot) throw new AppError("notfound", "That bot no longer exists.")
    const house = await getJawafHouseWorkspaceId()
    if (!bot.demo && bot.workspaceId !== house) throw new AppError("conflict", "This bot is not a demo any more, so it cannot be claimed.")
    if (bot.workspaceId === input.toWorkspaceId) throw new AppError("conflict", "This bot is already in that workspace.")
    const [ws] = await db.select({ id: workspace.id, name: workspace.name }).from(workspace).where(eq(workspace.id, input.toWorkspaceId)).limit(1)
    if (!ws) throw new AppError("notfound", "That workspace could not be found.")

    const taken = await db.update(jawafClaim)
        .set({ claimedAt: sql`now()`, claimedWorkspaceId: ws.id, claimedByUserId: input.userId, linkOpenedAt: sql`coalesce(${jawafClaim.linkOpenedAt}, now())` })
        .where(and(eq(jawafClaim.id, c.id), isNull(jawafClaim.claimedAt), isNull(jawafClaim.revokedAt), sql`${jawafClaim.expiresAt} > now()`))
        .returning({ id: jawafClaim.id })
    if (!taken.length) throw new AppError("conflict", "This link was just used. Refresh the page.")

    const from = bot.workspaceId
    const moved = await moveJawafBot({ botId: bot.id, fromWorkspaceId: from, toWorkspaceId: ws.id, clearDemo: true })
    if (!moved) {
        // Someone moved it in between: give the link back rather than leave it dead with nothing claimed.
        await db.update(jawafClaim).set({ claimedAt: null, claimedWorkspaceId: null, claimedByUserId: null }).where(eq(jawafClaim.id, c.id))
        throw new AppError("conflict", "This bot moved while you were claiming it. Refresh and try again.")
    }
    // Every other open link for this bot dies with this one; the prospect moves to Pilot when it was earlier.
    await db.batch([
        db.update(jawafClaim).set({ revokedAt: sql`now()` })
            .where(and(eq(jawafClaim.botId, bot.id), isNull(jawafClaim.claimedAt), isNull(jawafClaim.revokedAt))),
        db.update(jawafProspect).set({ stage: sql`CASE WHEN ${jawafProspect.stage} IN ('sent', 'met') THEN 'pilot' ELSE ${jawafProspect.stage} END`, updatedAt: new Date() })
            .where(eq(jawafProspect.botId, bot.id)),
    ])
    if (c.createdByAdminId) {
        // The audit log is the admin console's; the row is filed under the admin who made the link.
        await db.insert(adminAuditLog).values({
            adminId: c.createdByAdminId, action: "UPDATE", module: "jawaf", resourceType: "JawafBot", resourceId: bot.id,
            description: `${bot.name} was claimed by ${input.userEmail} into ${ws.name}`,
            changes: { fromWorkspaceId: from, toWorkspaceId: ws.id, demo: { from: bot.demo, to: false } },
            metadata: { claimId: c.id, userId: input.userId },
        }).catch((err) => console.error("[jawaf] claim audit row failed", err instanceof Error ? err.message : err))
    }
    return { botId: bot.id, botName: bot.name }
}
