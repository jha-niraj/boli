import { cn } from "@repo/ui/lib/utils"
import { BRAND } from "@/lib/boli"

/**
 * The Boli mark: a speech bubble in Nepal crimson holding two white peaks and a sun - talk (boli) and the Himalaya in
 * one glyph. With `wordmark` (default) the name follows in Instrument Serif. Size it with `className` on the root
 * (the mark is 1.75em of the root's font size, so `text-xl` makes a bigger logo).
 */
export function BoliLogo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
    return (
        <span className={cn("inline-flex items-center gap-2 text-boli-ink", className)}>
            <svg viewBox="0 0 32 32" aria-hidden={wordmark} role={wordmark ? undefined : "img"} aria-label={wordmark ? undefined : BRAND.name} className="h-[1.75em] w-[1.75em] shrink-0">
                <path className="fill-boli-crimson" d="M8 3h16a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5h-9.5L9 29.5V25H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z" />
                <path className="fill-boli-snow" d="M6.5 21 12.5 11.5l3 4.5 3.5-6.5 6.5 11.5Z" />
                <circle className="fill-boli-snow" cx="22.5" cy="8.5" r="1.6" />
            </svg>
            {wordmark ? <span className="font-serif text-[1.5em] leading-none tracking-tight">{BRAND.name}</span> : null}
        </span>
    )
}
