import type { CSSProperties } from "react"
import { cn } from "@repo/ui/lib/utils"

/*
 * The Boli mark, R2 "Bo-li" (owner pick, 2026-11-24): a thread with two crests - a stressed bo, a lighter li - ending
 * in a dot. Every curve joins extrema with HORIZONTAL cubic handles, so each crest is a true turning point. One stroke
 * width, round caps; the dot is the only fill. Below 32px a slightly heavier cut replaces the full drawing (the
 * owner's "only the weight steps up below 32px").
 *
 * Paints with currentColor; the dot is `fill-boli-crimson` (`boli-crimson-lift` on dark) unless `accent` says otherwise.
 * The lockup (mark + "Boli" in Fraunces Soft) is `BoliLogo` in ./boli-logo.tsx. The favicon and app icons in app/ draw
 * the same paths through `threadPath` and `THREAD`.
 */

type Pt = readonly [x: number, y: number]
type Cut = { lead: number; points: readonly Pt[]; k: number; stroke: number; dot: { cx: number; cy: number; r: number } }

const POINTS: readonly Pt[] = [
    [7, 24],
    [13, 8.5],
    [20.5, 39],
    [28, 13.5],
    [34, 24],
]

export const THREAD: Record<"full" | "small", Cut> = {
    full: { lead: 4, points: POINTS, k: 0.42, stroke: 4.4, dot: { cx: 42.6, cy: 24, r: 3.4 } },
    small: { lead: 4, points: POINTS, k: 0.44, stroke: 4.9, dot: { cx: 42.8, cy: 24, r: 3.7 } },
}

/** One cut's path data (viewBox 0 0 48 48). */
export function threadPath({ lead, points, k }: Cut): string {
    const [first, ...rest] = points
    if (!first) return ""
    const r = (n: number) => Math.round(n * 100) / 100
    let d = `M${lead} ${first[1]}H${first[0]}`
    let prev = first
    for (const p of rest) {
        const dx = (p[0] - prev[0]) * k
        d += `C${r(prev[0] + dx)} ${prev[1]} ${r(p[0] - dx)} ${p[1]} ${p[0]} ${p[1]}`
        prev = p
    }
    return d
}

const PATHS = { full: threadPath(THREAD.full), small: threadPath(THREAD.small) } as const

/** Below this rendered size (px) the heavier small cut is drawn. */
export const SMALL_CUT_BELOW = 32

export function BoliMark({
    px,
    cut,
    accent,
    title,
    className,
    style,
}: {
    /**
     * Rendered size in px; also picks the cut (under 32 = small) unless `cut` is given. Sized by className instead, it
     * draws the small cut - right for every inline use; pass `cut="full"` for a big mark sized by class.
     */
    px?: number
    cut?: "full" | "small"
    /** The dot's fill. Default: the brand crimson (lifted on dark). */
    accent?: string
    /** Decorative unless a title is given. */
    title?: string
    className?: string
    style?: CSSProperties
}) {
    const which = cut ?? (px != null && px >= SMALL_CUT_BELOW ? "full" : "small")
    const spec = THREAD[which]
    const a11y = title ? ({ role: "img", "aria-label": title } as const) : ({ "aria-hidden": true } as const)
    return (
        <svg
            viewBox="0 0 48 48"
            className={cn("shrink-0", className)}
            style={px != null ? { width: px, height: px, ...style } : style}
            shapeRendering="geometricPrecision"
            {...a11y}
        >
            <path d={PATHS[which]} fill="none" stroke="currentColor" strokeWidth={spec.stroke} strokeLinecap="round" strokeLinejoin="round" />
            <circle
                cx={spec.dot.cx}
                cy={spec.dot.cy}
                r={spec.dot.r}
                fill={accent}
                className={accent ? undefined : "fill-boli-crimson dark:fill-boli-crimson-lift"}
            />
        </svg>
    )
}

/** Kura's avatar: the mark on a round tile. */
export function BoliAvatar({ size = 28, className }: { size?: number; className?: string }) {
    return (
        <span
            aria-hidden
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800",
                className,
            )}
            style={{ width: size, height: size }}
        >
            <BoliMark px={Math.round(size * 0.64)} />
        </span>
    )
}
