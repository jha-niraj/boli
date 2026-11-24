import type { CSSProperties } from "react"

/*
 * L8 "The thread", refined - R2 "Bo-li" kept. Every curve is generated from a list of extrema (peaks, troughs, the baseline) joined by
 * cubic Beziers with HORIZONTAL handles, so each crest is a true turning point and the stroke never kinks. The handle
 * factor k sets the character: 0.363 is a pure sine; above it the flanks get steeper and the crests rounder, which
 * opens more white between neighbouring strokes (what makes a 16px favicon read).
 *
 * Optical rules held in every refinement:
 * - one stroke width, round caps and joins; the end dot is the only fill,
 * - the dot is about 1.6x the stroke in diameter (so it reads as a dot, not as a stray cap) and the gap before it is
 *   about one stroke wide,
 * - the ink bounds (stroke and dot included) are centred on 24,24 within half a unit,
 * - at 16 and 24px a small cut with fewer crests and a heavier stroke replaces the full drawing.
 */

type Pt = readonly [x: number, y: number]

type Cut = {
    /** Straight lead-in start x (along the first point's y). Omit for no lead-in. */
    lead?: number
    points: readonly Pt[]
    k: number
    stroke: number
    dot: { cx: number; cy: number; r: number }
}

/** R2 "Bo-li" is the owner's pick (2026-11-24); the other refinements were removed. */
export type ThreadCode = "R2"

/** Decorative unless a title is given. */
function svgA11y(title: string | undefined) {
    return title ? ({ role: "img", "aria-label": title } as const) : ({ "aria-hidden": true } as const)
}

function wave({ lead, points, k }: Cut): string {
    const [first, ...rest] = points
    if (!first) return ""
    const r = (n: number) => Math.round(n * 100) / 100
    let d = lead != null ? `M${lead} ${first[1]}H${first[0]}` : `M${first[0]} ${first[1]}`
    let prev = first
    for (const p of rest) {
        const dx = (p[0] - prev[0]) * k
        d += `C${r(prev[0] + dx)} ${prev[1]} ${r(p[0] - dx)} ${p[1]} ${p[0]} ${p[1]}`
        prev = p
    }
    return d
}

export const THREAD: Record<ThreadCode, { name: string; line: string; full: Cut; small: Cut }> = {
    R2: {
        name: "Bo-li",
        line: "Two syllables, two crests: a stressed bo, a lighter li, then the dot. One drawing at every size - only the weight steps up below 32px.",
        full: {
            lead: 4,
            points: [
                [7, 24],
                [13, 8.5],
                [20.5, 39],
                [28, 13.5],
                [34, 24],
            ],
            k: 0.42,
            stroke: 4.4,
            dot: { cx: 42.6, cy: 24, r: 3.4 },
        },
        small: {
            lead: 4,
            points: [
                [7, 24],
                [13, 8.5],
                [20.5, 39],
                [28, 13.5],
                [34, 24],
            ],
            k: 0.44,
            stroke: 4.9,
            dot: { cx: 42.8, cy: 24, r: 3.7 },
        },
    },
}

const PATHS: Record<ThreadCode, { full: string; small: string }> = {
    R2: { full: wave(THREAD.R2.full), small: wave(THREAD.R2.small) },
}

/**
 * One refinement of the thread. `px` picks the cut: 24 and below draw the small cut. Paints with currentColor; `accent`
 * is the end dot (crimson on light, the lifted crimson on near-black).
 */
export function ThreadMark({
    code = "R2",
    px,
    cut,
    accent = "currentColor",
    title,
    className,
    style,
}: {
    code?: ThreadCode
    /** Rendered size; also chooses the cut unless `cut` is given. */
    px?: number
    cut?: "full" | "small"
    accent?: string
    title?: string
    className?: string
    style?: CSSProperties
}) {
    const which = cut ?? (px != null && px <= 24 ? "small" : "full")
    const spec = THREAD[code][which]
    return (
        <svg
            viewBox="0 0 48 48"
            className={className}
            style={px != null ? { width: px, height: px, ...style } : style}
            shapeRendering="geometricPrecision"
            {...svgA11y(title)}
        >
            <path d={PATHS[code][which]} fill="none" stroke="currentColor" strokeWidth={spec.stroke} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={spec.dot.cx} cy={spec.dot.cy} r={spec.dot.r} fill={accent} />
        </svg>
    )
}

/** Lockup tuning per refinement: Fraunces Soft weight and optical size matched to the stroke weight of the mark. */
export const LOCKUP: Record<ThreadCode, { weight: number; opsz: number; tracking: string; markEm: number; gapEm: number; note: string }> = {
    R2: { weight: 500, opsz: 24, tracking: "-0.012em", markEm: 1, gapEm: 0.26, note: "Fraunces Soft 500, opsz 24, -0.012em" },
}

export const CRIMSON = "#c8102e"
export const CRIMSON_ON_DARK = "#e4344d"
