import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import type { Grid, Palette } from "@repo/brand/art/pixel/grid"
import { Pixels, PixelSvg } from "@repo/brand/art/pixel/pixels"
import { DHAKA_ICON_KEYS, DHAKA_ICON_KEYS_DARK, DARK_BUBBLE, DAY, EMPTY_BUBBLE, ICON_BELL, ICON_CLAPPER, ICON_COINS, ICON_KEY, ICON_SEARCH, ICON_SPROUT } from "@repo/brand/art/status/pixel"
import { DashDhaka } from "./dhaka-band"

/*
 * Boli's "nothing yet" moments (owner picks, 2026-11-24, /design Empty E1-E6) - the console's EmptyState. A copy of
 * apps/main/components/empty/boli-empty.tsx (keep the two equal; a move to @repo/brand would let both share one). One shape for
 * all six: a small pixel icon on a sky tile hemmed with Dhaka, one title, one line, one action. Light and dark render
 * side by side and the theme class picks one, so the first frame is right with no client code.
 *
 *   keys           E1  a brass key           no API keys yet
 *   usage          E2  a seedling            no usage / no requests in the window
 *   conversations  E3  Kura's empty bubble   no conversations (Kura's History)
 *   payments       E4  coin stacks           no payments / no billing history
 *   notifications  E5  the ghanti            all caught up
 *   search         E6  a magnifier on Dhaka  a search or filter with no results
 */

export type BoliEmptyKind = "keys" | "usage" | "conversations" | "payments" | "notifications" | "search"

function Icon({ grid, palette, px, label }: { grid: Grid; palette: Palette; px: number; label: string }) {
    return (
        <div style={{ width: grid.w * px, height: grid.h * px }}>
            <PixelSvg w={grid.w} h={grid.h} label={label} preserve="xMidYMid meet" className="block size-full">
                <Pixels grid={grid} palette={palette} />
            </PixelSvg>
        </div>
    )
}

function Art({ kind, dark }: { kind: BoliEmptyKind; dark: boolean }) {
    if (kind === "keys") return <Icon grid={ICON_KEY} palette={DAY} px={3} label="A brass key" />
    if (kind === "usage") return <Icon grid={ICON_SPROUT} palette={DAY} px={3.5} label="A seedling" />
    if (kind === "payments") return <Icon grid={ICON_COINS} palette={DAY} px={3} label="Two stacks of coins" />
    if (kind === "search") return <Icon grid={ICON_SEARCH} palette={{ ...DAY, ...(dark ? DHAKA_ICON_KEYS_DARK : DHAKA_ICON_KEYS) }} px={2.6} label="A magnifier over a scrap of Dhaka" />
    if (kind === "notifications") {
        return (
            <div style={{ width: ICON_BELL.w * 3, height: ICON_BELL.h * 3 + 6 }}>
                <PixelSvg w={ICON_BELL.w} h={ICON_BELL.h + 2} label="A temple bell at rest" preserve="xMidYMid meet" className="block size-full">
                    <g className="bl-swing">
                        <Pixels grid={ICON_BELL} palette={DAY} />
                        <Pixels grid={ICON_CLAPPER} palette={DAY} x={6} y={14} />
                    </g>
                </PixelSvg>
            </div>
        )
    }
    const p = dark ? DARK_BUBBLE : DAY
    const b = EMPTY_BUBBLE
    return (
        <div style={{ width: b.w * 1.75, height: b.h * 1.75 }}>
            <PixelSvg w={b.w} h={b.h} label="Kura's empty speech bubble, waiting" preserve="xMidYMid meet" className="block size-full">
                <Pixels grid={b.frame} palette={p} />
                <rect x={b.dots.x - 6} y={b.dots.y - 3} width={2} height={8} fill={p.bubbleInk} className="bl-cursor" />
            </PixelSvg>
        </div>
    )
}

/** The tile: a sky-soft square with a Dhaka hem along its foot, the icon centred above it. */
export function EmptyTile({ kind, className }: { kind: BoliEmptyKind; className?: string }) {
    return (
        <div aria-hidden className={cn("relative flex size-[5.5rem] shrink-0 flex-col overflow-hidden rounded-2xl bg-boli-sky-soft", className)}>
            <div className="flex flex-1 items-center justify-center">
                <div className="dark:hidden"><Art kind={kind} dark={false} /></div>
                <div className="hidden dark:block"><Art kind={kind} dark /></div>
            </div>
            <DashDhaka height={6} />
        </div>
    )
}

/**
 * The empty state. `framed` draws it as its own card (a whole region with nothing in it); without it, it sits inside
 * an existing card or panel. `compact` trims the padding for a short region (a side column, a card beside a chart).
 */
export function BoliEmpty({ kind, title, description, action, framed = false, compact = false, className }: {
    kind: BoliEmptyKind
    title: string
    description: string
    action?: ReactNode
    framed?: boolean
    compact?: boolean
    className?: string
}) {
    return (
        <div
            className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-3 text-center",
                compact ? "px-4 py-6" : "min-h-56 px-6 py-8",
                framed && "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
                className,
            )}
        >
            <EmptyTile kind={kind} />
            <div className="grid gap-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="mx-auto max-w-[34ch] text-xs leading-5 text-neutral-600 dark:text-neutral-400">{description}</p>
            </div>
            {action ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
        </div>
    )
}
