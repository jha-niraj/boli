import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getApiKeys } from "@/actions/keys.action"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { canUseProduct } from "@repo/boli/workspace-access"
import { getCurrentWorkspaceFor } from "@/lib/workspace"
import { KeysView } from "./_components/keys-view"

export const metadata: Metadata = { title: "API keys" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** `?create=1` (Home's "Create API key") opens the create dialog on arrival. */
export default async function KeysPage({ searchParams }: { searchParams: SearchParams }) {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.keys}`)
    if (!canUseProduct(await getCurrentWorkspaceFor(session.user.id), "api")) redirect(ROUTES.accessDenied)
    const [res, sp] = await Promise.all([getApiKeys(), searchParams])
    if (!res.success) throw new Error(res.error ?? "Your API keys could not be loaded.")
    return <KeysView initialData={res.data} openCreate={sp.create === "1"} />
}
