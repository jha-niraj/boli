"use client"

import type { ReactNode } from "react"
import { DhakaBand } from "@/components/art/dhaka/pattern"
import type { Grid, Palette } from "@/components/art/pixel/grid"
import { Pixels } from "@/components/art/pixel/pixels"
import { sans } from "../_parts/t1"
import { PixelSvg } from "./art"
import { DashCard, INK, ModeSurface, OptionHead, type Mode } from "./kit"
import { DAY, DARK_BUBBLE, DHAKA_ICON_KEYS, DHAKA_ICON_KEYS_DARK, EMPTY_BUBBLE, ICON_BELL, ICON_CLAPPER, ICON_COINS, ICON_KEY, ICON_SEARCH, ICON_SPROUT } from "./pixel"

/*
 * E1-E6: the dashboard's "nothing yet" moments. One shape for all six: a small pixel icon on a tile hemmed with
 * Dhaka, one title, one line, one action - shown inside a real dashboard card, light and dark.
 */

const HEM: Record<Mode, Palette> = {
    light: { bg: "#e4f0fb", c1: "#141414", c2: "#3d8fd6", c3: "#d8c7a8", c4: "#1d64a3" },
    dark: { bg: "#152533", c1: "#f5f3f0", c2: "#6cb2ef", c3: "#6b6560", c4: "#6cb2ef" },
}


/** The tile: a sky-soft square with a Dhaka hem along its foot, the icon centred above it. */
function Tile({ mode, children }: { mode: Mode; children: ReactNode }) {
    return (
        <div className="relative flex size-[5.5rem] shrink-0 flex-col overflow-hidden rounded-2xl" style={{ background: mode === "dark" ? "#1b2530" : "#eef5fc" }}>
            <div className="flex flex-1 items-center justify-center">{children}</div>
            <DhakaBand height={6} palette={HEM[mode]} tile="slim" />
        </div>
    )
}

function PixelIcon({ grid, palette, px }: { grid: Grid; palette: Palette; px: number }) {
    return (
        <div style={{ width: grid.w * px, height: grid.h * px }}>
            <PixelSvg w={grid.w} h={grid.h} className="size-full">
                <Pixels grid={grid} palette={palette} />
            </PixelSvg>
        </div>
    )
}

type Empty = { code: string; name: string; card: string; meta?: string; title: string; line: string; action: string; art: (mode: Mode) => ReactNode }

const EMPTIES: readonly Empty[] = [
    {
        code: "E1",
        name: "No API keys yet",
        card: "API keys",
        title: "No API keys yet",
        line: "Create one to call boli-chat from your own code.",
        action: "Create a key",
        art: () => <PixelIcon grid={ICON_KEY} palette={DAY} px={3} />,
    },
    {
        code: "E2",
        name: "No usage yet",
        card: "Usage",
        meta: "Last 30 days",
        title: "No usage yet",
        line: "Your first API call or Kura message shows here within a minute.",
        action: "Read the quickstart",
        art: () => <PixelIcon grid={ICON_SPROUT} palette={DAY} px={3.5} />,
    },
    {
        code: "E3",
        name: "No conversations",
        card: "History",
        title: "No conversations yet",
        line: "Ask Kura anything - in Nepali, English or both.",
        action: "Start a conversation",
        art: (mode) => {
            const p = mode === "dark" ? DARK_BUBBLE : DAY
            const b = EMPTY_BUBBLE
            return (
                <div style={{ width: b.w * 1.75, height: b.h * 1.75 }}>
                    <PixelSvg w={b.w} h={b.h} className="size-full">
                        <Pixels grid={b.frame} palette={p} />
                        <rect x={b.dots.x - 6} y={b.dots.y - 3} width={2} height={8} fill={p.bubbleInk} className="ld-cursor" />
                    </PixelSvg>
                </div>
            )
        },
    },
    {
        code: "E4",
        name: "No payments",
        card: "Payments",
        title: "No payments yet",
        line: "Credit packs you buy show here, each with its receipt.",
        action: "Add credits",
        art: () => <PixelIcon grid={ICON_COINS} palette={DAY} px={3} />,
    },
    {
        code: "E5",
        name: "No notifications",
        card: "Notifications",
        title: "You are all caught up",
        line: "The ghanti rings when a payment lands or a key is first used.",
        action: "Notification settings",
        art: () => (
            <div style={{ width: ICON_BELL.w * 3, height: ICON_BELL.h * 3 + 6 }}>
                <PixelSvg w={ICON_BELL.w} h={ICON_BELL.h + 2} className="size-full">
                    <g className="ld-swing">
                        <Pixels grid={ICON_BELL} palette={DAY} />
                        <Pixels grid={ICON_CLAPPER} palette={DAY} x={6} y={14} />
                    </g>
                </PixelSvg>
            </div>
        ),
    },
    {
        code: "E6",
        name: "Search with no results",
        card: "Search conversations",
        meta: "\"gemma 7b\"",
        title: "No matches for \"gemma 7b\"",
        line: "Try a shorter word, or search all of Kura.",
        action: "Clear search",
        art: (mode) => <PixelIcon grid={ICON_SEARCH} palette={{ ...DAY, ...(mode === "dark" ? DHAKA_ICON_KEYS_DARK : DHAKA_ICON_KEYS) }} px={2.6} />,
    },
]

function EmptyCard({ e, mode }: { e: Empty; mode: Mode }) {
    const t = INK[mode]
    return (
        <DashCard
            title={e.card}
            meta={
                e.meta ? (
                    <span className="truncate text-xs" style={{ color: t.muted }}>
                        {e.meta}
                    </span>
                ) : undefined
            }
        >
            <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                <Tile mode={mode}>{e.art(mode)}</Tile>
                <div className="grid gap-1">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100" style={sans(500)}>
                        {e.title}
                    </p>
                    <p className="mx-auto max-w-[30ch] text-xs leading-5 text-neutral-600 dark:text-neutral-400">{e.line}</p>
                </div>
                <span
                    aria-disabled
                    className="mt-1 inline-flex h-8 cursor-pointer items-center rounded-full px-3.5 text-[13px]"
                    style={{ ...sans(450), background: mode === "dark" ? "#ffffff" : "#141414", color: mode === "dark" ? "#141414" : "#ffffff" }}
                >
                    {e.action}
                </span>
            </div>
        </DashCard>
    )
}

export function EmptyBoard() {
    return (
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-x-8">
            {EMPTIES.map((e) => (
                <article key={e.code} className="grid min-w-0 content-start gap-4">
                    <OptionHead code={e.code} name={e.name} line={`"${e.title}" - ${e.action}.`} />
                    <div className="grid overflow-hidden rounded-3xl border border-boli-line sm:grid-cols-2">
                        {(["light", "dark"] as const).map((m) => (
                            <ModeSurface key={m} mode={m} className="h-full p-3">
                                <EmptyCard e={e} mode={m} />
                            </ModeSurface>
                        ))}
                    </div>
                </article>
            ))}
        </div>
    )
}
