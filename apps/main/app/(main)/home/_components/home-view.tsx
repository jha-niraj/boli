"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, Coins, KeyRound, MessagesSquare, Plus, Sigma, Terminal, Zap } from "lucide-react"
import { SITE } from "@repo/core/site"
import { AppLink } from "@repo/ui/components/app-link"
import { ChartPanel } from "@repo/ui/components/charts/panel-charts"
import { Button } from "@repo/ui/components/ui/button"
import { EmptyState } from "@repo/ui/components/ui/empty-state"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { getHomeData } from "@/actions/usage.action"
import { CodeTabs, CopyButton } from "@/components/brand/code-tabs"
import { RequestDetailRows } from "@/components/platform/request-detail"
import { SpendChart } from "@/components/platform/spend-chart"
import { formatCredits, MAX_API_KEYS } from "@/lib/boli"
import { buildSamples, codingAgentPrompt } from "@/lib/code-samples"
import { formatTokens } from "@/lib/format"
import { ROUTES } from "@/lib/navigation"
import { addTotals, formatFullDateTime, PLATFORM_KEYS, TIME_ZONE } from "@/lib/platform-display"
import type { ActivityItem, HomeData } from "@/types/platform"
import { HOME_DESCRIPTION, HOME_TITLE } from "./home-skeleton"

export function HomeView({ initialData }: { initialData: HomeData }) {
    const { data } = useQuery({
        queryKey: PLATFORM_KEYS.home,
        queryFn: async () => {
            const r = await getHomeData()
            if (!r.success) throw new Error(r.error ?? "Home could not be loaded.")
            return r.data
        },
        initialData,
    })
    const [selected, setSelected] = React.useState<ActivityItem | null>(null)
    const [sheetOpen, setSheetOpen] = React.useState(false)

    const today = addTotals(data.buckets.kura.today, data.buckets.api.today)
    const week = addTotals(data.buckets.kura.last7, data.buckets.api.last7)
    const items: StatBandItem[] = [
        {
            key: "credits", icon: Coins, label: "Credits left", value: formatCredits(data.balanceMicro), href: ROUTES.billing,
            hint: data.balanceMicro <= 0 ? "add credits to keep going" : "1 credit = Rs 1", tone: data.balanceMicro <= 0 ? "rose" : undefined,
        },
        { key: "today", icon: Zap, label: "Requests today", value: today.requests.toLocaleString("en-US"), hint: `${formatCredits(today.costMicro)} credits`, href: ROUTES.usage },
        { key: "tokens", icon: Sigma, label: "Tokens this week", value: formatTokens(week.inputTokens + week.outputTokens), hint: "last 7 days, in + out", href: ROUTES.usage },
        { key: "keys", icon: KeyRound, label: "Active API keys", value: data.activeKeys.toLocaleString("en-US"), hint: `of ${MAX_API_KEYS}`, href: ROUTES.keys },
    ]

    const samples = React.useMemo(() => buildSamples({ baseUrl: SITE.url }), [])
    const prompt = React.useMemo(() => codingAgentPrompt(SITE.url), [])

    function open(item: ActivityItem) {
        setSelected(item)
        setSheetOpen(true)
    }

    return (
        <Page title={HOME_TITLE} description={HOME_DESCRIPTION} body="page">
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <StatBand items={items} />

                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    <ChartPanel title="Credits spent per day" hint="Last 30 days, Kura and API" href={ROUTES.usage}>
                        <SpendChart days={data.daily} emptyMessage="Nothing spent in the last 30 days" />
                    </ChartPanel>

                    <section className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">Recent activity</h2>
                        <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">Your latest Kura chats and API calls</p>
                        {data.recent.length === 0 ? (
                            <EmptyState
                                className="flex-1 p-4 sm:p-4"
                                icon={<MessagesSquare />}
                                title="Nothing here yet"
                                description="Chat in Kura or call the API and it shows up here."
                            />
                        ) : (
                            <ScrollArea orientation="vertical" className="mt-2 min-w-0" viewportClassName="max-h-[16rem]">
                                <ul className="flex min-w-0 flex-col">
                                    {data.recent.map((r) => {
                                        const Icon = r.kind === "kura" ? MessagesSquare : Terminal
                                        const title = r.kind === "kura" ? (r.title || "Untitled chat") : (r.request.keyName ?? "Deleted key")
                                        const meta = r.kind === "kura" ? "Kura" : r.request.status === "error" ? `API - failed${r.request.errorCode ? ` (${r.request.errorCode})` : ""}` : `API - ${formatCredits(r.request.costMicro)} cr`
                                        const active = sheetOpen && selected?.kind === r.kind && selected.id === r.id
                                        return (
                                            <li key={`${r.kind}-${r.id}`}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    data-sheet-keep-open=""
                                                    onClick={() => open(r)}
                                                    className={cn("h-auto min-h-10 w-full min-w-0 justify-start gap-3 rounded-lg px-2 py-1.5 font-normal", active && "bg-neutral-100 dark:bg-neutral-800")}
                                                >
                                                    <Icon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                                                    <span className="min-w-0 flex-1 truncate text-left text-sm text-neutral-900 dark:text-white">{title}</span>
                                                    <span className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400">
                                                        {meta} - <RelativeTime value={r.at} timeZone={TIME_ZONE} />
                                                    </span>
                                                </Button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </ScrollArea>
                        )}
                    </section>
                </div>

                <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Start building</h2>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">Create a key, put it in your .env as BOLI_API_KEY, then make your first call.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="gap-1.5">
                                <AppLink href={ROUTES.doc("quickstart")}><BookOpen className="h-3.5 w-3.5" /> Docs</AppLink>
                            </Button>
                            <Button asChild size="sm" className="gap-1.5">
                                <AppLink href={`${ROUTES.keys}?create=1`}><Plus className="h-3.5 w-3.5" /> Create API key</AppLink>
                            </Button>
                        </div>
                    </div>
                    <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
                        <div className="flex min-w-0 flex-col gap-2">
                            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Quickstart</p>
                            <CodeTabs samples={samples} defaultLanguage="python" />
                        </div>
                        <div className="flex min-w-0 flex-col gap-2">
                            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Paste this into any coding agent</p>
                            <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                                <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">Sets up the key and makes one call</span>
                                    <CopyButton text={prompt} />
                                </div>
                                <ScrollArea orientation="vertical" className="min-w-0" viewportClassName="max-h-[18rem]">
                                    <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-neutral-800 dark:text-neutral-200">{prompt}</pre>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <ActivitySheet item={selected} open={sheetOpen} onOpenChange={setSheetOpen} onExitComplete={() => setSelected(null)} />
        </Page>
    )
}

/** One activity item in the keep-open right sheet: a Kura chat's totals, or an API call's every field. */
function ActivitySheet({ item, open, onOpenChange, onExitComplete }: {
    item: ActivityItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="truncate">
                        {item ? (item.kind === "kura" ? (item.title || "Untitled chat") : "API request") : "Activity"}
                    </SheetTitle>
                    <SheetDescription className="truncate">
                        {item ? (item.kind === "kura" ? `Kura chat - last active ${formatFullDateTime(item.at)}` : formatFullDateTime(item.at)) : ""}
                    </SheetDescription>
                </SheetHeader>
                {item ? (
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-3 px-6 pb-2">
                            {item.kind === "kura" ? (
                                <PanelRows>
                                    <PanelRow label="Started">{formatFullDateTime(item.createdAt)}</PanelRow>
                                    <PanelRow label="Last active">{formatFullDateTime(item.at)}</PanelRow>
                                    <PanelRow label="Replies" valueClassName="tabular-nums">{item.requests.toLocaleString("en-US")}</PanelRow>
                                    <PanelRow label="Input tokens" valueClassName="tabular-nums">{item.inputTokens.toLocaleString("en-US")}</PanelRow>
                                    <PanelRow label="Output tokens" valueClassName="tabular-nums">{item.outputTokens.toLocaleString("en-US")}</PanelRow>
                                    <PanelRow label="Credits" valueClassName="tabular-nums">{formatCredits(item.costMicro)}</PanelRow>
                                </PanelRows>
                            ) : (
                                <>
                                    <RequestDetailRows row={item.request} />
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">API calls keep metadata only: the prompt and the answer are never stored.</p>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                ) : null}
                {item ? (
                    <SheetFooter>
                        {item.kind === "kura" ? (
                            <Button asChild size="sm" className="gap-1.5">
                                <AppLink href={ROUTES.kuraConversation(item.id)}><MessagesSquare className="h-3.5 w-3.5" /> Open in Kura</AppLink>
                            </Button>
                        ) : (
                            <Button asChild variant="outline" size="sm">
                                <AppLink href={`${ROUTES.usage}?source=api`}>All API requests</AppLink>
                            </Button>
                        )}
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
