import type { Metadata } from "next"
import { ROUTES } from "@/lib/navigation"
import { getJawafContext } from "@/lib/jawaf/current-bot"
import { toBotSummary } from "@/lib/jawaf/bots"
import { botCounts } from "@/lib/jawaf/knowledge"
import { jawafGuard } from "./_components/jawaf-guard"
import { JawafHome } from "./_components/jawaf-home"

export const metadata: Metadata = { title: "Jawaf" }

/**
 * /jawaf - Jawaf Home. Until the bot is live: the setup banner with its 5-step checklist. Once live: a "Your Jawaf is
 * live" card with the public link. The full Home (stats, charts) is Wave 4 (plan task 11). Reads start here and seed
 * the client queries.
 */
export default async function JawafHomePage() {
    const { userId } = await jawafGuard(ROUTES.jawaf)
    const ctx = await getJawafContext(userId)
    const counts = ctx.bot ? await botCounts(ctx.bot.id) : null
    return <JawafHome key={ctx.bot?.id ?? "none"} bot={ctx.bot ? toBotSummary(ctx.bot) : null} counts={counts} can={ctx.can} />
}
