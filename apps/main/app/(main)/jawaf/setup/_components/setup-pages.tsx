"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { ArrowRight, Globe, RotateCw, Search } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Input } from "@repo/ui/components/ui/input"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader, SpinnerDots } from "@repo/brand/loaders/spinners"
import { DISPLAY } from "@repo/brand/type"
import { formatCredits } from "@repo/boli"
import { JAWAF_LIMITS, JAWAF_PRICES } from "@repo/boli/jawaf"
import { mapJawafSite, setJawafPagesIncluded, startJawafReading } from "@/actions/jawaf/knowledge.action"
import { updateJawafBot } from "@/actions/jawaf/bots.action"
import { JAWAF_CARD, unwrap } from "@/components/jawaf/keys"
import type { JawafBotSummary, JawafJobView, JawafPageView } from "@/types/jawaf"

const host = (url: string | null) => {
    try { return url ? new URL(url).hostname.replace(/^www\./, "") : "" } catch { return url ?? "" }
}
const pathOf = (url: string | null) => {
    try { return url ? new URL(url).pathname || "/" : "" } catch { return url ?? "" }
}

/** Ticks sent in batches (the action takes up to 1000 ids). */
async function setIncluded(botId: string, ids: string[], included: boolean) {
    for (let i = 0; i < ids.length; i += 1000) unwrap(await setJawafPagesIncluded({ botId, pageIds: ids.slice(i, i + 1000), included }), "Your page choices could not be saved.")
}

/**
 * Step 3 - Pick pages. Maps the website first (a few seconds; Firecrawl + robots.txt) and lists every page found,
 * useful ones pre-ticked up to the bot's limit. Search, select all / none, and the cost in plain numbers: the first
 * 20 pages are free, every page after that is a credit (read once - re-reads never charge). Start reading saves the
 * ticks and starts the background read.
 */
export function SetupPages({ bot, initialPages, onStarted, onSkip }: {
    bot: JawafBotSummary
    initialPages: JawafPageView[]
    onStarted: (job: JawafJobView) => void
    onSkip: () => void
}) {
    const [pages, setPages] = React.useState<JawafPageView[]>(initialPages)
    const [selected, setSelected] = React.useState<Set<string>>(() => new Set(initialPages.filter((p) => p.status === "included").map((p) => p.id)))
    const [query, setQuery] = React.useState("")
    const [dropped, setDropped] = React.useState(0)
    const limit = JAWAF_LIMITS.pagesPerBot

    const map = useMutation({
        mutationFn: async () => unwrap(await mapJawafSite({ botId: bot.id, url: bot.website ?? "" }), "We could not read that website."),
        onSuccess: (res) => {
            setPages(res.pages)
            setSelected(new Set(res.pages.filter((p) => p.status === "included").map((p) => p.id)))
            setDropped(res.dropped)
        },
    })
    // Map once on arrival when nothing was mapped yet.
    const started = React.useRef(false)
    React.useEffect(() => {
        if (started.current || initialPages.length || !bot.website) return
        started.current = true
        map.mutate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const start = useMutation({
        mutationFn: async () => {
            const include = pages.filter((p) => selected.has(p.id) && p.status !== "included").map((p) => p.id)
            const exclude = pages.filter((p) => !selected.has(p.id) && p.status === "included").map((p) => p.id)
            if (include.length) await setIncluded(bot.id, include, true)
            if (exclude.length) await setIncluded(bot.id, exclude, false)
            return unwrap(await startJawafReading(bot.id), "Reading could not start.")
        },
        onSuccess: (job) => onStarted(job),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Reading could not start."),
    })

    const skip = useMutation({
        mutationFn: async () => unwrap(await updateJawafBot({ botId: bot.id, setupStep: "review" })),
        onSuccess: onSkip,
        onError: (e) => toast.error(e instanceof Error ? e.message : "That did not work. Try again."),
    })

    const q = query.trim().toLowerCase()
    const shown = q ? pages.filter((p) => (p.title ?? "").toLowerCase().includes(q) || (p.url ?? "").toLowerCase().includes(q)) : pages
    const count = selected.size
    const paid = Math.max(0, count - JAWAF_PRICES.freePagesPerBot)
    const over = count > limit

    const toggle = (id: string, on: boolean) => setSelected((prev) => {
        const next = new Set(prev)
        if (on) next.add(id)
        else next.delete(id)
        return next
    })
    const selectAll = () => setSelected((prev) => {
        const next = new Set(prev)
        for (const p of shown) { if (next.size >= limit) break; next.add(p.id) }
        return next
    })
    const selectNone = () => setSelected((prev) => {
        const next = new Set(prev)
        for (const p of shown) next.delete(p.id)
        return next
    })

    return (
        <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl text-neutral-900 sm:text-4xl dark:text-white" style={DISPLAY.h3}>Pick the pages to read</h2>
                <p className="max-w-[64ch] text-sm text-neutral-600 dark:text-neutral-400">
                    We ticked the pages that answer questions best - about, fees, services, contact. Untick anything that does not help a customer.
                </p>
            </div>

            {map.isPending ? (
                <div className={cn(JAWAF_CARD, "flex items-center gap-3 p-5")}>
                    <SpinnerDots size={18} />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Finding pages on {host(bot.website)}...</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">This takes a few seconds. We skip log-in, cart and other pages that do not help.</p>
                    </div>
                </div>
            ) : map.isError && !pages.length ? (
                <div className={cn(JAWAF_CARD, "flex flex-col gap-3 p-5")}>
                    <p className="text-sm text-neutral-900 dark:text-white">{map.error instanceof Error ? map.error.message : "We could not read that website."}</p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" className="cursor-pointer gap-1.5" onClick={() => map.mutate()}><RotateCw className="h-3.5 w-3.5" /> Try again</Button>
                        <Button type="button" size="sm" variant="outline" className="cursor-pointer" disabled={skip.isPending} onClick={() => skip.mutate()}>Skip - I will add facts myself</Button>
                    </div>
                </div>
            ) : (
                <section className={cn(JAWAF_CARD, "flex min-w-0 flex-col overflow-hidden")}>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
                        <div className="relative min-w-0 flex-1 basis-48">
                            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages" aria-label="Search pages" className="h-9 pl-8 text-sm" />
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={selectAll}>Select all</Button>
                        <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={selectNone}>Select none</Button>
                    </div>
                    <ScrollArea orientation="vertical" viewportClassName="max-h-[28rem]">
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {shown.map((p) => {
                                const on = selected.has(p.id)
                                const id = `page-${p.id}`
                                return (
                                    <li key={p.id} className="flex min-w-0 items-center gap-3 px-4 py-2.5">
                                        <Checkbox id={id} checked={on} onCheckedChange={(v) => toggle(p.id, v === true)} disabled={!on && count >= limit} className="cursor-pointer" />
                                        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                                            <span className="block truncate text-sm text-neutral-900 dark:text-white">{p.title || pathOf(p.url)}</span>
                                            <span className="block truncate text-xs text-neutral-600 dark:text-neutral-400">{pathOf(p.url)}</span>
                                        </label>
                                        {p.suggested ? <span className="hidden shrink-0 text-xs text-boli-sky-ink sm:inline">Suggested</span> : null}
                                    </li>
                                )
                            })}
                            {!shown.length ? <li className="px-4 py-6 text-center text-sm text-neutral-600 dark:text-neutral-400">{pages.length ? "No page matches that search." : "We found no pages on that website."}</li> : null}
                        </ul>
                    </ScrollArea>
                    <div className="flex min-w-0 flex-col gap-1 border-t border-neutral-200 p-4 text-sm dark:border-neutral-800">
                        <p className="text-neutral-900 dark:text-white">
                            <span className="font-semibold tabular-nums">{count}</span> of {limit} pages ticked
                            {pages.length ? <span className="text-neutral-600 dark:text-neutral-400"> - {pages.length} found{dropped ? `, ${dropped} skipped` : ""}</span> : null}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {paid
                                ? `The first ${JAWAF_PRICES.freePagesPerBot} pages are free; the other ${paid} cost ${formatCredits(paid * JAWAF_PRICES.pageMicro)} credits, read once. Re-reads are free.`
                                : `Free - the first ${JAWAF_PRICES.freePagesPerBot} pages of every bot cost nothing. Re-reads are free.`}
                        </p>
                    </div>
                </section>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" className="cursor-pointer gap-1.5" disabled={!count || over || start.isPending || map.isPending} onClick={() => start.mutate()}>
                    {start.isPending ? <><InlineLoader size={14} label="Starting" /> Starting...</> : <>Start reading <ArrowRight className="h-3.5 w-3.5" /></>}
                </Button>
                {pages.length ? (
                    <Button type="button" variant="ghost" className="cursor-pointer gap-1.5" disabled={map.isPending} onClick={() => map.mutate()}>
                        <Globe className="h-3.5 w-3.5" /> Find pages again
                    </Button>
                ) : null}
            </div>
        </div>
    )
}
