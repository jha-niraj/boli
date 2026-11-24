"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, Coins, KeyRound, Plus, Sigma, Zap } from "lucide-react"
import { SITE } from "@repo/core/site"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { CodeTabs, CopyButton } from "@repo/brand/code-tabs"
import { formatCredits, MAX_API_KEYS } from "@repo/boli"
import { buildSamples, codingAgentPrompt } from "@repo/boli/code-samples"
import { getHomeData } from "@/actions/usage.action"
import { formatTokens } from "@/lib/format"
import { ROUTES } from "@/lib/navigation"
import { PLATFORM_KEYS } from "@/lib/platform-display"
import { WEB } from "@/lib/web-links"
import type { HomeData } from "@/types/platform"
import { API_HOME_DESCRIPTION, API_HOME_TITLE } from "./api-home-skeleton"

/** Quickstart code and the coding-agent prompt sit side by side at ONE fixed height and scroll inside (owner, 2026-11-25). */
const START_BODY_H = "h-[22rem]"

/**
 * The API product's Home: the API's own numbers (requests today, tokens this week, active keys, credits left), then
 * Start building. Same query as /home (PLATFORM_KEYS.home), so a reply or a new key refreshes both.
 */
export function ApiHomeView({ initialData }: { initialData: HomeData }) {
    const { data } = useQuery({
        queryKey: PLATFORM_KEYS.home,
        queryFn: async () => {
            const r = await getHomeData()
            if (!r.success) throw new Error(r.error ?? "The API home could not be loaded.")
            return r.data
        },
        initialData,
    })

    const today = data.buckets.api.today
    const week = data.buckets.api.last7
    const items: StatBandItem[] = [
        { key: "today", icon: Zap, label: "API requests today", value: today.requests.toLocaleString("en-US"), hint: `${formatCredits(today.costMicro)} credits`, href: `${ROUTES.usage}?source=api` },
        { key: "tokens", icon: Sigma, label: "Tokens this week", value: formatTokens(week.inputTokens + week.outputTokens), hint: "API, last 7 days, in + out", href: `${ROUTES.usage}?source=api` },
        { key: "keys", icon: KeyRound, label: "Active API keys", value: data.activeKeys.toLocaleString("en-US"), hint: `of ${MAX_API_KEYS}`, href: ROUTES.keys },
        {
            key: "credits", icon: Coins, label: "Credits left", value: formatCredits(data.balanceMicro), href: ROUTES.billing,
            hint: data.balanceMicro <= 0 ? "add credits to keep going" : "shared with Kura and Jawaf", tone: data.balanceMicro <= 0 ? "rose" : undefined,
        },
    ]

    return (
        <Page
            title={API_HOME_TITLE}
            description={API_HOME_DESCRIPTION}
            actions={[
                { key: "docs", label: "Docs", icon: <BookOpen className="h-3.5 w-3.5" />, href: WEB.doc("quickstart"), variant: "outline" },
                { key: "create", label: "Create API key", icon: <Plus className="h-3.5 w-3.5" />, href: `${ROUTES.keys}?create=1`, primary: true },
            ]}
            body="page"
        >
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <StatBand items={items} />
                <StartBuilding />
            </div>
        </Page>
    )
}

/** Moved from /home (owner, 2026-11-25 layout kept): the quickstart in five languages beside the coding-agent prompt. */
export function StartBuilding() {
    const samples = React.useMemo(() => buildSamples({ baseUrl: SITE.url }), [])
    const prompt = React.useMemo(() => codingAgentPrompt(SITE.url), [])
    return (
        <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Start building</h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Create a key, put it in your .env as BOLI_API_KEY, then make your first call.</p>
            </div>
            <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Quickstart</p>
                    <CodeTabs samples={samples} defaultLanguage="python" bodyViewportClassName={START_BODY_H} />
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Paste this into any coding agent</p>
                    <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex min-h-11 items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 py-1.5 pl-3 pr-1.5 dark:border-neutral-800 dark:bg-neutral-950">
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">Sets up the key and makes one call</span>
                            <CopyButton text={prompt} />
                        </div>
                        <ScrollArea orientation="vertical" className="min-w-0" viewportClassName={START_BODY_H}>
                            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-neutral-800 dark:text-neutral-200">{prompt}</pre>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </section>
    )
}
