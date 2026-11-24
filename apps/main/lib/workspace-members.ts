import "server-only"
import { and, count, db, desc, eq, sql } from "@repo/db"
import { user, workspace, workspaceInvitation, workspaceMember } from "@repo/db/schema"
import { sha256Hex } from "@repo/crypto"
import { sendEmail, workspaceInvitationEmail } from "@repo/email"
import { AppError } from "@repo/errors"
import { SITE } from "@repo/core/site"
import { storageHref } from "@repo/storage"
import {
    accessSummary, effectiveAccess, MAX_WORKSPACE_MEMBERS, normalizeAccess, WORKSPACE_INVITE_DAYS, type WorkspaceAccess,
} from "@repo/boli/workspace-access"
import { WORKSPACE_ROUTES } from "@/lib/workspace-routes"
import type { InvitationRow, InviteResult, JoinPreview, MemberRow, MembersData } from "@/types/workspace"
import type { CurrentWorkspace } from "@/lib/workspace"

/**
 * Members and invitations of a workspace (copied in spirit from apps/admin's admin invitations, with the token hashed).
 * The CALLER has already checked the session and the role (actions/workspace.action.ts); every query here still
 * filters by the workspace id it is given, so an id from the client never reaches another workspace.
 *
 * Invitation tokens: 32 random bytes, base64url, shown once (the /join link). Only the SHA-256 hex is stored, so a
 * resend makes a NEW token and the old link stops working. One pending invitation per (workspace, email): inviting the
 * same address again refreshes it (new access, new link, new 7-day expiry).
 */

const DAY_MS = 86_400_000

function newToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function joinUrl(token: string): string {
    return `${SITE.url}${WORKSPACE_ROUTES.join}?token=${encodeURIComponent(token)}`
}

const productsLine = (access: WorkspaceAccess) => accessSummary({ role: "member", access })

type InvitationRaw = typeof workspaceInvitation.$inferSelect & { invitedByName?: string | null }

function toInvitationRow(r: InvitationRaw, now = Date.now()): InvitationRow {
    return {
        id: r.id,
        email: r.email,
        access: normalizeAccess(r.access),
        invitedByName: r.invitedByName ?? null,
        expiresAt: r.expiresAt.toISOString(),
        expired: r.expiresAt.getTime() < now,
        lastSentAt: r.lastSentAt.toISOString(),
        sentCount: r.sentCount,
    }
}

/** The members page: members (owner first) and pending invitations, one round trip. */
export async function membersOf(ws: CurrentWorkspace, viewerId: string): Promise<MembersData> {
    const [members, invites] = await db.batch([
        db.select({
            id: workspaceMember.id, userId: workspaceMember.userId, role: workspaceMember.role, access: workspaceMember.access,
            createdAt: workspaceMember.createdAt, name: user.name, email: user.email, image: user.image,
        }).from(workspaceMember)
            .innerJoin(user, eq(user.id, workspaceMember.userId))
            .where(eq(workspaceMember.workspaceId, ws.id))
            .orderBy(sql`case when ${workspaceMember.role} = 'owner' then 0 else 1 end`, workspaceMember.createdAt),
        db.select({ inv: workspaceInvitation, invitedByName: user.name }).from(workspaceInvitation)
            .leftJoin(user, eq(user.id, workspaceInvitation.invitedById))
            .where(and(eq(workspaceInvitation.workspaceId, ws.id), eq(workspaceInvitation.status, "pending")))
            .orderBy(desc(workspaceInvitation.lastSentAt)),
    ])
    const now = Date.now()
    return {
        workspace: { id: ws.id, name: ws.name, isPersonal: ws.isPersonal },
        viewerRole: ws.role,
        members: members.map((m): MemberRow => ({
            id: m.id,
            userId: m.userId,
            name: m.name,
            email: m.email,
            image: storageHref(m.image ?? null),
            role: m.role,
            access: effectiveAccess({ role: m.role, access: m.access }),
            joinedAt: m.createdAt.toISOString(),
            isYou: m.userId === viewerId,
        })),
        invitations: invites.map((r) => toInvitationRow({ ...r.inv, invitedByName: r.invitedByName }, now)),
    }
}

async function sendInvite(ws: { name: string }, inviterName: string | null, email: string, access: WorkspaceAccess, token: string): Promise<boolean> {
    const url = joinUrl(token)
    try {
        const r = await sendEmail({
            kind: "transactional",
            to: email,
            ...workspaceInvitationEmail({ workspaceName: ws.name, invitedBy: inviterName, products: productsLine(access), url, days: WORKSPACE_INVITE_DAYS }),
        })
        if (r.status === "failed") console.error("[workspace] invitation email failed:", r.error)
        return r.status === "sent"
    } catch (err) {
        console.error("[workspace] invitation email failed:", err instanceof Error ? err.message : err)
        return false
    }
}

/**
 * Invite an address with the given access. Already a member -> conflict. A pending invitation for the same address is
 * refreshed (new access, new token, new expiry) rather than duplicated. The email is sent inline (the owner waits a
 * second); a send that fails still keeps the invitation and returns the link to share by hand.
 */
export async function inviteToWorkspace(ws: CurrentWorkspace, inviter: { id: string; name: string | null }, email: string, access: WorkspaceAccess): Promise<InviteResult> {
    const address = email.trim().toLowerCase()
    const [[existing], [members], [pending]] = await db.batch([
        db.select({ id: workspaceMember.id }).from(workspaceMember)
            .innerJoin(user, eq(user.id, workspaceMember.userId))
            .where(and(eq(workspaceMember.workspaceId, ws.id), sql`lower(${user.email}) = ${address}`)).limit(1),
        db.select({ n: count() }).from(workspaceMember).where(eq(workspaceMember.workspaceId, ws.id)),
        db.select({ n: count() }).from(workspaceInvitation)
            .where(and(eq(workspaceInvitation.workspaceId, ws.id), eq(workspaceInvitation.status, "pending"))),
    ])
    if (existing) throw new AppError("conflict", `${address} is already a member of ${ws.name}.`)
    if (Number(members?.n ?? 0) + Number(pending?.n ?? 0) >= MAX_WORKSPACE_MEMBERS) {
        throw new AppError("conflict", `A workspace can have up to ${MAX_WORKSPACE_MEMBERS} members and invitations. Remove someone or revoke an invitation first.`)
    }

    const token = newToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + WORKSPACE_INVITE_DAYS * DAY_MS)
    const clean = normalizeAccess(access)
    const [row] = await db.insert(workspaceInvitation)
        .values({ workspaceId: ws.id, email: address, tokenHash: sha256Hex(token), access: clean, invitedById: inviter.id, expiresAt, lastSentAt: now })
        .onConflictDoUpdate({
            target: [workspaceInvitation.workspaceId, workspaceInvitation.email],
            targetWhere: sql`status = 'pending'`,
            set: { tokenHash: sha256Hex(token), access: clean, invitedById: inviter.id, expiresAt, lastSentAt: now, sentCount: sql`${workspaceInvitation.sentCount} + 1` },
        })
        .returning()
    if (!row) throw new AppError("unknown", "The invitation could not be saved. Try again.")
    const emailed = await sendInvite(ws, inviter.name, address, clean, token)
    return { invitation: toInvitationRow({ ...row, invitedByName: inviter.name }), emailed, joinUrl: joinUrl(token) }
}

/** Resend a pending invitation: a new link (the old one stops working) and a fresh 7-day expiry. */
export async function resendWorkspaceInvitation(ws: CurrentWorkspace, inviter: { id: string; name: string | null }, invitationId: string): Promise<InviteResult> {
    const token = newToken()
    const now = new Date()
    const [row] = await db.update(workspaceInvitation)
        .set({
            tokenHash: sha256Hex(token), expiresAt: new Date(now.getTime() + WORKSPACE_INVITE_DAYS * DAY_MS), lastSentAt: now,
            sentCount: sql`${workspaceInvitation.sentCount} + 1`,
        })
        .where(and(eq(workspaceInvitation.id, invitationId), eq(workspaceInvitation.workspaceId, ws.id), eq(workspaceInvitation.status, "pending")))
        .returning()
    if (!row) throw new AppError("notfound", "That invitation could not be found. It may have been accepted or revoked.")
    const access = normalizeAccess(row.access)
    const emailed = await sendInvite(ws, inviter.name, row.email, access, token)
    return { invitation: toInvitationRow({ ...row, invitedByName: inviter.name }), emailed, joinUrl: joinUrl(token) }
}

export async function revokeWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<void> {
    const rows = await db.update(workspaceInvitation).set({ status: "revoked" })
        .where(and(eq(workspaceInvitation.id, invitationId), eq(workspaceInvitation.workspaceId, workspaceId), eq(workspaceInvitation.status, "pending")))
        .returning({ id: workspaceInvitation.id })
    if (!rows.length) throw new AppError("notfound", "That invitation could not be found. It may have been accepted already.")
}

/** Change a MEMBER's access (an owner's access is everything and is not stored). */
export async function setMemberAccess(workspaceId: string, memberId: string, access: WorkspaceAccess): Promise<void> {
    const rows = await db.update(workspaceMember).set({ access: normalizeAccess(access), updatedAt: new Date() })
        .where(and(eq(workspaceMember.id, memberId), eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.role, "member")))
        .returning({ id: workspaceMember.id })
    if (!rows.length) throw new AppError("notfound", "That member could not be found. The owner's access cannot be changed.")
}

/**
 * Remove a MEMBER (never the owner). Their Kura chats in this workspace stay with the workspace; API keys they created
 * keep working until the owner revokes them on the API keys page.
 */
export async function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
    const rows = await db.delete(workspaceMember)
        .where(and(eq(workspaceMember.id, memberId), eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.role, "member")))
        .returning({ id: workspaceMember.id })
    if (!rows.length) throw new AppError("notfound", "That member could not be found. The owner cannot be removed.")
}

/** Leave a workspace you are a MEMBER of. An owner cannot leave (their personal workspace is theirs for good). */
export async function leaveWorkspaceAs(workspaceId: string, userId: string): Promise<void> {
    const rows = await db.delete(workspaceMember)
        .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId), eq(workspaceMember.role, "member")))
        .returning({ id: workspaceMember.id })
    if (!rows.length) throw new AppError("validation", "You can only leave a workspace someone else owns.")
}

export async function renameWorkspaceTo(workspaceId: string, name: string): Promise<void> {
    await db.update(workspace).set({ name, updatedAt: new Date() }).where(eq(workspace.id, workspaceId))
}

// ─── /join ──────────────────────────────────────────────────────────────────────────────────────────────────────────

async function findInvitation(token: string) {
    const [row] = await db
        .select({ inv: workspaceInvitation, workspaceName: workspace.name, invitedByName: user.name })
        .from(workspaceInvitation)
        .innerJoin(workspace, eq(workspace.id, workspaceInvitation.workspaceId))
        .leftJoin(user, eq(user.id, workspaceInvitation.invitedById))
        .where(eq(workspaceInvitation.tokenHash, sha256Hex(token)))
        .limit(1)
    return row ?? null
}

/** What /join shows for a token. A read: never writes. */
export async function previewInvitation(token: string): Promise<JoinPreview> {
    const found = await findInvitation(token)
    if (!found) return { state: "notfound", workspaceName: null, invitedByName: null, email: null, products: null, expiresAt: null }
    const { inv } = found
    const state = inv.status === "accepted" ? "accepted" : inv.status === "revoked" ? "revoked" : inv.expiresAt.getTime() < Date.now() ? "expired" : "valid"
    return {
        state,
        workspaceName: found.workspaceName,
        invitedByName: found.invitedByName,
        email: inv.email,
        products: productsLine(normalizeAccess(inv.access)),
        expiresAt: inv.expiresAt.toISOString(),
    }
}

/**
 * Accept: the signed-in person's email must be the invited one. The membership insert and the invitation's status move
 * in ONE batch (one round trip); accepting twice, or as someone already in the workspace, keeps the existing row.
 */
export async function acceptWorkspaceInvitation(token: string, me: { id: string; email: string }): Promise<{ workspaceId: string; workspaceName: string }> {
    const found = await findInvitation(token)
    if (!found) throw new AppError("notfound", "That invitation link is not valid. Ask for a new one.")
    const { inv } = found
    if (inv.status === "revoked") throw new AppError("validation", "This invitation was cancelled. Ask the owner for a new one.")
    if (inv.status === "accepted") {
        if (inv.acceptedById === me.id) return { workspaceId: inv.workspaceId, workspaceName: found.workspaceName }
        throw new AppError("validation", "This invitation was already used.")
    }
    if (inv.expiresAt.getTime() < Date.now()) throw new AppError("validation", "This invitation has expired. Ask the owner to send it again.")
    if (inv.email.toLowerCase() !== me.email.trim().toLowerCase()) {
        throw new AppError("forbidden", `This invitation is for ${inv.email}. Sign in with that address to accept it.`)
    }
    await db.batch([
        db.insert(workspaceMember)
            .values({ workspaceId: inv.workspaceId, userId: me.id, role: "member", access: normalizeAccess(inv.access), invitedById: inv.invitedById })
            .onConflictDoNothing({ target: [workspaceMember.workspaceId, workspaceMember.userId] }),
        db.update(workspaceInvitation).set({ status: "accepted", acceptedById: me.id, acceptedAt: new Date() })
            .where(and(eq(workspaceInvitation.id, inv.id), eq(workspaceInvitation.status, "pending"))),
    ])
    return { workspaceId: inv.workspaceId, workspaceName: found.workspaceName }
}
