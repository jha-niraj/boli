import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { canUseProduct } from "@repo/boli/workspace-access"
import { ROUTES } from "@/lib/navigation"
import { getHomeOverview } from "@/lib/platform/usage"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceFor } from "@/lib/workspace"
import { ApiHomeView } from "./_components/api-home-view"
import { API_HOME_TITLE } from "./_components/api-home-skeleton"

export const metadata: Metadata = { title: API_HOME_TITLE }

/**
 * /api - the API product's Home (plan/main/jawaf/jawaf-v1.md): the API numbers, then "Start building" (the quickstart
 * in five languages beside the coding-agent prompt), moved here from the Boli overview (/home). It reads the same
 * overview as /home (one query, PLATFORM_KEYS.home) and shows only the API's part.
 *
 * The page lives at /api beside app/api (route handlers under /api/*): this folder has a page, that one has no root
 * route, so the two never resolve to the same path. middleware.ts protects /api (its matcher skips only `/api/`).
 */
export default async function ApiHomePage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.api}`)
    const ws = await getCurrentWorkspaceFor(session.user.id)
    if (!canUseProduct(ws, "api")) redirect(ROUTES.accessDenied)
    const data = await getHomeOverview(ws.id, session.user.id)
    return <ApiHomeView initialData={data} />
}
