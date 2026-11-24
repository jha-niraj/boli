import type { Metadata } from "next"
import { Page } from "@repo/ui/components/ui/page"
import { JawafNoBot } from "@/components/jawaf/no-bot"
import { ROUTES } from "@/lib/navigation"
import { unansweredQuestions } from "@/lib/jawaf/ask"
import { toBotView } from "@/lib/jawaf/bots"
import { getJawafContext } from "@/lib/jawaf/current-bot"
import { jawafGuard } from "../_components/jawaf-guard"
import { JAWAF_PAGES } from "../_components/jawaf-pages"
import { PlaygroundView } from "./_components/playground-view"

export const metadata: Metadata = { title: "Playground - Jawaf" }

/**
 * /jawaf/playground - ask the bot as a visitor would (always free), see the sources behind each reply, fix an answer
 * in one step, and work through the Unanswered and thumbs-down list beside the chat. The list is read here and seeds
 * its client query.
 */
export default async function JawafPlaygroundPage() {
    const { userId } = await jawafGuard(ROUTES.jawafPlayground)
    const ctx = await getJawafContext(userId)
    const copy = JAWAF_PAGES.playground
    if (!ctx.bot) {
        return (
            <Page title={copy.title} description={copy.description} body="page">
                <JawafNoBot what="The playground lets you ask your bot what customers ask, see where each answer came from and fix it in one step." />
            </Page>
        )
    }
    const unanswered = await unansweredQuestions(ctx.bot.id)
    return <PlaygroundView key={ctx.bot.id} bot={toBotView(ctx.bot)} initialUnanswered={unanswered} can={ctx.can} />
}
