import type { WorkspaceAccess, WorkspaceRole } from "@repo/boli/workspace-access"

/** View types for workspaces, members and invitations. Plain data: every date is an ISO string. */

export interface WorkspaceSummary {
    id: string
    name: string
    role: WorkspaceRole
    isPersonal: boolean
    current: boolean
}

export interface MemberRow {
    /** workspace_member.id */
    id: string
    userId: string
    name: string
    email: string
    image: string | null
    role: WorkspaceRole
    /** Effective access (an owner has everything). */
    access: WorkspaceAccess
    joinedAt: string
    isYou: boolean
}

export interface InvitationRow {
    id: string
    email: string
    access: WorkspaceAccess
    invitedByName: string | null
    expiresAt: string
    expired: boolean
    lastSentAt: string
    sentCount: number
}

export interface MembersData {
    workspace: { id: string; name: string; isPersonal: boolean }
    /** The viewer's own role here: only an owner invites, changes access and removes. */
    viewerRole: WorkspaceRole
    members: MemberRow[]
    invitations: InvitationRow[]
}

export interface InviteResult {
    invitation: InvitationRow
    /** False when the email could not be sent (no mail key, or the send failed): share `joinUrl` by hand. */
    emailed: boolean
    /** The /join link - shown once, right after inviting or resending (only its hash is stored). */
    joinUrl: string
}

export type JoinState = "valid" | "expired" | "revoked" | "accepted" | "notfound"

export interface JoinPreview {
    state: JoinState
    workspaceName: string | null
    invitedByName: string | null
    /** The address the invitation was sent to. */
    email: string | null
    products: string | null
    expiresAt: string | null
}
