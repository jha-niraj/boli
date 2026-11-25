import { z } from "zod"

/** A /claim/<token> link's token (32 random bytes, base64url - made in apps/admin actions/jawaf/claims.action.ts). */
export const jawafClaimTokenSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{30,100}$/, "That claim link is not valid.")

export const claimJawafBotSchema = z.object({
    token: jawafClaimTokenSchema,
    workspaceId: z.string().trim().min(1, "Choose a workspace.").max(64),
})
export type ClaimJawafBotInput = z.infer<typeof claimJawafBotSchema>
