"use server"

/**
 * /claim/<token> (lib/jawaf/claim.ts): mark the link opened (a POST from the page, so a render never writes) and claim
 * the bot into a workspace the person owns. Every export checks what it needs itself and returns ActionResult.
 */
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireSession } from "@repo/auth/next"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { WORKSPACE_COOKIE } from "@repo/boli/workspace-access"
import { claimBot, markOpened } from "@/lib/jawaf/claim"
import { JAWAF_BOT_COOKIE } from "@/lib/jawaf/bot-cookie"
import { listMyWorkspacesFor, WORKSPACE_COOKIE_OPTIONS } from "@/lib/workspace"
import { claimJawafBotSchema, jawafClaimTokenSchema, type ClaimJawafBotInput } from "@/schemas/jawaf-claim"

/** Public on purpose (the link is opened before sign-in); it only stamps the first open of a real link. */
export async function markClaimOpened(token: string): Promise<ActionResult<null>> {
    try {
        const parsed = jawafClaimTokenSchema.safeParse(token)
        if (!parsed.success) return ok(null)
        await markOpened(parsed.data)
        return ok(null)
    } catch (err) {
        return fail(err, "jawaf.claim.opened")
    }
}

/** Move the demo bot into one of the person's OWN workspaces, then make it the current workspace and bot. */
export async function claimJawafBot(input: ClaimJawafBotInput): Promise<ActionResult<{ botId: string; botName: string }>> {
    try {
        const s = await requireSession({ fresh: true })
        const parsed = claimJawafBotSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the details.")
        const mine = await listMyWorkspacesFor(s.user.id)
        const target = mine.find((w) => w.id === parsed.data.workspaceId)
        if (!target) return failWith("forbidden", "Choose one of your own workspaces.")
        if (target.role !== "owner") return failWith("forbidden", `Only the owner of ${target.name} can add a bot to it. Choose a workspace you own.`)
        const r = await claimBot({ token: parsed.data.token, toWorkspaceId: target.id, userId: s.user.id, userEmail: s.user.email })
        const jar = await cookies()
        jar.set(WORKSPACE_COOKIE, target.id, WORKSPACE_COOKIE_OPTIONS)
        jar.set(JAWAF_BOT_COOKIE, r.botId, { path: "/", maxAge: 31536000, sameSite: "lax" })
        revalidatePath("/", "layout")
        return ok(r)
    } catch (err) {
        return fail(err, "jawaf.claim")
    }
}
