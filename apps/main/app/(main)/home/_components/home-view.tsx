"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarRange, Coins, MessagesSquare, Terminal, Zap } from "lucide-react"
import { JawafIcon } from "@repo/brand/product-icons"
import { AppLink } from "@repo/ui/components/app-link"
import { ChartPanel } from "@repo/ui/components/charts/panel-charts"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { getHomeData } from "@/actions/usage.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { RequestDetailRows } from "@/components/platform/request-detail"
import { SKY_LINK } from "@/components/platform/sky"
import { SpendChart } from "@/components/platform/spend-chart"
import { formatCredits } from "@repo/boli"
import { ROUTES } from "@/lib/navigation"
import { addTotals, formatFullDateTime, PLATFORM_KEYS, TIME_ZONE } from "@/lib/platform-display"
import type { ActivityItem, HomeData } from "@/types/platform"
import { GetStarted } from "./get-started"
import { HOME_DESCRIPTION, HOME_TITLE } from "./home-skeleton"
import { Launchers, type LauncherStats } from "./launchers"

export function HomeView({ initialData, startedHidden }: { initialData: HomeData; startedHidden: boolean }) {
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

    // Every product in this workspace: Kura and the API from inference_request, Jawaf from its own answers.
    const today = addTotals(data.buckets.kura.today, data.buckets.api.today)
    const jawafToday = data.daily[data.daily.length - 1]?.jawafMicro ?? 0
    const spent30 = data.buckets.kura.last30.costMicro + data.buckets.api.last30.costMicro + data.jawaf.costMicro30
    const items: StatBandItem[] = [
        {
            key: "credits", icon: Coins, label: "Credits left", value: formatCredits(data.balanceMicro), href: ROUTES.billing,
            hint: data.balanceMicro <= 0 ? "add credits to keep going" : "1 credit = Rs 1", tone: data.balanceMicro <= 0 ? "rose" : undefined,
        },
        { key: "today", icon: Zap, label: "Spent today", value: formatCredits(today.costMicro + jawafToday), hint: "credits, Nepal time" },
        { key: "month", icon: CalendarRange, label: "Spent, last 30 days", value: formatCredits(spent30), hint: "Kura, API and Jawaf", href: ROUTES.billing },
        {
            key: "jawaf", icon: JawafIcon, label: "Jawaf answers", value: data.jawaf.answers30.toLocaleString("en-US"),
            hint: data.jawaf.bots === 0 ? "no bot yet" : "last 30 days", href: data.jawaf.bots === 0 ? ROUTES.jawafSetup : ROUTES.jawaf,
        },
    ]
    const stats: LauncherStats = {
        kura: plural(data.buckets.kura.last7.requests, "reply", "replies", "this week"),
        api: data.activeKeys === 0 ? "Create your first key" : plural(data.buckets.api.today.requests, "call", "calls", "today"),
        jawaf: data.jawaf.bots === 0 ? "Set up your first bot" : `${data.jawaf.live} of ${data.jawaf.bots} ${data.jawaf.bots === 1 ? "bot" : "bots"} live`,
    }

    function open(item: ActivityItem) {
        setSelected(item)
        setSheetOpen(true)
    }

    return (
        <Page
            title={HOME_TITLE}
            description={HOME_DESCRIPTION}
            actions={[{ key: "kura", label: "Open Kura", icon: <MessagesSquare className="h-3.5 w-3.5" />, href: ROUTES.kura, primary: true }]}
            body="page"
        >
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <Launchers stats={stats} />
                <GetStarted started={data.started} hidden={startedHidden} />
                <StatBand items={items} />

                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    <ChartPanel title="Credits spent per day" hint="Last 30 days, every product" href={ROUTES.billing}>
                        <SpendChart days={data.daily} emptyMessage="Nothing spent in the last 30 days" />
                    </ChartPanel>

                    <section className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-white">Recent activity</h2>
                                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">Your latest Kura chats and API calls</p>
                            </div>
                            <AppLink href={ROUTES.usage} className={cn("shrink-0 text-xs", SKY_LINK)}>Open usage</AppLink>
                        </div>
                        {data.recent.length === 0 ? (
                            <BoliEmpty
                                kind="usage"
                                compact
                                className="flex-1"
                                title="No activity yet"
                                description="Your first Kura message or API call shows here within a minute."
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

            </div>

            <ActivitySheet item={selected} open={sheetOpen} onOpenChange={setSheetOpen} onExitComplete={() => setSelected(null)} />
        </Page>
    )
}

/** "3 replies this week": the count with its noun, then the window. */
function plural(n: number, one: string, many: string, window: string): string {
    return `${n.toLocaleString("en-US")} ${n === 1 ? one : many} ${window}`
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
