import { cn } from "@repo/ui/lib/utils"
import { BRAND } from "@repo/boli"
import { BoliMark, SMALL_CUT_BELOW } from "./boli-mark"
import { serif } from "./type"

/** Lockup tuning matched to the mark's stroke (approved R2 sheet): Fraunces Soft 500, opsz 24, mark 1em, gap 0.26em. */
const LOCKUP = { weight: 500, opsz: 24, tracking: "-0.012em", gapEm: 0.26 } as const

/**
 * The Boli logo: the R2 "Bo-li" mark (./boli-mark.tsx), then "Boli" in Fraunces Soft. Ink is currentColor - near-black
 * on light, white on dark (`text-boli-ink dark:text-white` by default; override with a text class). The dot stays
 * crimson, the only crimson in the chrome.
 *
 * Size it with `size` (the name's font size in px; also picks the mark's cut) or with a text class (`text-2xl`). The
 * mark is 1em of that size. With `wordmark={false}` the mark renders alone at 1.5em and carries the accessible name.
 * Sizes that read well: 19 (rail), 24 (site nav), 26 (auth), 44+ (hero lockups).
 */
export function BoliLogo({ className, wordmark = true, size }: { className?: string; wordmark?: boolean; size?: number }) {
    const fontSize = size != null ? { fontSize: size } : undefined
    if (!wordmark) {
        const cut = size != null && size * 1.5 >= SMALL_CUT_BELOW ? "full" : "small"
        return (
            <span className={cn("inline-flex items-center text-boli-ink dark:text-white", className)} style={fontSize}>
                <BoliMark cut={cut} className="size-[1.5em]" title={BRAND.name} />
            </span>
        )
    }
    const cut = size != null && size >= SMALL_CUT_BELOW ? "full" : "small"
    return (
        <span className={cn("inline-flex items-center leading-none text-boli-ink dark:text-white", className)} style={{ gap: `${LOCKUP.gapEm}em`, ...fontSize }}>
            <BoliMark cut={cut} className="size-[1em]" />
            <span className="leading-none" style={serif(LOCKUP.weight, LOCKUP.opsz, LOCKUP.tracking)}>
                {BRAND.name}
            </span>
        </span>
    )
}
