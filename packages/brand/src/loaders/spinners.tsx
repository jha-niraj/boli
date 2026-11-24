import { cn } from "@repo/ui/lib/utils"
import { THREAD, threadPath } from "../boli-mark"

/*
 * Boli's small loaders (owner picks, 2026-11-24, /design Loaders S1-S5). They replace the shared dot matrix in this
 * app; the admin app keeps @repo/ui's. Each paints with currentColor, so it takes the text colour of whatever holds it
 * (white inside the ink pill, ink beside body text). Motion lives in ./loaders.css (bl-*), loaded by app/boli.css.
 *
 *   a control's own action (a button saving, a row toggling)   ->  InlineLoader (S1, the thin ring)
 *   a small region with no shape to skeleton                    ->  RegionLoader (S4, the eight-dot circle)
 *   a brand region (a first load where the mark fits)           ->  SpinnerThread (S5, the R2 thread drawing)
 *   Kura waiting on its first word                              ->  SpinnerDots (S3, three dots)
 *   a region WITH a shape                                       ->  its skeleton, never a spinner (AGENTS.md 10)
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
            <g className="bl-spin">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke(size)} strokeLinecap="round" strokeDasharray="17 100" />
            </g>
        </svg>
    )
}

/** S3 - three dots, rising and brightening in turn ("writing"). */
export function SpinnerDots({ size = 16, className, label }: SpinnerProps) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)} fill="currentColor" {...a11y(label)}>
            {[4, 12, 20].map((cx, i) => (
                <circle key={cx} cx={cx} cy="12" r={size <= 16 ? 2.9 : 2.6} className="bl-dot3" style={{ animationDelay: `${i * 0.16}s` }} />
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
                return <circle key={i} cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={r} className="bl-dot8" style={{ animationDelay: `${-(0.96 * (8 - i)) / 8}s` }} />
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
            <path d={SMALL} pathLength={1} className="bl-thread" stroke="currentColor" strokeWidth={THREAD.small.stroke + (size <= 16 ? 1.2 : 0.4)} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={dot.cx} cy={dot.cy} r={dot.r + (size <= 16 ? 0.8 : 0)} className="bl-thread-dot fill-boli-crimson dark:fill-boli-crimson-lift" />
        </svg>
    )
}

/**
 * The busy mark inside a control (S1). Same props as @repo/ui's InlineLoader, so a call site only changes its import:
 * `size` 16 for a default button, 14 for a small one, 12 for a caption; colour comes from the control.
 */
export function InlineLoader({ size = 16, className, label = "Loading" }: { size?: number; className?: string; label?: string }) {
    return (
        <span role="status" className={cn("inline-flex shrink-0 items-center justify-center", className)}>
            <span className="sr-only">{label}</span>
            <SpinnerRing size={size} />
        </span>
    )
}

/**
 * A small region with no shape to skeleton (a panel waiting on one value, a sheet waiting on a file): the eight-dot
 * circle (S4) and one muted line, centred. `brand` swaps in the thread (S5) where the mark fits.
 */
export function RegionLoader({ label = "Loading", brand = false, className }: { label?: string; brand?: boolean; className?: string }) {
    return (
        <div role="status" className={cn("flex min-h-24 w-full flex-col items-center justify-center gap-2 py-6 text-neutral-500 dark:text-neutral-400", className)}>
            {brand ? <SpinnerThread size={28} className="text-neutral-900 dark:text-neutral-100" /> : <SpinnerDotted size={24} />}
            <span className="text-xs">{label}</span>
        </div>
    )
}
