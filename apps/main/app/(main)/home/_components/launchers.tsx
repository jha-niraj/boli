import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { BoliMark } from "@repo/brand/boli-mark"
import { SKY_SOFT, SKY_TEXT } from "@/components/platform/sky"
import { API_KEY_PREFIX, BOLI_CHAT } from "@repo/boli"
import { ROUTES } from "@/lib/navigation"
import { WEB } from "@/lib/web-links"

/*
 * H1 launchers (owner, 2026-11-24): Sarvam-style product cards in the PC3 "product moment" style - a small real slice
 * of each product on a sky panel, then the name and one short line. Speech is marked Next and drawn quieter.
 *
 * NOTHING truncates or clips (owner bug on the wireframe): the copy is short and wraps to at most two lines, the slices
 * wrap instead of cutting, and the panel grows with its content. 5 cards: 3 per row from sm, 5 from xl; on a phone a
 * horizontal row of fixed-width cards that scrolls.
 */

type Launcher = { id: "kura" | "keys" | "models" | "docs" | "speech"; title: string; line: string; href?: string; next?: boolean }

const LAUNCHERS: Launcher[] = [
    { id: "kura", title: "Kura", line: "Chat in Nepali, English or both", href: ROUTES.kura },
    { id: "keys", title: "API keys", line: "Create and revoke keys", href: ROUTES.keys },
    { id: "models", title: "Models", line: "Prices per 1M tokens", href: ROUTES.models },
    { id: "docs", title: "Docs", line: "Quickstart in 5 languages", href: WEB.doc("quickstart") },
    { id: "speech", title: "Swar", line: "Speech to text", next: true },
]

const SLIP = "rounded-lg bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgb(20_20_20/0.06)] dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-inset dark:ring-neutral-800"

function Slice({ id }: { id: Launcher["id"] }) {
    if (id === "kura")
        return (
            <div className="grid w-full gap-1.5 text-xs">
                <span className={cn("ml-auto max-w-[90%] rounded-xl rounded-br-sm text-neutral-900 dark:text-neutral-100", SLIP)}>k cha, sanchai?</span>
                <span className="flex min-w-0 items-start gap-1.5 text-neutral-900 dark:text-neutral-100">
                    <BoliMark px={14} className="mt-0.5" />
                    <span className="min-w-0 break-words">Sanchai cha! Tapai lai?</span>
                </span>
            </div>
        )
    if (id === "keys")
        return (
            <div className={cn("flex w-full min-w-0 items-center justify-between gap-2 font-mono text-xs text-neutral-900 dark:text-neutral-100", SLIP)}>
                <span className="min-w-0 whitespace-nowrap">{API_KEY_PREFIX}3f9a**</span>
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
            </div>
        )
    if (id === "models")
        return (
            <div className={cn("w-full min-w-0 text-xs", SLIP)}>
                <p className="break-all font-mono text-neutral-900 dark:text-neutral-100">{BOLI_CHAT.id}</p>
                <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                    Rs {BOLI_CHAT.pricePerMillion.input} in / Rs {BOLI_CHAT.pricePerMillion.output} out
                </p>
            </div>
        )
    if (id === "docs")
        return (
            <div className={cn("w-full min-w-0 font-mono text-xs leading-5", SLIP)}>
                <p className="break-all text-neutral-600 dark:text-neutral-400">
                    client = <span className={SKY_TEXT}>OpenAI</span>(
                </p>
                <p className="break-all pl-3 text-neutral-900 dark:text-neutral-100">base_url=&quot;.../v1&quot;)</p>
            </div>
        )
    return (
        <div aria-hidden className={cn("flex h-8 w-full items-center gap-[3px] overflow-hidden", SLIP)}>
            {Array.from({ length: 18 }, (_, i) => (
                <span key={i} className="w-[2px] shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-600" style={{ height: 4 + Math.round(Math.abs(Math.sin(i * 0.8)) * 14) }} />
            ))}
        </div>
    )
}

function Card({ l, className }: { l: Launcher; className?: string }) {
    const inner: ReactNode = (
        <>
            <div className={cn("flex min-h-[84px] items-center rounded-xl px-2.5 py-2.5", l.next ? "bg-neutral-100 opacity-80 dark:bg-neutral-800/60" : SKY_SOFT)}>
                <Slice id={l.id} />
            </div>
            <div className="flex items-start justify-between gap-2 px-1.5 pt-2.5">
                <p className="min-w-0 text-sm font-medium text-neutral-900 dark:text-white">{l.title}</p>
                {l.next ? (
                    <span className="shrink-0 rounded-full px-1.5 text-xs text-neutral-600 ring-1 ring-inset ring-neutral-200 dark:text-neutral-400 dark:ring-neutral-700">Next</span>
                ) : (
                    <ArrowUpRight aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform group-hover/l:-translate-y-0.5 group-hover/l:translate-x-0.5 motion-reduce:transition-none dark:text-neutral-400" />
                )}
            </div>
            <p className="px-1.5 pb-1 text-xs leading-4 text-neutral-600 dark:text-neutral-400">{l.line}</p>
        </>
    )
    const box = cn(
        "group/l flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900",
        className,
    )
    if (!l.href) return <div className={box} aria-label={`${l.title} - coming next`}>{inner}</div>
    return (
        <AppLink
            href={l.href}
            className={cn(box, "cursor-pointer outline-none transition-colors hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:border-neutral-700")}
        >
            {inner}
        </AppLink>
    )
}

export function Launchers() {
    return (
        <>
            {/* Phone: one swipeable row of fixed-width cards. */}
            <ScrollArea orientation="horizontal" className="min-w-0 sm:hidden">
                <div className="flex gap-3 pb-2">
                    {LAUNCHERS.map((l) => <Card key={l.id} l={l} className="w-44 shrink-0" />)}
                </div>
            </ScrollArea>
            {/* sm and up: a grid, 3 per row, all 5 in one row from xl. */}
            <div className="hidden min-w-0 gap-3 sm:grid sm:grid-cols-3 xl:grid-cols-5">
                {LAUNCHERS.map((l) => <Card key={l.id} l={l} />)}
            </div>
        </>
    )
}

/** The launchers' skeleton, same breakpoints. */
export function LaunchersSkeleton() {
    const card = (i: number, className?: string) => (
        <div key={i} className={cn("rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <Skeleton className="h-[84px] w-full rounded-xl" delay={i * 0.04} />
            <Skeleton className="mx-1.5 mt-3 h-3.5 w-16 rounded" />
            <Skeleton className="mx-1.5 mb-1 mt-2 h-3 w-28 max-w-[80%] rounded" />
        </div>
    )
    return (
        <>
            <div className="flex gap-3 overflow-hidden pb-2 sm:hidden">{[0, 1, 2].map((i) => card(i, "w-44 shrink-0"))}</div>
            <div className="hidden min-w-0 gap-3 sm:grid sm:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => card(i))}</div>
        </>
    )
}
