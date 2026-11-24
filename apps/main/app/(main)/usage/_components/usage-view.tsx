"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarDays, CalendarRange, Clock, History, SlidersHorizontal } from "lucide-react"
import { ChartPanel } from "@repo/ui/components/charts/panel-charts"
import { Button } from "@repo/ui/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { cn } from "@repo/ui/lib/utils"
import { getUsageData } from "@/actions/usage.action"
import { RequestSheet, StatusText } from "@/components/platform/request-detail"
import { SpendChart } from "@/components/platform/spend-chart"
import { formatCredits, maskKey } from "@repo/boli"
import { formatTokens } from "@/lib/format"
import {
    addTotals, formatDateTime, formatLatency, PLATFORM_KEYS, SOURCE_LABEL, USAGE_SOURCES, USAGE_WINDOWS, windowDays,
} from "@/lib/platform-display"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { SKY_FILL } from "@/components/platform/sky"
import type { RequestRow, UsageBuckets, UsageData, UsageSourceFilter, UsageTotals, UsageWindow } from "@/types/platform"
import { USAGE_DESCRIPTION, USAGE_TITLE } from "./usage-skeleton"

function pick(b: { kura: UsageBuckets; api: UsageBuckets }, source: UsageSourceFilter, w: keyof UsageBuckets): UsageTotals {
    if (source === "kura") return b.kura[w]
    if (source === "api") return b.api[w]
    return addTotals(b.kura[w], b.api[w])
}

function hint(t: UsageTotals): string {
    if (t.requests === 0) return "no requests"
    return `${t.requests.toLocaleString("en-US")} req, ${formatTokens(t.inputTokens)} in / ${formatTokens(t.outputTokens)} out`
}

export function UsageView({ initialData }: { initialData: UsageData }) {
    const [window_, setWindow] = React.useState<UsageWindow>(initialData.window)
    const [source, setSource] = React.useState<UsageSourceFilter>(initialData.source)
    const [page, setPage] = React.useState(initialData.log.page)
    const [selected, setSelected] = React.useState<RequestRow | null>(null)
    const [sheetOpen, setSheetOpen] = React.useState(false)

    const isInitial = window_ === initialData.window && source === initialData.source && page === initialData.log.page
    const query = useQuery({
        queryKey: PLATFORM_KEYS.usage(window_, source, page),
        queryFn: async () => {
            const r = await getUsageData({ window: window_, source, page })
            if (!r.success) throw new Error(r.error ?? "Usage could not be loaded.")
            return r.data
        },
        initialData: isInitial ? initialData : undefined,
        placeholderData: keepPreviousData,
    })
    const data = query.data ?? initialData
    const dimmed = query.isPlaceholderData

    // Filters live in the URL without a server round trip (AGENTS.md section 11).
    React.useEffect(() => {
        const url = new URL(globalThis.location.href)
        url.searchParams.set("window", window_)
        url.searchParams.set("source", source)
        if (page > 1) url.searchParams.set("page", String(page))
        else url.searchParams.delete("page")
        globalThis.history.replaceState(globalThis.history.state, "", url.toString())
    }, [window_, source, page])

    const b = data.buckets
    const items: StatBandItem[] = [
        { key: "today", icon: Clock, label: "Today", value: formatCredits(pick(b, source, "today").costMicro), hint: hint(pick(b, source, "today")) },
        { key: "7", icon: CalendarRange, label: "Last 7 days", value: formatCredits(pick(b, source, "last7").costMicro), hint: hint(pick(b, source, "last7")) },
        { key: "30", icon: CalendarDays, label: "Last 30 days", value: formatCredits(pick(b, source, "last30").costMicro), hint: hint(pick(b, source, "last30")) },
        { key: "90", icon: History, label: "Last 90 days", value: formatCredits(pick(b, source, "last90").costMicro), hint: hint(pick(b, source, "last90")) },
    ]

    const keysSpend = data.keys.reduce((s, k) => s + k.totals.costMicro, 0)
    const days = windowDays(data.window)
    const sourceWord = source === "all" ? "Kura and the API" : SOURCE_LABEL[source]

    function openRow(r: RequestRow) {
        setSelected(r)
        setSheetOpen(true)
    }

    return (
        <Page
            title={USAGE_TITLE}
            description={USAGE_DESCRIPTION}
            body="page"
            extra={
                <UsageFilters
                    window_={window_}
                    source={source}
                    fetching={query.isFetching}
                    onWindow={(v) => { setWindow(v); setPage(1) }}
                    onSource={(v) => { setSource(v); setPage(1) }}
                />
            }
        >
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                {query.isError ? <p className="text-xs text-neutral-600 dark:text-neutral-400">This view could not be refreshed. The figures below are the last ones loaded.</p> : null}

                <StatBand items={items} />

                <div className={cn("flex min-w-0 flex-col gap-4 transition-opacity", dimmed && "opacity-60")}>
                    <ChartPanel title="Credits spent per day" hint={`Last ${days} days, ${sourceWord}`}>
                        <SpendChart days={data.daily} source={source} emptyMessage={`No credits spent in the last ${days} days`} />
                    </ChartPanel>

                    <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="px-4 pb-2 pt-4">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">By key</h2>
                            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">Each API key and Kura, last {days} days</p>
                        </div>
                        {data.keys.length === 0 ? (
                            <p className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-400">No requests in this window.</p>
                        ) : (
                            <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[26rem]">
                                <div className="min-w-[40rem] [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
                                    <Table scroller="parent">
                                        <TableHeader sticky>
                                            <TableRow>
                                                <TableHead>Key</TableHead>
                                                <TableHead className="text-right">Requests</TableHead>
                                                <TableHead className="text-right">Tokens in / out</TableHead>
                                                <TableHead className="w-40">Share of spend</TableHead>
                                                <TableHead className="text-right">Credits</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.keys.map((k) => {
                                                const share = keysSpend > 0 ? Math.round((k.totals.costMicro / keysSpend) * 100) : 0
                                                return (
                                                    <TableRow key={`${k.source}-${k.keyId ?? "none"}`}>
                                                        <TableCell className="max-w-[16rem]">
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                <span className="truncate font-medium">{k.name}</span>
                                                                {k.prefix ? <span className="shrink-0 font-mono text-xs text-neutral-600 dark:text-neutral-400">{maskKey(k.prefix)}</span> : null}
                                                                {k.revoked ? <span className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400">revoked</span> : null}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">{k.totals.requests.toLocaleString("en-US")}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatTokens(k.totals.inputTokens)} / {formatTokens(k.totals.outputTokens)}</TableCell>
                                                        <TableCell>
                                                            <span className="flex items-center gap-2">
                                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                                    <span className={cn("block h-full rounded-full", k.source === "api" ? SKY_FILL : "bg-neutral-500")} style={{ width: `${share}%` }} />
                                                                </span>
                                                                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{share}%</span>
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">{formatCredits(k.totals.costMicro)}</TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </ScrollArea>
                        )}
                    </section>

                    <div className="flex min-w-0 flex-col gap-2">
                        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="px-4 pb-2 pt-4">
                                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Requests</h2>
                                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">Newest first. Press a row for every detail.</p>
                            </div>
                            {data.log.rows.length === 0 ? (
                                <BoliEmpty
                                    kind="usage"
                                    title="No requests in this window"
                                    description="Chat in Kura or call the API and each request shows here with its tokens and credits."
                                />
                            ) : (
                                <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[44rem]">
                                    <div className="min-w-[56rem] [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
                                        <Table scroller="parent">
                                            <TableHeader sticky>
                                                <TableRow>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Source</TableHead>
                                                    <TableHead>Key</TableHead>
                                                    <TableHead>Model</TableHead>
                                                    <TableHead className="text-right">Tokens in / out</TableHead>
                                                    <TableHead className="text-right">Credits</TableHead>
                                                    <TableHead className="text-right">Latency</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.log.rows.map((r) => (
                                                    <TableRow
                                                        key={r.id}
                                                        data-sheet-keep-open=""
                                                        tabIndex={0}
                                                        aria-selected={sheetOpen && selected?.id === r.id}
                                                        onClick={() => openRow(r)}
                                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(r) } }}
                                                        className={cn("cursor-pointer", sheetOpen && selected?.id === r.id && "bg-neutral-50 dark:bg-neutral-800/60")}
                                                    >
                                                        <TableCell className="whitespace-nowrap text-xs text-neutral-700 dark:text-neutral-300">{formatDateTime(r.createdAt)}</TableCell>
                                                        <TableCell>{SOURCE_LABEL[r.source]}</TableCell>
                                                        <TableCell className="max-w-[12rem] truncate">{r.source === "api" ? (r.keyName ?? "Deleted key") : "-"}</TableCell>
                                                        <TableCell className="font-mono text-xs">{r.model}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatTokens(r.inputTokens)} / {formatTokens(r.outputTokens)}</TableCell>
                                                        <TableCell className="text-right tabular-nums">{formatCredits(r.costMicro)}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatLatency(r.latencyMs)}</TableCell>
                                                        <TableCell className="whitespace-nowrap"><StatusText row={r} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </ScrollArea>
                            )}
                        </section>
                        <ListPagination
                            page={data.log.page}
                            totalPages={data.log.pages}
                            totalItems={data.log.total}
                            itemNoun="requests"
                            onPageChange={setPage}
                            disabled={query.isFetching}
                        />
                    </div>
                </div>
            </div>

            <RequestSheet row={selected} open={sheetOpen} onOpenChange={setSheetOpen} onExitComplete={() => setSelected(null)} />
        </Page>
    )
}

const isWindow = (v: string): v is UsageWindow => USAGE_WINDOWS.some((w) => w.value === v)
const isSource = (v: string): v is UsageSourceFilter => USAGE_SOURCES.some((o) => o.value === v)

/**
 * The window and source filters, in the header's right side (AGENTS.md: controls on the RIGHT of the header). From xl
 * two compact segmented rows, drawn like the header tabs; below xl ONE button naming the choice ("30 days, All") that
 * opens both as radio groups, so the header stays one row at 390px. The refresh hint sits before them.
 */
function UsageFilters({ window_, source, fetching, onWindow, onSource }: {
    window_: UsageWindow
    source: UsageSourceFilter
    fetching: boolean
    onWindow: (v: UsageWindow) => void
    onSource: (v: UsageSourceFilter) => void
}) {
    const windowLabel = USAGE_WINDOWS.find((w) => w.value === window_)?.label ?? window_
    const sourceLabel = USAGE_SOURCES.find((o) => o.value === source)?.label ?? source
    return (
        <div className="flex min-w-0 items-center gap-2">
            {fetching ? <InlineLoader size={14} label="Refreshing" className="shrink-0 text-neutral-500" /> : null}
            <div className="hidden items-center gap-2 xl:flex">
                <Tabs value={window_} onValueChange={(v) => { if (isWindow(v)) onWindow(v) }}>
                    <TabsList fit size="sm" aria-label="Window">
                        {USAGE_WINDOWS.map((w) => <TabsTrigger key={w.value} value={w.value}>{w.label}</TabsTrigger>)}
                    </TabsList>
                </Tabs>
                <Tabs value={source} onValueChange={(v) => { if (isSource(v)) onSource(v) }}>
                    <TabsList fit size="sm" aria-label="Source">
                        {USAGE_SOURCES.map((o) => <TabsTrigger key={o.value} value={o.value}>{o.label}</TabsTrigger>)}
                    </TabsList>
                </Tabs>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="h-9 min-w-0 gap-1.5 xl:hidden [&_svg]:size-3.5" aria-label={`Filters: ${windowLabel}, ${sourceLabel}`}>
                        <SlidersHorizontal className="shrink-0" />
                        <span className="truncate">{windowLabel}, {sourceLabel}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Window</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={window_} onValueChange={(v) => { if (isWindow(v)) onWindow(v) }}>
                        {USAGE_WINDOWS.map((w) => <DropdownMenuRadioItem key={w.value} value={w.value}>{w.label}</DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Source</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={source} onValueChange={(v) => { if (isSource(v)) onSource(v) }}>
                        {USAGE_SOURCES.map((o) => <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
