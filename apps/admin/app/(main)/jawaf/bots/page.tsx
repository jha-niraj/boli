import type { Metadata } from "next"
import { appBaseUrl } from "@repo/billing"
import { requireAdminPage } from "@/lib/admin-session"
import { listBots } from "@/lib/jawaf"
import { BotsView } from "./_components/bots-view"

export const metadata: Metadata = { title: "All bots" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** All bots (plan/admin/jawaf/admin-v1.md task 2). The read starts here and seeds the client query; `?bot=<id>` opens one. */
export default async function BotsPage({ searchParams }: { searchParams: SearchParams }) {
    await requireAdminPage("jawaf")
    const [sp, data] = await Promise.all([searchParams, listBots()])
    const bot = Array.isArray(sp.bot) ? sp.bot[0] : sp.bot
    return <BotsView initialData={data} mainUrl={appBaseUrl()} openBotId={bot ?? null} />
}
