import { cn } from "@repo/ui/lib/utils"
import { DhakaBand } from "@repo/brand/art/dhaka/pattern"
import { SKY } from "@repo/brand/sky"

/*
 * The Dhaka weave inside the dashboard (owner, 2026-11-24: "internally we should use the Dhaka art too"). Always a
 * thin band at a card's top edge - never behind text, never loud. Two colourways drawn from the sky accent: light
 * (sky threads on a pale sky ground) and night (warm-white and sky threads on the dark card), switched by the theme
 * class with no client code, so the first frame is right in either mode.
 *
 * Illustration inks: raw values on purpose. A copy of apps/main/components/platform/dhaka-band.tsx (keep the two equal).
 */

const LIGHT = { bg: SKY.soft, c1: "#141414", c2: SKY.fill, c3: "#d8c7a8", c4: SKY.text }
const NIGHT = { bg: "#1a1b1d", c1: "#f5f3f0", c2: SKY.dark, c3: "#6b6560", c4: SKY.dark }
/** Quieter, for something that is not live yet (Speech) or a muted surface. */
const TONAL = { bg: "#f7f5f3", c1: "#3a3a3a", c2: "#d6cfc5", c3: "#a39d96", c4: "#8b847b" }
const TONAL_NIGHT = { bg: "#1a1b1d", c1: "#8f8a85", c2: "#3a3b3e", c3: "#55524f", c4: "#3a3b3e" }

/** A slim band (12 threads tall). `height` in px: 6-18 reads as a hem; the default 9 is 0.75px per thread. */
export function DashDhaka({ height = 9, tone = "sky", className }: { height?: number; tone?: "sky" | "tonal"; className?: string }) {
    return (
        <div aria-hidden className={cn("pointer-events-none w-full shrink-0 overflow-hidden", className)} style={{ height }}>
            {/* The svg sets display:block inline, so the theme switch goes on a wrapper. */}
            <div className="dark:hidden">
                <DhakaBand height={height} tile="slim" palette={tone === "tonal" ? TONAL : LIGHT} />
            </div>
            <div className="hidden dark:block">
                <DhakaBand height={height} tile="slim" palette={tone === "tonal" ? TONAL_NIGHT : NIGHT} />
            </div>
        </div>
    )
}
