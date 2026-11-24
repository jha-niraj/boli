import type { Metadata } from "next"
import { Page } from "@repo/ui/components/ui/page"
import { JawafNoBot } from "@/components/jawaf/no-bot"
import { ROUTES } from "@/lib/navigation"
import { toBotView } from "@/lib/jawaf/bots"
import { getJawafContext } from "@/lib/jawaf/current-bot"
import { readNotifyPrefs } from "@/lib/jawaf/notify-prefs"
import { jawafGuard } from "../_components/jawaf-guard"
import { JAWAF_PAGES } from "../_components/jawaf-pages"
import { SettingsView } from "./_components/settings-view"

export const metadata: Metadata = { title: "Settings - Jawaf" }

/**
 * /jawaf/settings - the current bot's settings in tabs synced to ?tab=: Bot, Contact fields, Notifications, Data. The
 * bot and the person's notification choices are read here and seed the client queries.
 */
export default async function JawafSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { userId } = await jawafGuard(ROUTES.jawafSettings)
    const [ctx, sp] = await Promise.all([getJawafContext(userId), searchParams])
    const copy = JAWAF_PAGES.settings
    if (!ctx.bot) {
        return (
            <Page title={copy.title} description={copy.description} width="reading" body="page">
                <JawafNoBot what="Settings is where you change your bot's name, tone, the contact details it asks for and who gets told about new contacts." />
            </Page>
        )
    }
    const notify = await readNotifyPrefs(userId, ctx.bot.id)
    return <SettingsView key={ctx.bot.id} bot={toBotView(ctx.bot)} initialNotify={notify} initialTab={sp.tab} can={ctx.can} />
}
