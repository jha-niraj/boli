"use client"

import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { THREAD, threadPath } from "@repo/brand/boli-mark"
import { sans } from "../_parts/t1"
import { INK, ModeSurface, OptionHead, type Mode } from "./kit"

/*
 * S1-S6: the small loaders for a control (a button saving, a row toggling) and for a region with no shape to
 * skeleton. Each paints with currentColor so it takes the text colour of whatever holds it - white inside the ink pill,
 * ink beside body text - except S2's arc, which is the sky.
 */

type SpinnerProps = { size?: number; className?: string; label?: string }

function a11y(label?: string) {
    return label ? ({ role: "status", "aria-label": label } as const) : ({ "aria-hidden": true } as const)
}

/** Stroke in viewBox units that reads as ~1.5px at small sizes and ~2.5px at 32. */
function stroke(size: number): number {
    if (size <= 14) return 3
    if (size <= 16) return 2.75
    if (size <= 20) return 2.5
    return 2.1
}

/** S1 - a thin ring: one arc, turning smoothly. */
export function SpinnerRing({ size = 16, className, label }: SpinnerProps) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)} fill="none" {...a11y(label)}>
            <g className="ld-spin">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke(size)} strokeLinecap="round" strokeDasharray="17 100" />
            </g>
        </svg>
    )
}

/** S2 - a faint full track with a sky arc running round it. */
export function SpinnerTrack({ size = 16, className, label, arcClassName = "text-boli-sky dark:text-boli-sky-dark" }: SpinnerProps & { arcClassName?: string }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)} fill="none" {...a11y(label)}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.16} strokeWidth={stroke(size)} />
            <g className={cn("ld-spin-slow", arcClassName)}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke(size)} strokeLinecap="round" strokeDasharray="14 100" />
            </g>
        </svg>
    )
}

/** S3 - three dots, rising and brightening in turn (Kura's "typing", made small). */
export function SpinnerDots({ size = 16, className, label }: SpinnerProps) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)} fill="currentColor" {...a11y(label)}>
            {[4, 12, 20].map((cx, i) => (
                <circle key={cx} cx={cx} cy="12" r={size <= 16 ? 2.9 : 2.6} className="ld-dot3" style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
        </svg>
    )
}

/** S4 - eight dots round a ring; the bright one walks round and the rest fade behind it. */
export function SpinnerDotted({ size = 16, className, label }: SpinnerProps) {
    const r = size <= 16 ? 2.1 : 1.8
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)} fill="currentColor" {...a11y(label)}>
            {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2 - Math.PI / 2
                const cx = 12 + Math.cos(a) * 8.6
                const cy = 12 + Math.sin(a) * 8.6
                return <circle key={i} cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={r} className="ld-dot8" style={{ animationDelay: `${-(0.96 * (8 - i)) / 8}s` }} />
            })}
        </svg>
    )
}

const SMALL = threadPath(THREAD.small)

/** S5 - the R2 thread draws itself, the crimson dot pops, both fade, again. */
export function SpinnerThread({ size = 16, className, label }: SpinnerProps) {
    const dot = THREAD.small.dot
    return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={cn("shrink-0", className)} fill="none" {...a11y(label)}>
            <path d={SMALL} pathLength={1} className="ld-thread" stroke="currentColor" strokeWidth={THREAD.small.stroke + (size <= 16 ? 1.2 : 0.4)} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={dot.cx} cy={dot.cy} r={dot.r + (size <= 16 ? 0.8 : 0)} className="ld-thread-dot fill-boli-crimson dark:fill-boli-crimson-lift" />
        </svg>
    )
}

/** S6 - three pixel blocks that nod one after another, a whole pixel at a time. */
export function SpinnerPixel({ size = 16, className, label }: SpinnerProps) {
    return (
        <svg viewBox="0 0 13 9" width={size} height={size} className={cn("shrink-0", className)} fill="currentColor" shapeRendering="crispEdges" {...a11y(label)}>
            {[0, 5, 10].map((x, i) => (
                <rect key={x} x={x} y={4} width={3} height={3} className="ld-nod" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </svg>
    )
}

/* ------------------------------------------------------------------------------------------------ the board */

type SpinnerKind = (props: SpinnerProps) => ReactNode

const SPINNERS: readonly { code: string; name: string; line: string; C: SpinnerKind; pick?: string }[] = [
    { code: "S1", name: "Thin ring", line: "One arc turning smoothly, in the colour of whatever holds it. Quiet enough to sit inside any button.", C: SpinnerRing, pick: "Pick for controls" },
    { code: "S2", name: "Ring on a track", line: "A faint full ring with the sky arc running round it - the one place the accent shows in a loader.", C: SpinnerTrack },
    { code: "S3", name: "Three dots", line: "Three dots rising in turn. Reads as \"writing\" - the natural fit for Kura waiting on its first word.", C: SpinnerDots },
    { code: "S4", name: "Dotted ring", line: "Eight dots round a ring; the bright one walks and the rest fade behind it. Calm at 32px.", C: SpinnerDotted, pick: "Pick for regions" },
    { code: "S5", name: "Thread drawing", line: "The R2 thread draws itself and the crimson dot pops. Most Boli; busier than a ring below 16px.", C: SpinnerThread },
    { code: "S6", name: "Pixel nod", line: "Three pixel blocks nodding a pixel at a time - a small nod to the art. Best at 16px and up.", C: SpinnerPixel },
]

const SIZES = [14, 16, 20, 32] as const

function Sample({ mode, C }: { mode: Mode; C: SpinnerKind }) {
    const t = INK[mode]
    return (
        <ModeSurface mode={mode} className="grid gap-4 p-4">
            <div className="flex items-end gap-5">
                {SIZES.map((s) => (
                    <div key={s} className="grid justify-items-center gap-1.5">
                        <div className="flex h-8 items-center" style={{ color: t.ink }}>
                            <C size={s} />
                        </div>
                        <span className="font-mono text-xs" style={{ color: t.muted }}>
                            {s}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <span
                    aria-disabled
                    className="inline-flex h-9 cursor-default items-center gap-2 rounded-full px-4 text-sm"
                    style={{ ...sans(450), background: mode === "dark" ? "#ffffff" : "#141414", color: mode === "dark" ? "#141414" : "#ffffff" }}
                >
                    <C size={16} />
                    Saving...
                </span>
                <span aria-disabled className="inline-flex h-9 cursor-default items-center gap-2 rounded-full border px-4 text-sm" style={{ ...sans(450), borderColor: t.line, background: t.card, color: t.ink }}>
                    <C size={14} />
                    Refreshing
                </span>
            </div>
            <p className="flex items-center gap-2 text-sm" style={{ color: t.muted }}>
                <C size={14} />
                Loading this month&apos;s usage...
            </p>
        </ModeSurface>
    )
}

export function SpinnersBoard() {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {SPINNERS.map((s) => (
                <article key={s.code} className="grid min-w-0 content-start gap-4 rounded-3xl border border-boli-line bg-white p-5">
                    <OptionHead code={s.code} name={s.name} line={s.line} pick={s.pick} />
                    <div className="grid overflow-hidden rounded-2xl border border-boli-line sm:grid-cols-2">
                        <Sample mode="light" C={s.C} />
                        <Sample mode="dark" C={s.C} />
                    </div>
                </article>
            ))}
            <aside className="grid gap-2 rounded-3xl border border-boli-line bg-boli-sky-soft/60 p-5 text-sm leading-6 text-boli-text lg:col-span-2">
                <p className="text-boli-ink" style={sans(500)}>
                    Recommendation
                </p>
                <p>
                    <strong className="font-medium text-boli-ink">S1 for controls</strong> - a button saving, a row toggling, a refresh icon. It takes the
                    button&apos;s own colour, so it never fights the label, and it stays crisp at 14px.{" "}
                    <strong className="font-medium text-boli-ink">S4 for regions</strong> that have no shape to skeleton (a chart refetching behind its
                    numbers, a sheet waiting on a file). Regions with a shape keep their skeleton (AGENTS section 10). S3 is worth keeping just for
                    Kura&apos;s &quot;writing&quot; state.
                </p>
                <p className="text-xs text-boli-muted">Reduced motion: every spinner stops at rest; the words beside it (&quot;Saving...&quot;) carry the state.</p>
            </aside>
        </div>
    )
}
