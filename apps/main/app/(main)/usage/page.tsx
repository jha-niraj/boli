import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { getUsage } from "@/lib/platform/usage"
import { getSession } from "@/lib/session"
import { canUseProduct } from "@repo/boli/workspace-access"
import { getCurrentWorkspaceFor } from "@/lib/workspace"
import { usageQuerySchema } from "@/schemas/usage"
import { UsageView } from "./_components/usage-view"

export const metadata: Metadata = { title: "Usage" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** `?window=7d|30d|90d&source=all|kura|api&page=N` - read here, then kept in the URL by the client with replaceState. */
export default async function UsagePage({ searchParams }: { searchParams: SearchParams }) {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.usage}`)
    const [ws, sp] = await Promise.all([getCurrentWorkspaceFor(session.user.id), searchParams])
    // The workspace's usage (every member's calls): its owner and members with API access.
    if (!canUseProduct(ws, "api")) redirect(ROUTES.accessDenied)
    const parsed = usageQuerySchema.safeParse({ window: first(sp.window), source: first(sp.source), page: first(sp.page) })
    const q = parsed.success ? parsed.data : usageQuerySchema.parse({})
    const data = await getUsage(ws.id, q.window, q.source, q.page)
    return <UsageView initialData={data} />
}
