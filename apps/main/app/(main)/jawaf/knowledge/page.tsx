import type { Metadata } from "next"
import { Page } from "@repo/ui/components/ui/page"
import { isStorageConfigured } from "@repo/storage"
import { JawafNoBot } from "@/components/jawaf/no-bot"
import { ROUTES } from "@/lib/navigation"
import { getJawafContext } from "@/lib/jawaf/current-bot"
import { botLimits } from "@/lib/jawaf/bots"
import { activeJobFor, toJobView } from "@/lib/jawaf/jobs"
import { listFacts, listNotes, listPages, listQa, listSources } from "@/lib/jawaf/knowledge"
import { jawafGuard } from "../_components/jawaf-guard"
import { JAWAF_PAGES } from "../_components/jawaf-pages"
import { KnowledgeView } from "./_components/knowledge-view"

export const metadata: Metadata = { title: "Knowledge - Jawaf" }

/**
 * /jawaf/knowledge - what the bot knows, in tabs synced to ?tab=: Facts, Pages, Files, Q&A, Notes. Every list is read
 * here in one parallel wave and seeds its client query (same key), so any tab paints at once and a switch never
 * waits; mutations invalidate.
 */
export default async function JawafKnowledgePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { userId } = await jawafGuard(ROUTES.jawafKnowledge)
    const [ctx, sp] = await Promise.all([getJawafContext(userId), searchParams])
    const copy = JAWAF_PAGES.knowledge
    if (!ctx.bot) {
        return (
            <Page title={copy.title} description={copy.description} body="page">
                <JawafNoBot what="Knowledge is everything your bot answers from: website pages, files, your fact sheet, Q&A and notes." />
            </Page>
        )
    }
    const bot = ctx.bot
    const [facts, qa, notes, pages, sources, files, job] = await Promise.all([
        listFacts(bot.id),
        listQa(bot.id),
        listNotes(bot.id),
        listPages(bot.id, { filter: "all" }),
        listSources(bot.id, ["site", "url", "qa_csv"]),
        listSources(bot.id, ["file"]),
        activeJobFor(bot.id),
    ])
    return (
        <KnowledgeView
            key={bot.id}
            botId={bot.id}
            website={bot.website}
            limits={botLimits(bot)}
            initialTab={sp.tab}
            initial={{ facts, qa, notes, pages, sources, files, job: job ? toJobView(job) : null }}
            storageReady={isStorageConfigured()}
            can={ctx.can}
        />
    )
}
