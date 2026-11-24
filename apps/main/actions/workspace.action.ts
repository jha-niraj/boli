"use server"

/**
 * Workspaces, members and invitations (plan/main/jawaf/jawaf-v1.md, "Accounts and teams"). Every export is a public
 * endpoint: each checks the session itself, validates its input with schemas/workspace.ts and returns ActionResult.
 * Owner-only writes go through `requireWorkspaceOwner()` (the CURRENT workspace, validated against membership). The
 * logic lives in lib/workspace-members.ts (server-only); only async functions are exported here. The rail's switcher
 * (listMyWorkspaces, switchWorkspace) lives in ./workspace-switch.action.ts, so the shell layout registers only those.
 */
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { WORKSPACE_COOKIE } from "@repo/boli/workspace-access"
import { requireSession } from "@/lib/session"
import { getCurrentWorkspaceFor, requireWorkspaceOwner, WORKSPACE_COOKIE_OPTIONS } from "@/lib/workspace"
import {
    acceptWorkspaceInvitation, inviteToWorkspace, leaveWorkspaceAs, membersOf, removeWorkspaceMember, renameWorkspaceTo,
    resendWorkspaceInvitation, revokeWorkspaceInvitation, setMemberAccess,
} from "@/lib/workspace-members"
import { WORKSPACE_ROUTES } from "@/lib/workspace-routes"
import {
    invitationTokenSchema, inviteMemberSchema, renameWorkspaceSchema, updateMemberAccessSchema, workspaceIdSchema,
    type InviteMemberInput, type RenameWorkspaceInput, type UpdateMemberAccessInput,
} from "@/schemas/workspace"
import type { InviteResult, MembersData } from "@/types/workspace"

const firstIssue = (e: { issues: { message: string }[] }, fallback: string) => e.issues[0]?.message ?? fallback

export async function renameWorkspace(input: RenameWorkspaceInput): Promise<ActionResult<{ name: string }>> {
    try {
        await requireSession({ fresh: true })
        const parsed = renameWorkspaceSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", firstIssue(parsed.error, "Give the workspace a name."))
        const ws = await requireWorkspaceOwner()
        await renameWorkspaceTo(ws.id, parsed.data.name)
        revalidatePath("/", "layout")
        return ok({ name: parsed.data.name })
    } catch (err) {
        return fail(err, "workspace.rename")
    }
}

/** The members page: members and pending invitations of the CURRENT workspace (any member may look). */
export async function listMembers(): Promise<ActionResult<MembersData>> {
    try {
        const s = await requireSession()
        const ws = await getCurrentWorkspaceFor(s.user.id)
        return ok(await membersOf(ws, s.user.id))
    } catch (err) {
        return fail(err, "workspace.members")
    }
}

export async function inviteMember(input: InviteMemberInput): Promise<ActionResult<InviteResult>> {
    try {
        const s = await requireSession({ fresh: true })
        const parsed = inviteMemberSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", firstIssue(parsed.error, "Check the email address."))
        if (parsed.data.email === s.user.email.trim().toLowerCase()) return failWith("validation", "You are already in this workspace.")
        const ws = await requireWorkspaceOwner()
        const result = await inviteToWorkspace(ws, { id: s.user.id, name: s.user.name }, parsed.data.email, parsed.data.access)
        revalidatePath(WORKSPACE_ROUTES.members)
        return ok(result)
    } catch (err) {
        return fail(err, "workspace.invite")
    }
}

export async function updateMemberAccess(input: UpdateMemberAccessInput): Promise<ActionResult<null>> {
    try {
        await requireSession({ fresh: true })
        const parsed = updateMemberAccessSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", firstIssue(parsed.error, "Check the access choices."))
        const ws = await requireWorkspaceOwner()
        await setMemberAccess(ws.id, parsed.data.memberId, parsed.data.access)
        revalidatePath(WORKSPACE_ROUTES.members)
        return ok(null)
    } catch (err) {
        return fail(err, "workspace.member_access")
    }
}

export async function removeMember(memberId: string): Promise<ActionResult<null>> {
    try {
        await requireSession({ fresh: true })
        const parsed = workspaceIdSchema.safeParse(memberId)
        if (!parsed.success) return failWith("validation", "That member could not be found.")
        const ws = await requireWorkspaceOwner()
        await removeWorkspaceMember(ws.id, parsed.data)
        revalidatePath(WORKSPACE_ROUTES.members)
        return ok(null)
    } catch (err) {
        return fail(err, "workspace.member_remove")
    }
}

/** Leave a workspace someone else owns; the current workspace falls back to the person's personal one. */
export async function leaveWorkspace(id: string): Promise<ActionResult<null>> {
    try {
        const s = await requireSession({ fresh: true })
        const parsed = workspaceIdSchema.safeParse(id)
        if (!parsed.success) return failWith("validation", "That workspace could not be found.")
        await leaveWorkspaceAs(parsed.data, s.user.id)
        const jar = await cookies()
        if (jar.get(WORKSPACE_COOKIE)?.value === parsed.data) jar.delete(WORKSPACE_COOKIE)
        revalidatePath("/", "layout")
        return ok(null)
    } catch (err) {
        return fail(err, "workspace.leave")
    }
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult<null>> {
    try {
        await requireSession({ fresh: true })
        const parsed = workspaceIdSchema.safeParse(invitationId)
        if (!parsed.success) return failWith("validation", "That invitation could not be found.")
        const ws = await requireWorkspaceOwner()
        await revokeWorkspaceInvitation(ws.id, parsed.data)
        revalidatePath(WORKSPACE_ROUTES.members)
        return ok(null)
    } catch (err) {
        return fail(err, "workspace.invite_revoke")
    }
}

export async function resendInvitation(invitationId: string): Promise<ActionResult<InviteResult>> {
    try {
        const s = await requireSession({ fresh: true })
        const parsed = workspaceIdSchema.safeParse(invitationId)
        if (!parsed.success) return failWith("validation", "That invitation could not be found.")
        const ws = await requireWorkspaceOwner()
        const result = await resendWorkspaceInvitation(ws, { id: s.user.id, name: s.user.name }, parsed.data)
        revalidatePath(WORKSPACE_ROUTES.members)
        return ok(result)
    } catch (err) {
        return fail(err, "workspace.invite_resend")
    }
}

/** /join: accept as the signed-in person (their email must be the invited one), then make it the current workspace. */
export async function acceptInvitation(token: string): Promise<ActionResult<{ workspaceId: string; workspaceName: string }>> {
    try {
        const s = await requireSession({ fresh: true })
        const parsed = invitationTokenSchema.safeParse(token)
        if (!parsed.success) return failWith("validation", "That invitation link is not valid. Ask for a new one.")
        const joined = await acceptWorkspaceInvitation(parsed.data, { id: s.user.id, email: s.user.email })
        const jar = await cookies()
        jar.set(WORKSPACE_COOKIE, joined.workspaceId, WORKSPACE_COOKIE_OPTIONS)
        revalidatePath("/", "layout")
        return ok(joined)
    } catch (err) {
        return fail(err, "workspace.accept")
    }
}
