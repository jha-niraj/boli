"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowRight, Check, Copy, ExternalLink, MessageSquareText } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { DISPLAY } from "@repo/brand/type"
import { getJawafBotCounts, updateJawafBot } from "@/actions/jawaf/bots.action"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { SkyBar } from "@/components/jawaf/job-progress"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { jawafPublicLabel, jawafPublicUrl } from "@/components/jawaf/public-link"
import type { JawafCan } from "@/lib/jawaf/current-bot"
import { ROUTES } from "@/lib/navigation"
import type { JawafBotCounts, JawafBotSummary } from "@/types/jawaf"
import { JAWAF_PAGES } from "./jawaf-pages"

const COPY = JAWAF_PAGES.home

export interface ChecklistStep {
    id: "business" | "pages" | "facts" | "try" | "share"
    label: string
    hint: string
    done: boolean
    href: string
    action: string
}

/** The five setup steps (plan: Business details, Pages read, Facts approved, Test in playground, Share your link). */
export function setupChecklist(bot: JawafBotSummary | null, counts: JawafBotCounts | null): ChecklistStep[] {
    const step = bot?.setupStep ?? "business"
    const read = (counts?.pagesRead ?? 0) + (counts?.files ?? 0)
    return [
        { id: "business", label: "Business details", hint: "Type, name, link and tone", done: !!bot, href: ROUTES.jawafSetup, action: "Start" },
        {
            id: "pages", label: "Pages read", hint: read ? `${read} ${read === 1 ? "source" : "sources"} read` : "Your website or files",
            done: read > 0, href: step === "pages" || step === "reading" ? ROUTES.jawafSetup : `${ROUTES.jawafKnowledge}?tab=pages`, action: "Read pages",
        },
        {
            id: "facts", label: "Facts approved", hint: counts?.factsDraft ? `${counts.factsDraft} waiting for you` : "About, prices, hours and more",
            done: (counts?.factsApproved ?? 0) > 0 && (counts?.factsDraft ?? 0) === 0, href: step === "review" ? ROUTES.jawafSetup : ROUTES.jawafKnowledge, action: "Review",
        },
        { id: "try", label: "Test in playground", hint: "Ask it what customers ask", done: step === "share" || step === "done", href: ROUTES.jawafPlayground, action: "Try it" },
        { id: "share", label: "Share your link", hint: bot ? jawafPublicLabel(bot.slug) : "A link and a QR code", done: step === "done", href: ROUTES.jawafShare, action: "Share" },
    ]
}

function useCopyLink(bot: JawafBotSummary | null, canEdit: boolean) {
    const router = useRouter()
    const mark = useMutation({
        mutationFn: async () => {
            if (!bot || bot.setupStep === "done" || !canEdit) return
            unwrap(await updateJawafBot({ botId: bot.id, setupStep: "done" }))
        },
        // The checklist reads the bot's setup step from the server render.
        onSuccess: () => router.refresh(),
    })
    const [copied, setCopied] = React.useState(false)
    const copy = React.useCallback(async () => {
        if (!bot) return
        try {
            await navigator.clipboard.writeText(jawafPublicUrl(bot.slug))
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
            toast.success("Link copied")
            mark.mutate()
        } catch {
            toast.error("Could not copy. Select the link and copy it yourself.")
        }
    }, [bot, mark])
    return { copy, copied }
}

/** Jawaf Home: the setup banner until the bot is live, then the live card. Wave 4 fills the rest (stats, charts). */
export function JawafHome({ bot, counts: initialCounts, can }: { bot: JawafBotSummary | null; counts: JawafBotCounts | null; can: JawafCan }) {
    const countsQuery = useQuery({
        queryKey: JAWAF_KEYS.counts(bot?.id ?? "none"),
        queryFn: async () => (bot ? unwrap(await getJawafBotCounts(bot.id)) : null),
        initialData: initialCounts,
        enabled: !!bot,
    })
    const counts = countsQuery.data ?? null
    const live = bot?.status === "live"

    return (
        <Page title={COPY.title} description={COPY.description} body="page">
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                {live && bot ? <LiveCard bot={bot} canEdit={can.edit} /> : <SetupBanner bot={bot} counts={counts} canEdit={can.edit} />}
                <section className={cn(JAWAF_CARD, "flex min-w-0 items-start gap-3 p-4")}>
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <MessageSquareText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Answers at a glance</h2>
                        <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                            Questions answered, new contacts and what people ask most will show here once visitors start chatting.
                        </p>
                    </div>
                </section>
            </div>
        </Page>
    )
}

function SetupBanner({ bot, counts, canEdit }: { bot: JawafBotSummary | null; counts: JawafBotCounts | null; canEdit: boolean }) {
    const steps = setupChecklist(bot, counts)
    const done = steps.filter((s) => s.done).length
    const next = steps.find((s) => !s.done)
    const { copy, copied } = useCopyLink(bot, canEdit)
    return (
        <section className={cn(JAWAF_CARD, "overflow-hidden")}>
            <DashDhaka height={9} />
            <div className="relative grid min-w-0 gap-5 bg-gradient-to-b from-boli-sky-soft/70 to-transparent p-5 sm:grid-cols-[1fr_auto] sm:p-6 dark:from-boli-sky-soft/20">
                <div className="flex min-w-0 flex-col gap-3">
                    <p className="text-xs font-medium text-boli-sky-ink">Setup - {done} of {steps.length} done</p>
                    <h2 className="text-2xl text-neutral-900 dark:text-white" style={DISPLAY.card}>
                        {bot ? "Finish setting up your bot" : "Set up your answer bot"}
                    </h2>
                    <p className="max-w-[60ch] text-sm text-neutral-600 dark:text-neutral-400">
                        Point Jawaf at your website and files, check the facts it found, then share one link. It answers in Nepali, Romanized Nepali and English.
                    </p>
                    <SkyBar percent={Math.round((done / steps.length) * 100)} className="max-w-md" />
                    {next ? (
                        <Button asChild size="sm" className="mt-1 w-fit cursor-pointer gap-1.5">
                            <AppLink href={next.href}>{bot ? "Continue setup" : "Start setup"} <ArrowRight className="h-3.5 w-3.5" /></AppLink>
                        </Button>
                    ) : null}
                </div>
                <ArtRoot className="hidden w-56 self-start overflow-hidden rounded-xl ring-1 ring-inset ring-neutral-200 sm:block dark:ring-neutral-800">
                    <div className="dark:hidden"><PixelVignette id="jawafCounter" variant="day" className="block aspect-[96/60] w-full" /></div>
                    <div className="hidden dark:block"><PixelVignette id="jawafCounter" variant="gold" className="block aspect-[96/60] w-full" /></div>
                </ArtRoot>
            </div>
            <ol className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {steps.map((s, i) => (
                    <li key={s.id} className="flex min-w-0 items-center gap-3 px-5 py-3 sm:px-6">
                        <span
                            aria-hidden
                            className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                                s.done ? "bg-boli-sky text-white dark:bg-boli-sky-dark dark:text-neutral-950" : "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
                            )}
                        >
                            {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className={cn("truncate text-sm font-medium", s.done ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-900 dark:text-white")}>
                                {s.label}<span className="sr-only">{s.done ? " - done" : " - to do"}</span>
                            </p>
                            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{s.hint}</p>
                        </div>
                        {s.id === "share" && bot && !s.done ? (
                            <Button type="button" variant="outline" size="sm" className="shrink-0 cursor-pointer gap-1.5" onClick={copy}>
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy link
                            </Button>
                        ) : !s.done && (s.id === "business" || bot) ? (
                            <Button asChild variant={s === next ? "default" : "ghost"} size="sm" className="shrink-0 cursor-pointer">
                                <AppLink href={s.href}>{s.action}</AppLink>
                            </Button>
                        ) : null}
                    </li>
                ))}
            </ol>
        </section>
    )
}

function LiveCard({ bot, canEdit }: { bot: JawafBotSummary; canEdit: boolean }) {
    const { copy, copied } = useCopyLink(bot, canEdit)
    const url = jawafPublicUrl(bot.slug)
    return (
        <section className={cn(JAWAF_CARD, "overflow-hidden")}>
            <DashDhaka height={9} />
            <div className="grid min-w-0 gap-5 bg-gradient-to-b from-boli-sky-soft/70 to-transparent p-5 sm:grid-cols-[1fr_auto] sm:p-6 dark:from-boli-sky-soft/20">
                <div className="flex min-w-0 flex-col gap-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-boli-sky-ink">
                        <span aria-hidden className="size-1.5 rounded-full bg-boli-sky dark:bg-boli-sky-dark" /> Live
                    </p>
                    <h2 className="text-2xl text-neutral-900 dark:text-white" style={DISPLAY.card}>Your Jawaf is live</h2>
                    <p className="max-w-[60ch] text-sm text-neutral-600 dark:text-neutral-400">
                        Anyone with the link can ask {bot.name} a question - no sign-in. Put it on your Facebook page, your WhatsApp status or a printed QR code.
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="min-w-0 max-w-full truncate rounded-full bg-white px-3.5 py-1.5 font-mono text-xs text-neutral-900 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-100 dark:ring-neutral-800">
                            {jawafPublicLabel(bot.slug)}
                        </span>
                        <Button type="button" size="sm" className="cursor-pointer gap-1.5" onClick={copy}>
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy link
                        </Button>
                        <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
                            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                        </Button>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Keep it sharp: <AppLink href={ROUTES.jawafPlayground} className="text-boli-sky-ink underline-offset-4 hover:underline">try it in the playground</AppLink> and fix any answer in one step.
                    </p>
                </div>
                <ArtRoot className="hidden w-56 self-start overflow-hidden rounded-xl ring-1 ring-inset ring-neutral-200 sm:block dark:ring-neutral-800">
                    <div className="dark:hidden"><PixelVignette id="jawafCounter" variant="day" className="block aspect-[96/60] w-full" /></div>
                    <div className="hidden dark:block"><PixelVignette id="jawafCounter" variant="gold" className="block aspect-[96/60] w-full" /></div>
                </ArtRoot>
            </div>
        </section>
    )
}
