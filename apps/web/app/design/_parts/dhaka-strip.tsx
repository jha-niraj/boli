import { useId } from "react"
import { cn } from "@repo/ui/lib/utils"
import { DHAKA_TILES, DhakaPattern } from "../_art/dhaka/pattern"
import type { Sky } from "./sky"

/*
 * A Dhaka band for cards, using the pattern drawn in _art/dhaka (imported read-only). Round 2 tints it with the
 * picked sky: ink stripes, the sky in the triangles, warm sand as the second thread, the text-safe sky as the seam.
 * Crimson stays out (the logo keeps it).
 */
export type DhakaTone = "sky" | "tonal" | "night"

export function dhakaPalette(sky: Sky, tone: DhakaTone): Record<string, string> {
    if (tone === "tonal") return { bg: "#f7f5f3", c1: "#3a3a3a", c2: "#d6cfc5", c3: "#a39d96", c4: "#8b847b" }
    if (tone === "night") return { bg: "#1a1b1d", c1: "#f5f3f0", c2: sky.dark, c3: "#6b6560", c4: sky.dark }
    return { bg: sky.soft, c1: "#141414", c2: sky.fill, c3: "#d8c7a8", c4: sky.text }
}

/** A full-width woven strip. `scale` = screen pixels per thread; height follows the tile. */
export function DhakaStrip({ sky, tone = "sky", scale = 2, tile = "slim", className }: { sky: Sky; tone?: DhakaTone; scale?: number; tile?: "slim" | "full"; className?: string }) {
    const raw = useId()
    const id = `dhaka-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`
    const h = DHAKA_TILES[tile].h * scale
    return (
        <svg aria-hidden className={cn("block w-full", className)} height={h} preserveAspectRatio="none">
            <defs>
                <DhakaPattern id={id} palette={dhakaPalette(sky, tone)} scale={scale} tile={tile} />
            </defs>
            <rect width="100%" height={h} fill={`url(#${id})`} />
        </svg>
    )
}
