"use client"

import { useQuery } from "@tanstack/react-query"
import type * as React from "react"
import { ArrowRight, Coins, Wallet } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { useProductRail } from "@repo/ui/components/shell/product-rail"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { cn } from "@repo/ui/lib/utils"
import { getMyBalance } from "@/actions/balance.action"
import { formatCredits } from "@repo/boli"
import { ROUTES } from "@/lib/navigation"

/** One query key for the balance, so Billing and Kura can invalidate it after a top-up or a reply. */
export const BALANCE_QUERY_KEY = ["credits", "balance"] as const

/** The balance in micro-credits, refetched every 60 s. Undefined while loading or after a failed read. */
export function useBalance() {
    return useQuery({
        queryKey: BALANCE_QUERY_KEY,
        queryFn: async (): Promise<number> => {
            const res = await getMyBalance()
            if (!res.success) throw new Error(res.error)
            return res.data.balanceMicro
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
    })
}

/**
 * The balance beside the account chip ("99.96 credits" in the tooltip and the accessible name; the figure on the
 * chip). Links to Billing. It reads on the client after the first paint, so the layout never waits for it.
 */
export function CreditsChip({ className }: { className?: string }) {
    const { data } = useBalance()
    const value = data !== undefined ? formatCredits(data) : null
    const label = value !== null ? `${value} credits` : "Credits"
    const low = data !== undefined && data <= 0
    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <AppLink
                    href={ROUTES.billing}
                    aria-label={`${label} - open Billing`}
                    className={cn(
                        "flex h-7 min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400",
                        low
                            ? "border-boli-crimson/30 bg-boli-crimson-soft text-boli-crimson-ink dark:border-boli-crimson/40 dark:bg-boli-crimson/15 dark:text-red-300"
                            : "border-neutral-950/[0.07] bg-neutral-950/[0.03] text-neutral-800 hover:bg-neutral-950/[0.06] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-100 dark:hover:bg-white/[0.08]",
                        className,
                    )}
                >
                    <Coins aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    {value ?? <span className="h-2 w-8 animate-pulse rounded-full bg-current opacity-20" />}
                </AppLink>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{low ? "Out of credits - add more" : label}</TooltipContent>
        </Tooltip>
    )
}

/**
 * The rail footer's full-width credits row (owner, 2026-11-24: "own row above the account"): "Credits 99.96" linking to
 * Billing, and an "Add" pill that opens Billing > Plans (`/billing?tab=plans`, the packs). Out of credits it turns crimson.
 */
export function CreditsRow({ className }: { className?: string }) {
    const { data } = useBalance()
    const value = data !== undefined ? formatCredits(data) : null
    const low = data !== undefined && data <= 0
    return (
        <div
            className={cn(
                "flex h-9 items-center gap-2 rounded-xl border px-2.5 text-xs",
                low
                    ? "border-boli-crimson/30 bg-boli-crimson-soft text-boli-crimson-ink dark:border-boli-crimson/40 dark:bg-boli-crimson/15 dark:text-red-300"
                    : "border-neutral-950/[0.07] bg-white text-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-300",
                className,
            )}
        >
            <AppLink
                href={ROUTES.billing}
                aria-label={value !== null ? `${value} credits - open Billing` : "Credits - open Billing"}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
                <Coins aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="shrink-0">{low ? "Out of credits" : "Credits"}</span>
                <span className="ml-auto truncate font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {value ?? <span className="inline-block h-2 w-10 animate-pulse rounded-full bg-current opacity-20" />}
                </span>
            </AppLink>
            <AppLink
                href={`${ROUTES.billing}?tab=plans`}
                className="shrink-0 cursor-pointer rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white outline-none transition-colors hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
                Add
            </AppLink>
        </div>
    )
}

/** The card's ground: Boli's own hill colours (sky, pine, gold, brick) blurred together, deep enough for white text. */
const CARD_GROUND: React.CSSProperties = {
    backgroundColor: "var(--color-boli-sky-deep)",
    backgroundImage: [
        "radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, var(--color-boli-sky) 85%, transparent), transparent 60%)",
        "radial-gradient(90% 80% at 45% 100%, color-mix(in oklab, var(--color-boli-pine) 80%, transparent), transparent 65%)",
        "radial-gradient(90% 90% at 100% 30%, color-mix(in oklab, var(--color-boli-gold) 85%, transparent), transparent 60%)",
        "radial-gradient(70% 60% at 100% 100%, color-mix(in oklab, var(--color-boli-brick) 70%, transparent), transparent 70%)",
        "linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.12))",
    ].join(", "),
}

/**
 * The product rail's credits (owner, 2026-11-25, from a dashboard.sarvam.ai screenshot). With the rail open (hovered,
 * or the phone sheet) it is one soft grey card: a hill-coloured band with a serif line and a white "See plans" pill
 * (-> Billing > Plans), then "99.96 credits left ->" (-> Billing). In the closed 56px rail it is the coin alone; in the
 * collapsed sidebar's 64px rail main-shell.tsx draws its own coin. Out of credits the line and the dot say so.
 */
export function RailCreditsRow({ className }: { className?: string }) {
    const { expanded, layout } = useProductRail()
    const open = expanded || layout === "sheet"
    const { data } = useBalance()
    const value = data !== undefined ? formatCredits(data) : null
    const low = data !== undefined && data <= 0

    if (!open) {
        return (
            <AppLink
                href={ROUTES.billing}
                aria-label={value !== null ? `${value} credits - open Billing` : "Credits - open Billing"}
                className={cn(
                    "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-neutral-600 outline-none transition-colors hover:bg-neutral-950/[0.04] hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white",
                    className,
                )}
            >
                <Wallet aria-hidden className="size-[18px]" />
                {low ? <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-boli-crimson" /> : null}
            </AppLink>
        )
    }

    return (
        <div className={cn("mb-1.5 flex min-w-0 flex-col gap-1 rounded-2xl bg-neutral-950/[0.04] p-1.5 dark:bg-white/[0.05]", className)}>
            <div className="flex flex-col gap-3 overflow-hidden rounded-xl p-3.5" style={CARD_GROUND}>
                <p className="font-boli-serif text-base leading-snug text-white">
                    {low ? "You are out of credits." : "Add credits to keep building."}
                </p>
                <AppLink
                    href={`${ROUTES.billing}?tab=plans`}
                    className="flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-white text-sm font-medium text-neutral-900 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/70"
                >
                    See plans
                </AppLink>
            </div>
            <AppLink
                href={ROUTES.billing}
                aria-label={value !== null ? `${value} credits left - open Billing` : "Credits - open Billing"}
                className={cn(
                    "flex h-10 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400",
                    low
                        ? "text-boli-crimson-ink hover:bg-boli-crimson-soft dark:text-red-300 dark:hover:bg-boli-crimson/15"
                        : "text-neutral-600 hover:bg-neutral-950/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white",
                )}
            >
                <Wallet aria-hidden className="size-[18px] shrink-0" />
                <span className="min-w-0 flex-1 truncate tabular-nums">
                    {value !== null ? (low ? "No credits left" : `${value} credits left`) : (
                        <span className="inline-block h-2 w-24 animate-pulse rounded-full bg-current opacity-20" />
                    )}
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0" />
            </AppLink>
        </div>
    )
}
