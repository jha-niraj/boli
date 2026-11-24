"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { DISPLAY } from "@repo/brand/type"
import { getActiveJawafJob } from "@/actions/jawaf/knowledge.action"
import { JobProgress } from "@/components/jawaf/job-progress"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { useJawafJob } from "@/components/jawaf/use-jawaf-job"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { ROUTES } from "@/lib/navigation"
import type { JawafBotSummary, JawafJobView } from "@/types/jawaf"

/**
 * Step 4 - live reading progress. Polls the tick route every ~1.5 s while the page is open (each tick also moves the
 * job on); the hourly cron carries on when the tab closes, so leaving is fine. When it finishes (the first read also
 * drafts the fact sheet), Review opens.
 */
export function SetupReading({ bot, job: given, onDone }: { bot: JawafBotSummary; job: JawafJobView | null; onDone: () => void }) {
    // Resumed with no job in hand (a reload): ask for the running one; none means it already finished.
    const active = useQuery({
        queryKey: JAWAF_KEYS.activeJob(bot.id),
        queryFn: async () => unwrap(await getActiveJawafJob(bot.id)),
        enabled: !given,
    })
    const initial = given ?? active.data ?? null
    if (!given && active.isPending) return <ReadingFrame><p className="text-sm text-neutral-600 dark:text-neutral-400">Checking the reading...</p></ReadingFrame>
    if (!initial) {
        return (
            <ReadingFrame>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">Reading is finished.</p>
                <Button type="button" className="w-fit cursor-pointer gap-1.5" onClick={onDone}>Review what we found <ArrowRight className="h-3.5 w-3.5" /></Button>
            </ReadingFrame>
        )
    }
    return <ReadingLive initial={initial} onDone={onDone} />
}

function ReadingLive({ initial, onDone }: { initial: JawafJobView; onDone: () => void }) {
    const { job, lost } = useJawafJob(initial, { onSettled: (j) => { if (j.status === "done") window.setTimeout(onDone, 900) } })
    const stopped = job && (job.status === "failed" || job.status === "cancelled")
    return (
        <ReadingFrame>
            <JobProgress job={job} lost={lost} />
            {stopped ? (
                <Button type="button" variant="outline" className="w-fit cursor-pointer gap-1.5" onClick={onDone}>
                    Review what was read <ArrowRight className="h-3.5 w-3.5" />
                </Button>
            ) : (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    You can leave, we keep going. <AppLink href={ROUTES.jawaf} className="text-boli-sky-ink underline-offset-4 hover:underline">Go to Jawaf Home</AppLink> - your setup waits there.
                </p>
            )}
        </ReadingFrame>
    )
}

function ReadingFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl text-neutral-900 sm:text-4xl dark:text-white" style={DISPLAY.h3}>Reading your website</h2>
                <p className="max-w-[64ch] text-sm text-neutral-600 dark:text-neutral-400">
                    Jawaf reads each page, keeps it for search, then drafts your fact sheet - about, services, prices, hours, location and common questions.
                </p>
            </div>
            <section className={cn(JAWAF_CARD, "overflow-hidden")}>
                <DashDhaka height={9} />
                <div className="grid min-w-0 gap-5 bg-gradient-to-b from-boli-sky-soft/70 to-transparent p-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:p-6 dark:from-boli-sky-soft/20">
                    <div className="flex min-w-0 flex-col justify-center gap-4">{children}</div>
                    <ArtRoot className="hidden overflow-hidden rounded-xl ring-1 ring-inset ring-neutral-200 sm:block dark:ring-neutral-800">
                        <div className="dark:hidden"><PixelVignette id="docsDesk" variant="day" className="block aspect-[96/60] w-full" /></div>
                        <div className="hidden dark:block"><PixelVignette id="docsDesk" variant="gold" className="block aspect-[96/60] w-full" /></div>
                    </ArtRoot>
                </div>
            </section>
        </div>
    )
}
