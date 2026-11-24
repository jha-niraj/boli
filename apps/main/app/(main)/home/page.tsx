import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { GET_STARTED_COOKIE, getStartedHidden } from "@/lib/platform/get-started"
import { getHomeOverview } from "@/lib/platform/usage"
import { getSession } from "@/lib/session"
import { HomeView } from "./_components/home-view"

export const metadata: Metadata = { title: "Home" }

export default async function HomePage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.dashboard}`)
    const [data, jar] = await Promise.all([getHomeOverview(session.user.id), cookies()])
    return <HomeView initialData={data} startedHidden={getStartedHidden(jar.get(GET_STARTED_COOKIE)?.value, session.user.id)} />
}
