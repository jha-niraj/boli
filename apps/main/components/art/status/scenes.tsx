import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { Frames, Pixels, PixelSvg } from "@/components/art/pixel/pixels"
import { PixelReveal } from "@/components/art/story/reveal"
import { STORY_SCENES } from "@/components/art/story/scenes"
import { PIGEON } from "@/components/art/valley/kit"
import type { Palette } from "@/components/art/pixel/grid"
import {
    DARK_BUBBLE,
    DAY,
    DIM_ROOM,
    FLAGS_H,
    FLAGS_SCENE,
    FLAGS_W,
    FORK,
    FORK_H,
    FORK_W,
    NAMASTE,
    NIGHT,
    NIGHT_H,
    NIGHT_W,
    PASAL,
    PASAL_H,
    PASAL_W,
    PORTER,
    RESTING,
    flagGrid,
} from "./pixel"

/*
 * The pixel scenes behind Boli's status screens and full-page loaders (approved on /design, owner 2026-11-24). Each
 * draws its day palette in light mode and its night palette in dark; both render and the theme class picks one, so the
 * first frame is right with no client code. Motion: ./pixel art-* frames and components/loaders/loaders.css (bl-*);
 * both stop on a readable frame under reduced motion.
 */

export type ArtMode = "light" | "dark"

/** Light copy for the light theme, dark copy for the dark one. */
function Themed({ draw, className }: { draw: (mode: ArtMode) => ReactNode; className?: string }) {
    return (
        <div className={cn("min-w-0", className)}>
            <div className="dark:hidden">{draw("light")}</div>
            <div className="hidden dark:block">{draw("dark")}</div>
        </div>
    )
}

function Stars({ points }: { points: readonly (readonly [number, number])[] }) {
    return (
        <g>
            {points.map(([x, y], i) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#f6efd2" className="bl-twinkle" style={{ animationDelay: `${-(i * 0.37) % 2.4}s` }} />
            ))}
        </g>
    )
}

/** A pale sky for the day scenes when the page is dark, so they never glare. */
const DUSK_SKY: Palette = { ...DAY, sky0: "#7fb2dc", sky1: "#98c3e6", sky2: "#b2d2ec", sky3: "#cbe0f0" }

/* ------------------------------------------------------------------------------------------------ St1a - 404 */

/** The porter with his doko at a fork in the trail, glancing at a signpost: "404" one way, "home" the other. */
export function ForkScene({ className }: { className?: string }) {
    return (
        <Themed
            className={className}
            draw={(mode) => (
                <PixelSvg w={FORK_W} h={FORK_H} label="A porter with a doko at a fork in a mountain trail, a signpost reading 404 one way and home the other" className="block aspect-[120/64] w-full">
                    <Pixels grid={FORK.grid} palette={mode === "dark" ? DUSK_SKY : DAY} />
                    <Frames a={PORTER.a} b={PORTER.b} palette={mode === "dark" ? DUSK_SKY : DAY} x={FORK.porterAt.x} y={FORK.porterAt.y} dur={3.2} />
                </PixelSvg>
            )}
        />
    )
}

/* ------------------------------------------------------------------------------------------------ St2 - 500 */

/** The story's overheating laptop between two fans (story scene 02), dimmed in dark mode. */
export function HotLaptopScene({ className }: { className?: string }) {
    const scene = STORY_SCENES[1]
    if (!scene) return null
    return (
        <Themed
            className={className}
            draw={(mode) => <PixelReveal scene={scene} palette={mode === "dark" ? DIM_ROOM : DAY} on className="block aspect-[96/60] w-full" />}
        />
    )
}

/* ------------------------------------------------------------------------------------------------ St3 - 403 */

/** A pasal with its shutter down and padlocked, a "banda" note taped on, a pigeon pecking in front. */
export function PasalScene({ className }: { className?: string }) {
    return (
        <Themed
            className={className}
            draw={(mode) => {
                const p = mode === "dark" ? { ...DAY, wall: "#d9cdbb", wallShade: "#c7b9a4" } : DAY
                return (
                    <PixelSvg w={PASAL_W} h={PASAL_H} label="A pasal with its shutter pulled down and padlocked, a note on it reading banda" className="block aspect-[120/64] w-full">
                        <Pixels grid={PASAL.grid} palette={p} />
                        <Frames a={PIGEON.a} b={PIGEON.b} palette={p} x={PASAL.pigeonAt.x} y={PASAL.pigeonAt.y} dur={1.4} />
                    </PixelSvg>
                )
            }}
        />
    )
}

/* ------------------------------------------------------------------------------------------------ St4 - model resting */

/** The Boli house asleep under a crescent moon: lights off, one amber standby light, a slow "z z". Night in both themes. */
export function RestingScene({ className }: { className?: string }) {
    return (
        <div className={cn("min-w-0", className)}>
            <PixelSvg w={NIGHT_W} h={NIGHT_H} label="The Boli house at night with its lights off under a crescent moon" className="block aspect-[120/64] w-full">
                <Pixels grid={RESTING.grid} palette={NIGHT} />
                <Stars points={RESTING.stars} />
                <rect x={RESTING.led.x} y={RESTING.led.y} width={1} height={1} fill="#f2b53c" className="bl-twinkle" />
                <g transform={`translate(${RESTING.zzAt.x} ${RESTING.zzAt.y}) scale(0.5)`}>
                    <Pixels grid={RESTING.zz} palette={NIGHT} className="bl-float" />
                </g>
            </PixelSvg>
        </div>
    )
}

/* ------------------------------------------------------------------------------------------------ F2 - prayer flags */

/** Prayer flags on a string over the hills; a lift runs down the string, flag by flag. */
export function FlagsScene({ className }: { className?: string }) {
    return (
        <Themed
            className={className}
            draw={(mode) => {
                const p = mode === "dark" ? NIGHT : DAY
                return (
                    <PixelSvg w={FLAGS_W} h={FLAGS_H} label="Prayer flags fluttering on a string above the hills" className="block aspect-[96/40] w-full">
                        <Pixels grid={FLAGS_SCENE.grid} palette={p} />
                        {FLAGS_SCENE.spots.map((s, i) => (
                            <g key={`${s.x}-${s.y}`} transform={`translate(${s.x - 1} ${s.y})`}>
                                <Pixels grid={flagGrid(s.key)} palette={p} className="bl-flag" style={{ animationDelay: `${i * 0.09}s` }} />
                            </g>
                        ))}
                        {mode === "dark" ? <Stars points={[[8, 4], [30, 2], [44, 6], [66, 3], [78, 7], [92, 2]]} /> : null}
                    </PixelSvg>
                )
            }}
        />
    )
}

/* ------------------------------------------------------------------------------------------------ F4 - Kura's bubble */

/** Kura's speech bubble: three typing dots, then "namaste" lands; again. Half-pixel UI layer, like the valley's. */
export function NamasteBubble({ className }: { className?: string }) {
    const { dots } = NAMASTE
    return (
        <Themed
            className={className}
            draw={(mode) => {
                const p = mode === "dark" ? DARK_BUBBLE : DAY
                return (
                    <PixelSvg w={NAMASTE.w} h={NAMASTE.h} label="Kura's speech bubble typing, then saying namaste" className="block h-auto w-full" preserve="xMidYMid meet">
                        <Pixels grid={NAMASTE.frame} palette={p} />
                        <g className="bl-say-dots">
                            {[-5, 0, 5].map((dx, i) => (
                                <rect key={dx} x={dots.x + dx} y={dots.y} width={3} height={3} fill={p.bubbleInk} className="bl-type" style={{ animationDelay: `${i * 0.3 - 0.9}s` }} />
                            ))}
                        </g>
                        <Pixels grid={NAMASTE.text} palette={p} className="bl-say-word" />
                    </PixelSvg>
                )
            }}
        />
    )
}
