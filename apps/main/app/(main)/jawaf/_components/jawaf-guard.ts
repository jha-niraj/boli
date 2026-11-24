import "server-only"
import { redirect } from "next/navigation"
import { canUseProduct } from "@repo/boli/workspace-access"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceFor } from "@/lib/workspace"

/**
 * Every Jawaf page checks the session and the current workspace's Jawaf access itself (the layout's check is not
 * enough). Returns the signed-in person's id for `getJawafContext` (lib/jawaf/current-bot.ts).
 */
export async function jawafGuard(returnTo: string): Promise<{ userId: string }> {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${returnTo}`)
    if (!canUseProduct(await getCurrentWorkspaceFor(session.user.id), "jawaf")) redirect(ROUTES.accessDenied)
    return { userId: session.user.id }
}
