"use client"

import * as React from "react"
import { ArrowUpRight, Check, X } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { hideGetStarted } from "@/actions/usage.action"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { SKY_FILL } from "@/components/platform/sky"
import { ROUTES } from "@/lib/navigation"
import { WEB } from "@/lib/web-links"
import type { HomeData } from "@/types/platform"

/*
 * Home's "Get started" (H1): three steps computed from real rows (an API key ever made, an API call, a Kura reply), a
 * Dhaka hem on the card's top edge, a sky progress bar. It hides itself when all three are done, or for good when the
 * person presses Hide (remembered per user in a cookie - see lib/platform/get-started.ts).
 */

type Step = { key: keyof HomeData["started"]; title: string; line: string; href: string }

const STEPS: Step[] = [
    { key: "key", title: "Create an API key", line: "Keep it in your .env as BOLI_API_KEY.", href: `${ROUTES.keys}?create=1` },
    { key: "apiCall", title: "Make your first API call", line: "Run the quickstart below with your key.", href: WEB.doc("quickstart") },
    { key: "kura", title: "Try Kura", line: "Ask something in Romanized Nepali.", href: ROUTES.kura },
]

export function GetStarted({ started, hidden }: { started: HomeData["started"]; hidden: boolean }) {
    const [dismissed, setDismissed] = React.useState(hidden)
    const done = STEPS.filter((s) => started[s.key]).length
    if (dismissed || done === STEPS.length) return null

    async function hide() {
        setDismissed(true)
        const r = await hideGetStarted()
        if (!r.success) {
            setDismissed(false)
            toast.error(r.error ?? "The card could not be hidden. Try again.")
        }
    }

    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <DashDhaka height={9} />
            <div className="p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Get started</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {done} of {STEPS.length} done - this card hides when all three are
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Hide Get started" title="Hide" onClick={() => void hide()} className="shrink-0 cursor-pointer">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className={cn("h-full rounded-full transition-[width] motion-reduce:transition-none", SKY_FILL)} style={{ width: `${(done / STEPS.length) * 100}%` }} />
                </div>
                <ol className="mt-3 grid min-w-0 gap-2 md:grid-cols-3">
                    {STEPS.map((s, i) => {
                        const ok = started[s.key]
                        return (
                            <li key={s.key} className="min-w-0">
                                <AppLink
                                    href={s.href}
                                    className={cn(
                                        "group/s flex h-full min-w-0 cursor-pointer items-start gap-3 rounded-xl p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400",
                                        ok ? "hover:bg-neutral-50 dark:hover:bg-neutral-800/50" : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs",
                                            ok ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 ring-1 ring-inset ring-neutral-400 dark:text-neutral-400 dark:ring-neutral-600",
                                        )}
                                    >
                                        {ok ? <Check className="h-3 w-3" strokeWidth={2.25} aria-label="Done" /> : i + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn("block text-sm font-medium", ok ? "text-neutral-500 line-through decoration-1 dark:text-neutral-500" : "text-neutral-900 dark:text-white")}>
                                            {s.title}
                                        </span>
                                        <span className="block text-xs text-neutral-600 dark:text-neutral-400">{s.line}</span>
                                    </span>
                                    {!ok ? <ArrowUpRight aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" /> : null}
                                </AppLink>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </section>
    )
}

/** Same shape for the loading screen (shown while data loads; the real card may then hide itself). */
export function GetStartedSkeleton() {
    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <Skeleton className="h-[9px] w-full rounded-none" />
            <div className="p-4">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="mt-1.5 h-3 w-56 max-w-full rounded" />
                <Skeleton className="mt-3 h-1 w-full rounded-full" />
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" delay={i * 0.05} />)}
                </div>
            </div>
        </div>
    )
}
