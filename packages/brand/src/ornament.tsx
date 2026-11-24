import { cn } from "@repo/ui/lib/utils"

/**
 * A fine line flourish for a hero: two tapering swirls meeting at a small diamond, drawn in hairline strokes that
 * inherit `currentColor` (set it with a text colour class, e.g. `text-boli-crimson-ink/40`). Decorative only.
 */
export function Ornament({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 24" fill="none" aria-hidden className={cn("h-6 w-60 text-boli-muted", className)}>
            <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round">
                <path d="M4 12h78" />
                <path d="M236 12h-78" />
                <path d="M82 12c8 0 12-7 19-7 5 0 7 3.5 7 7s-2.5 5-5 5-4-1.6-4-3.6 1.4-3 3-3" />
                <path d="M158 12c-8 0-12-7-19-7-5 0-7 3.5-7 7s2.5 5 5 5 4-1.6 4-3.6-1.4-3-3-3" />
                <path d="M82 12c8 0 12 7 19 7" opacity="0.6" />
                <path d="M158 12c-8 0-12 7-19 7" opacity="0.6" />
                <path d="m120 6 6 6-6 6-6-6Z" />
            </g>
            <circle cx="120" cy="12" r="1.5" fill="currentColor" />
            <circle cx="40" cy="12" r="1" fill="currentColor" />
            <circle cx="200" cy="12" r="1" fill="currentColor" />
        </svg>
    )
}
