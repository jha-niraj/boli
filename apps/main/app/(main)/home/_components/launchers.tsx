import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { BoliMark } from "@repo/brand/boli-mark"
import { SKY_SOFT, SKY_TEXT } from "@/components/platform/sky"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { API_KEY_PREFIX } from "@repo/boli"
import { ROUTES } from "@/lib/navigation"

/*
 * The product cards (Home redesign, plan/main/jawaf/jawaf-v1.md task 11, owner 2026-11-25): one card per PRODUCT in the
 * rail - Kura, API, Jawaf live; Kagaj and Swar marked Later - each a small real slice of the product on a sky panel with
 * a Dhaka edge, then the name and a live line from this workspace ("3 chats this week", "2 bots live"). Keys, models and
 * docs moved to the API's own Home.
 *
 * NOTHING truncates or clips: the copy is short and wraps to at most two lines, the slices wrap instead of cutting, and
 * the panel grows with its content. 5 cards: 3 per row from sm, 5 from xl; on a phone a horizontal row that scrolls.
 */

type LauncherId = "kura" | "api" | "jawaf" | "kagaj" | "speech"
type Launcher = { id: LauncherId; title: string; line: string; href: string; later?: boolean }

const LAUNCHERS: Launcher[] = [
    { id: "kura", title: "Kura", line: "Chat in Nepali, English or both", href: ROUTES.kura },
    { id: "api", title: "API", line: "Boli's model in your own code", href: ROUTES.api },
    { id: "jawaf", title: "Jawaf", line: "Answers for your customers", href: ROUTES.jawaf },
    { id: "kagaj", title: "Kagaj", line: "Read Nepali documents", href: ROUTES.documentAi, later: true },
    { id: "speech", title: "Swar", line: "Speech to text", href: ROUTES.speech, later: true },
]

/** The live line under each card's name, from this workspace. `null` keeps the static line. */
export type LauncherStats = Partial<Record<LauncherId, string | null>>

const SLIP = "rounded-lg bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgb(20_20_20/0.06)] dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-inset dark:ring-neutral-800"

function Slice({ id }: { id: LauncherId }) {
    if (id === "kura")
        return (
            <div className="grid w-full gap-1 text-xs">
                <span className={cn("ml-auto max-w-[90%] rounded-xl rounded-br-sm text-neutral-900 dark:text-neutral-100", SLIP)}>k cha, sanchai?</span>
                <span className="flex min-w-0 items-start gap-1.5 text-neutral-900 dark:text-neutral-100">
                    <BoliMark px={14} className="mt-0.5" />
                    <span className="min-w-0 break-words">Sanchai cha! Tapai lai?</span>
                </span>
            </div>
        )
    if (id === "api")
        return (
            <div className={cn("w-full min-w-0 font-mono text-xs leading-5", SLIP)}>
                <p className="break-all text-neutral-600 dark:text-neutral-400">
                    client = <span className={SKY_TEXT}>OpenAI</span>(
                </p>
                <p className="break-all pl-3 text-neutral-900 dark:text-neutral-100">api_key=&quot;{API_KEY_PREFIX}...&quot;)</p>
            </div>
        )
    if (id === "jawaf")
        return (
            <div className="grid w-full gap-1 text-xs">
                <span className={cn("mr-auto w-fit max-w-[90%] rounded-xl rounded-bl-sm text-neutral-900 dark:text-neutral-100", SLIP)}>Fee kati ho?</span>
                <span className={cn("ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm text-neutral-900 dark:text-neutral-100", SLIP)}>Rs 2,500 a month.</span>
            </div>
        )
    if (id === "kagaj")
        return (
            <div aria-hidden className={cn("grid w-full gap-1", SLIP)}>
                <span className="h-1.5 w-2/3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <span className="h-1.5 w-5/6 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <span className="flex justify-between gap-2"><span className="h-1.5 w-1/3 rounded-full bg-neutral-200 dark:bg-neutral-700" /><span className="h-1.5 w-1/5 rounded-full bg-neutral-300 dark:bg-neutral-600" /></span>
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

function Card({ l, stat, className }: { l: Launcher; stat?: string | null; className?: string }) {
    const inner: ReactNode = (
        <>
            <div className={cn("overflow-hidden rounded-xl", l.later ? "bg-neutral-100 dark:bg-neutral-800/60" : SKY_SOFT)}>
                <div className={cn("flex h-[92px] items-center px-2.5 py-2", l.later && "opacity-80")}>
                    <Slice id={l.id} />
                </div>
                <DhakaStrip tone={l.later ? "tonal" : "sky"} scale={2} />
            </div>
            <div className="flex items-start justify-between gap-2 px-1.5 pt-2.5">
                <p className="min-w-0 text-sm font-medium text-neutral-900 dark:text-white">{l.title}</p>
                {l.later ? (
                    <span className="shrink-0 rounded-full px-1.5 text-xs text-neutral-600 ring-1 ring-inset ring-neutral-200 dark:text-neutral-400 dark:ring-neutral-700">Later</span>
                ) : (
                    <ArrowUpRight aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform group-hover/l:-translate-y-0.5 group-hover/l:translate-x-0.5 motion-reduce:transition-none dark:text-neutral-400" />
                )}
            </div>
            <p className="px-1.5 pb-1 text-xs leading-4 text-neutral-600 dark:text-neutral-400">{stat ?? l.line}</p>
        </>
    )
    return (
        <AppLink
            href={l.href}
            aria-label={l.later ? `${l.title} - later` : undefined}
            className={cn(
                "group/l flex min-w-0 cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-white p-1.5 outline-none transition-colors hover:border-neutral-300 focus-visible:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700",
                className,
            )}
        >
            {inner}
        </AppLink>
    )
}

export function Launchers({ stats = {} }: { stats?: LauncherStats }) {
    return (
        <>
            {/* Phone: one swipeable row of fixed-width cards. */}
            <ScrollArea orientation="horizontal" className="min-w-0 sm:hidden">
                <div className="flex gap-3 pb-2">
                    {LAUNCHERS.map((l) => <Card key={l.id} l={l} stat={stats[l.id]} className="w-44 shrink-0" />)}
                </div>
            </ScrollArea>
            {/* sm and up: a grid, 3 per row, all 5 in one row from xl. */}
            <div className="hidden min-w-0 gap-3 sm:grid sm:grid-cols-3 xl:grid-cols-5">
                {LAUNCHERS.map((l) => <Card key={l.id} l={l} stat={stats[l.id]} />)}
            </div>
        </>
    )
}

/** The launchers' skeleton, same breakpoints. */
export function LaunchersSkeleton() {
    const card = (i: number, className?: string) => (
        <div key={i} className={cn("rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <Skeleton className="h-[100px] w-full rounded-xl" delay={i * 0.04} />
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
