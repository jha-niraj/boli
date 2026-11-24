"use client"

import { useQuery } from "@tanstack/react-query"
import { Coins } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { cn } from "@repo/ui/lib/utils"
import { getMyBalance } from "@/actions/balance.action"
import { formatCredits } from "@/lib/boli"
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
