"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"
import { QuietSelect } from "@repo/brand/quiet-select"

export type BrowserItem = { slug: string; category: string; haystack: string; card: ReactNode }

const ALL = "All"

/**
 * The blog's category tabs, search box and grid. The cards arrive rendered on the server (`card`), so the pixel art
 * never ships to the browser; this island only filters. The page HTML lists every post (static, crawlable). The tab is
 * kept in `?category=` with history.replaceState - never a router.replace of the same page (AGENTS.md section 10) - and
 * read back on load. On a phone the toolbar is one row: search, then the category as a select.
 */
export function BlogBrowser({ items, categories }: { items: BrowserItem[]; categories: readonly string[] }) {
    const tabs = useMemo(() => [ALL, ...categories], [categories])
    const [category, setCategory] = useState(ALL)
    const [query, setQuery] = useState("")

    useEffect(() => {
        const c = new URLSearchParams(window.location.search).get("category")
        if (c && tabs.includes(c)) setCategory(c)
    }, [tabs])

    const pick = (c: string) => {
        setCategory(c)
        const url = new URL(window.location.href)
        if (c === ALL) url.searchParams.delete("category")
        else url.searchParams.set("category", c)
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
    }

    const q = query.trim().toLowerCase()
    const shown = items.filter((it) => (category === ALL || it.category === category) && (!q || it.haystack.includes(q)))

    return (
        <div>
            <div className="flex items-center gap-3 border-b border-boli-line pb-5">
                <div role="group" aria-label="Categories" className="hidden flex-wrap items-center gap-1 sm:flex">
                    {tabs.map((t) => (
                        <Button
                            key={t}
                            type="button"
                            variant="ghost"
                            aria-pressed={t === category}
                            onClick={() => pick(t)}
                            className={cn(
                                "h-9 cursor-pointer rounded-full px-4 text-sm font-[450] transition-colors",
                                t === category ? "bg-boli-ink text-white hover:bg-boli-ink hover:text-white" : "text-boli-text hover:bg-boli-sand/70 hover:text-boli-ink",
                            )}
                        >
                            {t}
                        </Button>
                    ))}
                </div>
                <div className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-boli-muted" aria-hidden />
                    <Input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search posts"
                        aria-label="Search posts"
                        className="h-10 rounded-full border-boli-line bg-white pl-10 text-sm text-boli-ink placeholder:text-boli-muted"
                    />
                </div>
                <QuietSelect
                    label="Show"
                    value={category}
                    onValueChange={pick}
                    options={tabs.map((t) => ({ value: t, label: t }))}
                    className="h-10 shrink-0 sm:hidden"
                    emptyMessage="No categories yet"
                />
            </div>

            {shown.length ? (
                <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                    {shown.map((it) => (
                        <li key={it.slug} className="min-w-0">
                            {it.card}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="mt-10 rounded-2xl border border-boli-line bg-white px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-boli-ink">{q ? "No posts match that search" : `No ${category} posts yet`}</p>
                    <p className="mt-1 text-sm text-boli-muted">{q ? "Try fewer words, or another category." : "Pick another category, or read them all."}</p>
                    <Button type="button" variant="ghost" onClick={() => {
                            setQuery("")
                            pick(ALL)
                        }} className="mt-4 h-9 cursor-pointer rounded-full border border-boli-line bg-white px-4 text-sm text-boli-ink hover:bg-boli-ground">
                        Show all posts
                    </Button>
                </div>
            )}
        </div>
    )
}
