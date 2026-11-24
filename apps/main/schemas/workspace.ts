import { z } from "zod"
import { JAWAF_LEVELS } from "@repo/boli/workspace-access"

/** Workspaces, members and invitations (actions/workspace.action.ts). */

export const workspaceIdSchema = z.string().trim().min(1).max(100)

export const workspaceNameSchema = z.string().trim().min(1, "Give the workspace a name.").max(60, "Keep the name under 60 characters.")

/** Per-product access, the shape of @repo/boli/workspace-access `WorkspaceAccess`. */
export const workspaceAccessSchema = z.object({
    kura: z.boolean(),
    api: z.boolean(),
    jawaf: z.object({ access: z.boolean(), level: z.enum(JAWAF_LEVELS) }),
})

export const renameWorkspaceSchema = z.object({ name: workspaceNameSchema })
export type RenameWorkspaceInput = z.infer<typeof renameWorkspaceSchema>

/** The rail's "Create workspace" dialog. */
export const createWorkspaceSchema = z.object({ name: workspaceNameSchema })
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>

export const inviteMemberSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
    access: workspaceAccessSchema,
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const updateMemberAccessSchema = z.object({
    memberId: workspaceIdSchema,
    access: workspaceAccessSchema,
})
export type UpdateMemberAccessInput = z.infer<typeof updateMemberAccessSchema>

/** The /join token: 43 base64url characters (32 random bytes). */
export const invitationTokenSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{20,100}$/, "That invitation link is not valid.")
