import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { ModelsView } from "./_components/models-view"

export const metadata: Metadata = { title: "Models" }

/** The model catalogue: every model comes from lib/boli.ts (MODELS), so this page has no database read. */
export default async function ModelsPage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.models}`)
    return <ModelsView />
}
