"use server"

/**
 * Jawaf > Claims: one-time claim links for demo bots (jawaf_claim). The token is made here, shown ONCE and stored only
 * as its SHA-256; a new link for a bot revokes its older open ones. The email goes only when an admin presses Send
 * (transactional, from RESEND_FROM_EMAIL, reply-to the owning admin). The business opens /claim/<token> on the app.
 */
import { revalidatePath } from "next/cache"
import { and, db, eq, isNull, sql } from "@repo/db"
import { jawafClaim, jawafProspect, user } from "@repo/db/schema"
import { appBaseUrl } from "@repo/billing"
import { isEmailConfigured, jawafClaimEmail, sendEmail } from "@repo/email"
import { AppError, fail, failWith, ok, type ActionResult } from "@repo/errors"
import { requireAdminAction } from "../guard"
import { auditJawaf, getHouseOrNull, isHouse, listClaims, loadBotOr404, newClaimToken, sha256Hex } from "@/lib/jawaf"
import { generateClaimSchema, jawafIdSchema, sendClaimSchema, type SendClaimInput } from "@/schemas/jawaf"
import { CLAIM_DAYS, type ClaimView } from "@/types/jawaf"

const PATHS = ["/jawaf/claims", "/jawaf/demos"] as const

function revalidate() {
    for (const p of PATHS) revalidatePath(p)
}

export async function getJawafClaims(): Promise<ActionResult<ClaimView[]>> {
    try {
        await requireAdminAction("jawaf", "read")
        return ok(await listClaims())
    } catch (err) {
        return fail(err, "jawaf.claims.list")
    }
}

async function makeClaim(botId: string, prospectId: string | undefined, adminId: string): Promise<{ id: string; token: string; url: string; expiresAt: string }> {
    const bot = await loadBotOr404(botId)
    if (!isHouse(bot, await getHouseOrNull())) throw new AppError("conflict", "Only demo bots can be claimed. This one already belongs to a customer.")
    const token = newClaimToken()
    const expiresAt = new Date(Date.now() + CLAIM_DAYS * 86_400_000)
    const [, [row]] = await db.batch([
        db.update(jawafClaim).set({ revokedAt: sql`now()` }).where(and(eq(jawafClaim.botId, bot.id), isNull(jawafClaim.claimedAt), isNull(jawafClaim.revokedAt))),
        db.insert(jawafClaim).values({ botId: bot.id, prospectId: prospectId ?? null, tokenHash: await sha256Hex(token), createdByAdminId: adminId, expiresAt }).returning({ id: jawafClaim.id }),
    ])
    if (!row) throw new AppError("unknown", "The claim link could not be made. Try again.")
    return { id: row.id, token, url: `${appBaseUrl()}/claim/${token}`, expiresAt: expiresAt.toISOString() }
}

/** A new claim link (shown once). Any older open link for the bot stops working. */
export async function generateJawafClaim(input: { botId: string; prospectId?: string }): Promise<ActionResult<{ id: string; token: string; url: string; expiresAt: string }>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = generateClaimSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "That bot could not be found.")
        const bot = await loadBotOr404(parsed.data.botId)
        if (!isHouse(bot, await getHouseOrNull())) return failWith("conflict", "Only demo bots can be claimed. This one already belongs to a customer.")
        const made = await makeClaim(bot.id, parsed.data.prospectId, admin.id)
        await auditJawaf(admin.id, { action: "CREATE", resourceType: "JawafClaim", resourceId: made.id, description: `Made a claim link for ${bot.name}`, metadata: { botId: bot.id, expiresAt: made.expiresAt } })
        revalidate()
        return ok(made)
    } catch (err) {
        return fail(err, "jawaf.claims.generate")
    }
}

/**
 * Send the claim email (Nepali + English). With the token generated in this sheet a moment ago that link is sent;
 * otherwise a fresh link is made (the old one stops working). Marks Sent on the claim.
 */
export async function sendJawafClaimEmail(input: SendClaimInput): Promise<ActionResult<{ sentTo: string; url: string }>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const parsed = sendClaimSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the email.")
        if (!isEmailConfigured()) return failWith("conflict", "Email is not set up (RESEND_API_KEY is blank), so nothing can be sent. Copy the link instead.")
        const d = parsed.data
        const bot = await loadBotOr404(d.botId)
        if (!isHouse(bot, await getHouseOrNull())) return failWith("conflict", "Only demo bots can be claimed. This one already belongs to a customer.")

        let claim: { id: string; url: string } | null = null
        if (d.token) {
            const [hit] = await db.select({ id: jawafClaim.id }).from(jawafClaim)
                .where(and(eq(jawafClaim.tokenHash, await sha256Hex(d.token)), eq(jawafClaim.botId, bot.id), isNull(jawafClaim.claimedAt), isNull(jawafClaim.revokedAt), sql`${jawafClaim.expiresAt} > now()`)).limit(1)
            if (hit) claim = { id: hit.id, url: `${appBaseUrl()}/claim/${d.token}` }
        }
        if (!claim) claim = await makeClaim(bot.id, d.prospectId, admin.id)

        const [prospect] = d.prospectId
            ? await db.select({ business: jawafProspect.business, contactName: jawafProspect.contactName, ownerUserId: jawafProspect.ownerUserId }).from(jawafProspect).where(eq(jawafProspect.id, d.prospectId)).limit(1)
            : []
        const [owner] = prospect?.ownerUserId ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, prospect.ownerUserId)).limit(1) : []
        const replyTo = owner?.email ?? admin.email
        const r = await sendEmail({
            kind: "transactional",
            to: d.email,
            replyTo,
            ...jawafClaimEmail({
                businessName: prospect?.business ?? bot.name, contactName: prospect?.contactName, botName: bot.name,
                botUrl: `${appBaseUrl()}/j/${bot.slug}`, claimUrl: claim.url, days: CLAIM_DAYS, senderName: owner?.name ?? admin.name,
            }),
        })
        if (r.status !== "sent") return failWith("unknown", r.status === "failed" ? `The email was not sent: ${r.error}` : "The email was skipped: email is not set up.")
        await db.update(jawafClaim).set({ sentAt: sql`now()`, sentToEmail: d.email }).where(eq(jawafClaim.id, claim.id))
        await auditJawaf(admin.id, { action: "UPDATE", resourceType: "JawafClaim", resourceId: claim.id, description: `Sent the claim email for ${bot.name} to ${d.email}`, metadata: { replyTo } })
        revalidate()
        return ok({ sentTo: d.email, url: claim.url })
    } catch (err) {
        return fail(err, "jawaf.claims.send")
    }
}

export async function revokeJawafClaim(claimId: string): Promise<ActionResult<null>> {
    try {
        const admin = await requireAdminAction("jawaf", "write")
        const id = jawafIdSchema.safeParse(claimId)
        if (!id.success) return failWith("validation", "That link could not be found.")
        const rows = await db.update(jawafClaim).set({ revokedAt: sql`now()` })
            .where(and(eq(jawafClaim.id, id.data), isNull(jawafClaim.claimedAt), isNull(jawafClaim.revokedAt))).returning({ id: jawafClaim.id, botId: jawafClaim.botId })
        if (!rows.length) return failWith("conflict", "That link was already used or revoked.")
        await auditJawaf(admin.id, { action: "UPDATE", resourceType: "JawafClaim", resourceId: id.data, description: "Revoked a claim link", metadata: { botId: rows[0]!.botId } })
        revalidate()
        return ok(null)
    } catch (err) {
        return fail(err, "jawaf.claims.revoke")
    }
}
