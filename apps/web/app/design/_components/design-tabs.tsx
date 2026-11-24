"use client"

import { useState, type ReactNode } from "react"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import { DESIGN_TABS, isDesignTab, type DesignTab } from "./tabs-config"

/**
 * The /design header and its tabs, synced to `?tab=` with history.replaceState (every panel is already on the
 * page, so the router is never involved). Panels arrive as server-rendered nodes.
 */
export function DesignTabs({ initialTab, panels }: { initialTab: DesignTab; panels: Record<DesignTab, ReactNode> }) {
    const [tab, setTab] = useState<DesignTab>(initialTab)

    function onChange(next: string) {
        if (!isDesignTab(next)) return
        setTab(next)
        const url = new URL(window.location.href)
        url.searchParams.set("tab", next)
        window.history.replaceState(window.history.state, "", url)
        window.scrollTo({ top: 0 })
    }

    return (
        <Tabs value={tab} onValueChange={onChange}>
            <div className="sticky top-0 z-30 border-b border-boli-line bg-boli-ground/85 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs text-boli-muted">Boli brand review - localhost only</p>
                        <h1 className="font-serif text-[28px] leading-tight tracking-[-0.01em] text-boli-ink">Design</h1>
                    </div>
                    <ScrollArea orientation="horizontal" className="min-w-0 max-w-full">
                        <TabsList fit variant="segmented" className="bg-white">
                            {DESIGN_TABS.map((t) => (
                                <TabsTrigger key={t.value} value={t.value}>
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </ScrollArea>
                </div>
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
                {DESIGN_TABS.map((t) => (
                    <TabsContent key={t.value} value={t.value} className="mt-0">
                        {panels[t.value]}
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    )
}
