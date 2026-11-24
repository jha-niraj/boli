"use client"

import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { DHAKA_TILES } from "@repo/brand/art/dhaka/pattern"
import { Grid, type Palette } from "@repo/brand/art/pixel/grid"
import { Frames, Pixels } from "@repo/brand/art/pixel/pixels"
import { PixelReveal } from "@repo/brand/art/story/reveal"
import { STORY_SCENES } from "@repo/brand/art/story/scenes"
import { ELDER, PIGEON, stamp } from "@repo/brand/art/valley/kit"
import type { Mode } from "./kit"
import {
    DARK_BUBBLE,
    DAY,
    DIM_ROOM,
    ELDER_MAP,
    FLAGS_H,
    FLAGS_SCENE,
    FLAGS_W,
    FORK,
    FORK_H,
    FORK_W,
    HMM,
    MAP_H,
    MAP_W,
    NAMASTE,
    NIGHT,
    NIGHT_H,
    NIGHT_W,
    PASAL,
    PASAL_H,
    PASAL_W,
    PORTER,
    RESTING,
    STRIP,
    STRIP_H,
    STRIP_W,
    flagGrid,
} from "./pixel"

/*
 * The pixel scenes for the Loaders tab as React: each takes a mode and paints with the day or night palette.
 * Every svg is crisp-edged and scales to its box.
 */

export function PixelSvg({ w, h, label, className, children, preserve = "xMidYMid meet" }: { w: number; h: number; label?: string; className?: string; children: ReactNode; preserve?: string }) {
    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio={preserve}
            shapeRendering="crispEdges"
            className={cn("block", className)}
            style={{ imageRendering: "pixelated" }}
            {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        >
            {children}
        </svg>
    )
}

/* ------------------------------------------------------------------------------------------------ F2 */

/** Prayer flags on a string over the hills; a lift runs down the string, flag by flag. */
export function FlagsArt({ mode, className }: { mode: Mode; className?: string }) {
    const p = mode === "dark" ? NIGHT : DAY
    return (
        <PixelSvg w={FLAGS_W} h={FLAGS_H} label="Prayer flags fluttering on a string above the hills" className={className} preserve="xMidYMid slice">
            <Pixels grid={FLAGS_SCENE.grid} palette={p} />
            {FLAGS_SCENE.spots.map((s, i) => (
                <g key={`${s.x}-${s.y}`} transform={`translate(${s.x - 1} ${s.y})`}>
                    <Pixels grid={flagGrid(s.key)} palette={p} className="ld-flag" style={{ animationDelay: `${i * 0.09}s` }} />
                </g>
            ))}
            {mode === "dark" ? <Stars points={[[8, 4], [30, 2], [44, 6], [66, 3], [78, 7], [92, 2]]} /> : null}
        </PixelSvg>
    )
}

function Stars({ points }: { points: readonly (readonly [number, number])[] }) {
    return (
        <g>
            {points.map(([x, y], i) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#f6efd2" className="ld-twinkle" style={{ animationDelay: `${-(i * 0.37) % 2.4}s` }} />
            ))}
        </g>
    )
}

/* ------------------------------------------------------------------------------------------------ F3 */

const WEAVE = (() => {
    const g = new Grid(72, 35)
    for (let i = 0; i < 3; i++) stamp(g, DHAKA_TILES.full, i * 24, 0)
    return g
})()

const WEAVE_PALETTE: Record<Mode, Palette> = {
    light: { bg: "#e4f0fb", c1: "#141414", c2: "#3d8fd6", c3: "#d8c7a8", c4: "#1d64a3" },
    dark: { bg: "#1b2530", c1: "#f5f3f0", c2: "#6cb2ef", c3: "#6b6560", c4: "#6cb2ef" },
}

/** The Dhaka weave building a row at a time: a cover lifts off it like cloth coming off the loom, a sky thread riding the edge. */
export function WeaveArt({ mode, className, ground }: { mode: Mode; className?: string; ground: string }) {
    return (
        <PixelSvg w={72} h={35} label="Dhaka cloth being woven row by row" className={className}>
            <g className="ld-loom-weave">
                <Pixels grid={WEAVE} palette={WEAVE_PALETTE[mode]} />
            </g>
            <g className="ld-loom">
                <rect x={0} y={0} width={72} height={35} fill={ground} />
            </g>
            <g className="ld-shuttle">
                <rect x={0} y={0} width={72} height={0.5} fill={mode === "dark" ? "#6cb2ef" : "#3d8fd6"} />
                <rect x={30} y={-1} width={12} height={2} fill={mode === "dark" ? "#a77b54" : "#8a5434"} />
            </g>
        </PixelSvg>
    )
}

/* ------------------------------------------------------------------------------------------------ F4 */

/** Kura's speech bubble: three typing dots, then "namaste" lands; again. Half-pixel UI layer, like the valley's. */
export function BubbleArt({ mode, className }: { mode: Mode; className?: string }) {
    const p = mode === "dark" ? DARK_BUBBLE : DAY
    const { dots } = NAMASTE
    return (
        <PixelSvg w={NAMASTE.w} h={NAMASTE.h} label="Kura's speech bubble typing, then saying namaste" className={className}>
            <Pixels grid={NAMASTE.frame} palette={p} />
            <g className="ld-say-dots">
                {[-5, 0, 5].map((dx, i) => (
                    <rect key={dx} x={dots.x + dx} y={dots.y} width={3} height={3} fill={p.bubbleInk} className="ld-type" style={{ animationDelay: `${i * 0.3 - 0.9}s` }} />
                ))}
            </g>
            <Pixels grid={NAMASTE.text} palette={p} className="ld-say-word" />
        </PixelSvg>
    )
}

/* ------------------------------------------------------------------------------------------------ F5 */

/** The valley strip with the sun climbing across it - the sun IS the progress. */
export function SunriseArt({ mode, className }: { mode: Mode; className?: string }) {
    const p = mode === "dark" ? { ...NIGHT, sun: "#ffd98a", sunHi: "#fff1c4" } : { ...DAY, sun: "#f7c948", sunHi: "#fff1b3" }
    return (
        <PixelSvg w={STRIP_W} h={STRIP_H} label="The sun rising across a pixel valley" className={className} preserve="xMidYMid slice">
            <Pixels grid={STRIP.sky} palette={p} />
            <g className="ld-sun-fade">
                <g className="ld-sun-x">
                    <g className="ld-sun-y">
                        <Pixels grid={STRIP.sun} palette={p} x={STRIP.sunAt.x} y={STRIP.sunAt.y} />
                    </g>
                </g>
            </g>
            <Pixels grid={STRIP.land} palette={p} />
        </PixelSvg>
    )
}

/* ------------------------------------------------------------------------------------------------ status scenes */

/** St1a - the porter at a fork in the trail, glancing at a signpost: "404" one way, "home" the other. */
export function ForkArt({ mode, className }: { mode: Mode; className?: string }) {
    const p = mode === "dark" ? { ...DAY, sky0: "#7fb2dc", sky1: "#98c3e6", sky2: "#b2d2ec", sky3: "#cbe0f0" } : DAY
    return (
        <PixelSvg w={FORK_W} h={FORK_H} label="A porter with a doko at a fork in a mountain trail, a signpost reading 404 one way and home the other" className={className} preserve="xMidYMid slice">
            <Pixels grid={FORK.grid} palette={p} />
            <Frames a={PORTER.a} b={PORTER.b} palette={p} x={FORK.porterAt.x} y={FORK.porterAt.y} dur={3.2} />
        </PixelSvg>
    )
}

/** St1b - the elder on a terrace path, turning a map that does not match the trail. */
export function ElderArt({ mode, className }: { mode: Mode; className?: string }) {
    const p = mode === "dark" ? { ...DAY, sky0: "#7fb2dc", sky1: "#98c3e6", sky2: "#b2d2ec", sky3: "#cbe0f0" } : DAY
    return (
        <PixelSvg w={MAP_W} h={MAP_H} label="An elder in a Dhaka topi on a terrace path, puzzling over a map" className={className} preserve="xMidYMid slice">
            <Pixels grid={ELDER_MAP.grid} palette={p} />
            <Frames a={ELDER.a} b={ELDER.b} palette={p} x={ELDER_MAP.elderAt.x} y={ELDER_MAP.elderAt.y} dur={4} kind="blink" />
            <Pixels grid={ELDER_MAP.map} palette={p} x={ELDER_MAP.mapAt.x} y={ELDER_MAP.mapAt.y} />
            <g transform={`translate(${ELDER_MAP.elderAt.x + 6} ${ELDER_MAP.elderAt.y - 13}) scale(0.5)`}>
                <Pixels grid={HMM.text} palette={p} />
            </g>
        </PixelSvg>
    )
}

/** St2 - the story's overheating laptop between two fans (production scene 02), dimmed for dark. */
export function RoomArt({ mode, className }: { mode: Mode; className?: string }) {
    const scene = STORY_SCENES[1]
    if (!scene) return null
    return <PixelReveal scene={scene} palette={mode === "dark" ? DIM_ROOM : DAY} on className={className} />
}

/** St3 - the pasal with its shutter down and a "banda" note; a pigeon pecks in front. */
export function PasalArt({ mode, className }: { mode: Mode; className?: string }) {
    const p = mode === "dark" ? { ...DAY, wall: "#d9cdbb", wallShade: "#c7b9a4" } : DAY
    return (
        <PixelSvg w={PASAL_W} h={PASAL_H} label="A pasal with its shutter pulled down and padlocked, a note on it reading banda" className={className} preserve="xMidYMid slice">
            <Pixels grid={PASAL.grid} palette={p} />
            <Frames a={PIGEON.a} b={PIGEON.b} palette={p} x={PASAL.pigeonAt.x} y={PASAL.pigeonAt.y} dur={1.4} />
        </PixelSvg>
    )
}

/** St4 - the Boli house asleep under a crescent moon: lights off, one amber standby light, a slow "z z". */
export function RestingArt({ className }: { className?: string }) {
    const p = NIGHT
    return (
        <PixelSvg w={NIGHT_W} h={NIGHT_H} label="The Boli house at night with its lights off under a crescent moon" className={className} preserve="xMidYMid slice">
            <Pixels grid={RESTING.grid} palette={p} />
            <Stars points={RESTING.stars} />
            <rect x={RESTING.led.x} y={RESTING.led.y} width={1} height={1} fill="#f2b53c" className="ld-twinkle" />
            <g transform={`translate(${RESTING.zzAt.x} ${RESTING.zzAt.y}) scale(0.5)`}>
                <Pixels grid={RESTING.zz} palette={p} className="ld-float" />
            </g>
        </PixelSvg>
    )
}
