import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { getHomeOverview } from "@/lib/platform/usage"
import { getSession } from "@/lib/session"
import { HomeView } from "./_components/home-view"

export const metadata: Metadata = { title: "Home" }

export default async function HomePage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.dashboard}`)
    const data = await getHomeOverview(session.user.id)
    return <HomeView initialData={data} />
}
