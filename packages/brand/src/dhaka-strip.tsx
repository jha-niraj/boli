import { useId } from "react"
import { cn } from "@repo/ui/lib/utils"
import { DHAKA_TILES, DhakaPattern } from "./art/dhaka/pattern"
import { SKY } from "./sky"

/*
 * A Dhaka band for card edges (approved with PC3 and the pack cards, 2026-11-24): the topi weave tinted by the C5 sky -
 * ink stripes, the sky in the triangles, warm sand as the second thread, the text-safe sky as the seam. Crimson stays
 * out (the logo keeps it). `tonal` is ink and sand only (a quiet or "Next" card); `night` is for dark surfaces.
 */
export type DhakaTone = "sky" | "tonal" | "night"

export function dhakaPalette(tone: DhakaTone): Record<string, string> {
    if (tone === "tonal") return { bg: "#f7f5f3", c1: "#3a3a3a", c2: "#d6cfc5", c3: "#a39d96", c4: "#8b847b" }
    if (tone === "night") return { bg: "#1a1b1d", c1: "#f5f3f0", c2: SKY.dark, c3: "#6b6560", c4: SKY.dark }
    return { bg: SKY.soft, c1: "#141414", c2: SKY.fill, c3: "#d8c7a8", c4: SKY.text }
}

/** A full-width woven strip. `scale` = screen pixels per thread; the height follows the tile. */
export function DhakaStrip({ tone = "sky", scale = 2, tile = "slim", className }: { tone?: DhakaTone; scale?: number; tile?: "slim" | "full"; className?: string }) {
    const raw = useId()
    const id = `dhaka-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`
    const h = DHAKA_TILES[tile].h * scale
    return (
        <svg aria-hidden className={cn("block w-full", className)} height={h} preserveAspectRatio="none">
            <defs>
                <DhakaPattern id={id} palette={dhakaPalette(tone)} scale={scale} tile={tile} />
            </defs>
            <rect width="100%" height={h} fill={`url(#${id})`} />
        </svg>
    )
}
