import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { getJawafContext } from "@/lib/jawaf/current-bot"
import { toBotSummary } from "@/lib/jawaf/bots"
import { activeJobFor, toJobView } from "@/lib/jawaf/jobs"
import { listFacts, listPages, listQa } from "@/lib/jawaf/knowledge"
import { jawafGuard } from "../_components/jawaf-guard"
import { SetupFlow, type SetupStepId } from "./_components/setup-flow"

export const metadata: Metadata = { title: "Set up Jawaf" }

/**
 * /jawaf/setup - onboarding (plan "Jawaf - knowledge": full page, skippable). A new bot (`?new=1`, or none yet) starts
 * at the business details; an existing draft bot resumes where its `setup_step` says (pick pages, reading, review).
 * A live bot has nothing to set up and goes Home. The data the resumed step needs is read here and seeds the client.
 */
export default async function JawafSetupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { userId } = await jawafGuard(ROUTES.jawafSetup)
    const [ctx, sp] = await Promise.all([getJawafContext(userId), searchParams])
    const fresh = sp.new === "1" || !ctx.bot
    const bot = fresh ? null : ctx.bot
    if (bot && (bot.status === "live" || ["try", "share", "done"].includes(bot.setupStep))) redirect(ROUTES.jawaf)

    const step: SetupStepId = !bot ? "details" : bot.setupStep === "reading" ? "reading" : bot.setupStep === "review" ? "review" : "pages"
    const [pages, job, facts, qa] = bot
        ? await Promise.all([
            step === "pages" ? listPages(bot.id, { filter: "all" }) : Promise.resolve([]),
            step === "reading" ? activeJobFor(bot.id) : Promise.resolve(null),
            step === "review" ? listFacts(bot.id) : Promise.resolve([]),
            step === "review" ? listQa(bot.id) : Promise.resolve([]),
        ])
        : [[], null, [], []]

    return (
        <SetupFlow
            key={bot?.id ?? "new"}
            initialStep={step}
            bot={bot ? toBotSummary(bot) : null}
            initialPages={pages}
            initialJob={job ? toJobView(job) : null}
            initialFacts={facts}
            initialQa={qa}
            canManage={ctx.can.manage}
            hasBots={ctx.bots.length > 0}
        />
    )
}
