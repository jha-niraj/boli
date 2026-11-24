import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Page } from "@repo/ui/components/ui/page"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { START_DESCRIPTION, START_TITLE, StartCards } from "./_components/start-cards"

export const metadata: Metadata = { title: START_TITLE }

/** /start - "Choose where to start": where `/` sends a browser with no last product (lib/landing.ts). */
export default async function StartPage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.start}`)
    return (
        <Page title={START_TITLE} description={START_DESCRIPTION} body="page">
            <StartCards />
        </Page>
    )
}
