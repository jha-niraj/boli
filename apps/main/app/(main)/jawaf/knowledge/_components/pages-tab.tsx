"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ExternalLink, Plus, Search } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ChoiceChips } from "@repo/ui/components/ui/choice-chips"
import { Input } from "@repo/ui/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Switch } from "@repo/ui/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { JAWAF_LIMITS } from "@repo/boli/jawaf"
import { addJawafUrl, listJawafPages, listJawafSources, setJawafPagesIncluded } from "@/actions/jawaf/knowledge.action"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { StateBadge } from "@/components/jawaf/state-badge"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { formatDay } from "@/lib/platform-display"
import type { JawafJobView, JawafLimits, JawafPageView, JawafSourceView } from "@/types/jawaf"

type Filter = "all" | "included" | "excluded" | "changed" | "failed"
const pathOf = (url: string | null) => {
    try { return url ? `${new URL(url).pathname}${new URL(url).search}` || "/" : "" } catch { return url ?? "" }
}

function ChangeTag({ page }: { page: JawafPageView }) {
    if (page.readStatus === "failed") return <StateBadge dot="red">Failed</StateBadge>
    if (page.readStatus === "removed" || page.change === "removed") return <StateBadge dot="neutral">Removed</StateBadge>
    if (page.readStatus === "pending") return <StateBadge>Not read yet</StateBadge>
    if (page.change === "new") return <StateBadge dot="sky">New</StateBadge>
    if (page.change === "changed") return <StateBadge dot="amber">Changed</StateBadge>
    return null
}

/**
 * Pages: every page Jawaf found or was given, in a table (sticky heading row, a ceiling of about ten rows, then it
 * scrolls inside). Included / excluded is a switch per row (one-line edit, so no sheet). Tags say what changed since
 * the read before; "Website disagrees" marks a page whose price is not in Prices and fees. Add a page reads it at once.
 */
export function PagesTab({ botId, website, limits, initialPages, initialSources, canEdit, running, onJob }: {
    botId: string
    website: string | null
    limits: JawafLimits
    initialPages: JawafPageView[]
    initialSources: JawafSourceView[]
    canEdit: boolean
    running: boolean
    onJob: (job: JawafJobView) => void
}) {
    const queryClient = useQueryClient()
    const pages = useQuery({ queryKey: JAWAF_KEYS.pages(botId), queryFn: async () => unwrap(await listJawafPages({ botId, filter: "all" })), initialData: initialPages })
    const sources = useQuery({ queryKey: JAWAF_KEYS.sources(botId), queryFn: async () => unwrap(await listJawafSources(botId)), initialData: initialSources })
    const [filter, setFilter] = React.useState<Filter>("all")
    const [query, setQuery] = React.useState("")
    const [addOpen, setAddOpen] = React.useState(false)
    const [url, setUrl] = React.useState("")
    const [pendingId, setPendingId] = React.useState<string | null>(null)

    const all = pages.data ?? []
    const included = all.filter((p) => p.status === "included").length

    const toggle = useMutation({
        mutationFn: async ({ page, on }: { page: JawafPageView; on: boolean }) => {
            setPendingId(page.id)
            unwrap(await setJawafPagesIncluded({ botId, pageIds: [page.id], included: on }), "That page could not be changed.")
            return on
        },
        onSuccess: async (on) => {
            toast.success(on ? "Page included" : "Page left out", { description: on ? "Press Train now to read it." : "Jawaf stops answering from it." })
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.pages(botId) })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That page could not be changed."),
        onSettled: () => setPendingId(null),
    })

    const add = useMutation({
        mutationFn: async () => unwrap(await addJawafUrl({ botId, url: url.trim() }), "That page could not be added."),
        onSuccess: async (res) => {
            toast.success("Page added", { description: "Reading it now." })
            setUrl("")
            setAddOpen(false)
            onJob(res.job)
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.pages(botId) })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That page could not be added."),
    })

    const q = query.trim().toLowerCase()
    const shown = all.filter((p) => {
        if (filter === "included" && p.status !== "included") return false
        if (filter === "excluded" && p.status !== "excluded") return false
        if (filter === "changed" && !p.change) return false
        if (filter === "failed" && p.readStatus !== "failed") return false
        return !q || (p.title ?? "").toLowerCase().includes(q) || (p.url ?? "").toLowerCase().includes(q)
    })
    const count = (f: Filter) => all.filter((p) => (f === "included" ? p.status === "included" : f === "excluded" ? p.status === "excluded" : f === "changed" ? !!p.change : p.readStatus === "failed")).length

    const site = (sources.data ?? []).find((s) => s.kind === "site")
    const nextRead = site?.nextReadAt ? formatDay(site.nextReadAt) : null

    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 items-center gap-2">
                <div className="relative min-w-0 flex-1">
                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages" aria-label="Search pages" className="h-9 pl-8 text-sm" />
                </div>
                <ChoiceChips<Filter>
                    label="Show"
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: "all", label: "All", count: all.length },
                        { value: "included", label: "Included", count: count("included") },
                        { value: "excluded", label: "Left out", count: count("excluded") },
                        { value: "changed", label: "Changed", count: count("changed") },
                        { value: "failed", label: "Failed", count: count("failed") },
                    ]}
                    collapseAfter={3}
                />
                {canEdit ? (
                    <Popover open={addOpen} onOpenChange={setAddOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="shrink-0 cursor-pointer gap-1.5" aria-label="Add a page">
                                <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add a page</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                            <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim() && !add.isPending) add.mutate() }}>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">Add a page</p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">Any public page - your site, a Facebook page, a notice. Jawaf reads it at once.</p>
                                <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com.np/fees" inputMode="url" className="h-9 text-sm" />
                                <Button type="submit" size="sm" className="cursor-pointer gap-1.5" disabled={!url.trim() || add.isPending || included >= limits.pagesPerBot}>
                                    {add.isPending ? <InlineLoader size={14} label="Adding" /> : null} Add and read
                                </Button>
                            </form>
                        </PopoverContent>
                    </Popover>
                ) : null}
            </div>

            {!all.length ? (
                <div className={JAWAF_CARD}>
                    <BoliEmpty
                        kind="search"
                        title="No pages yet"
                        description={website ? "Run the setup to map your website, or add a page by its address." : "Add a page by its address, or upload files instead."}
                    />
                </div>
            ) : (
                <div className={cn(JAWAF_CARD, "overflow-hidden")}>
                    <ScrollArea orientation="both" viewportClassName="max-h-[44rem]">
                        <Table scroller="parent" className="min-w-[46rem]">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Page</TableHead>
                                    <TableHead className="w-36">Status</TableHead>
                                    <TableHead className="w-32">Last read</TableHead>
                                    <TableHead className="w-40">Changes</TableHead>
                                    <TableHead pin="end" className="w-28 text-right">Include</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shown.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="max-w-0">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate text-sm text-neutral-900 dark:text-white">{p.title || pathOf(p.url) || "Untitled"}</span>
                                                {p.url ? (
                                                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 text-xs text-neutral-600 hover:text-boli-sky-ink dark:text-neutral-400">
                                                        <span className="truncate">{pathOf(p.url)}</span><ExternalLink aria-hidden className="h-3 w-3 shrink-0" />
                                                    </a>
                                                ) : null}
                                                {p.disagreesWithFacts ? (
                                                    <span className="mt-0.5 flex items-center gap-1 text-xs text-neutral-800 dark:text-neutral-200">
                                                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" /> Website disagrees with your Prices and fees
                                                    </span>
                                                ) : null}
                                                {p.error ? <span className="truncate text-xs text-red-700 dark:text-red-400" title={p.error}>{p.error}</span> : null}
                                            </div>
                                        </TableCell>
                                        <TableCell>{p.status === "included" ? <StateBadge dot="sky">Included</StateBadge> : <StateBadge>Left out</StateBadge>}</TableCell>
                                        <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">{p.lastReadAt ? formatDay(p.lastReadAt) : "Not yet"}</TableCell>
                                        <TableCell><ChangeTag page={p} /></TableCell>
                                        <TableCell pin="end" className="text-right">
                                            <Switch
                                                checked={p.status === "included"}
                                                disabled={!canEdit || pendingId === p.id || (p.status !== "included" && included >= limits.pagesPerBot)}
                                                onCheckedChange={(on) => toggle.mutate({ page: p, on })}
                                                aria-label={`${p.status === "included" ? "Leave out" : "Include"} ${p.title || p.url || "this page"}`}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!shown.length ? (
                                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">No page matches.</TableCell></TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            )}

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {included} of {limits.pagesPerBot} pages included. Jawaf re-reads your website every {JAWAF_LIMITS.rereadDays} days{nextRead ? ` - next on ${nextRead}` : ""}, and marks what is new, changed or removed.
                {running ? " Reading now." : " Train now reads them again at once, free."}
            </p>
        </div>
    )
}
