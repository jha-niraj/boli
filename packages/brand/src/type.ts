import type { CSSProperties } from "react"

/**
 * T1, the owner's type pick (2026-11-24): Fraunces with the SOFT axis for display, Instrument Sans for UI and body,
 * Geist Mono for code. The faces load once in app/fonts.ts; this file is the production twin of the /design helpers.
 *
 * Most code needs no helper: `font-serif` (Fraunces, SOFT 100, optical size following the font size) and `font-sans`
 * (Instrument Sans) are plain Tailwind classes. Reach for `serif()` only when a display line wants a hand-set optical
 * size or weight, as the approved designs do:
 * low opsz is sturdier and wider (good under 32px), high opsz has finer contrast and tighter spacing (48px and up).
 * WONK stays off - its leaning n/h/m read as a typo.
 */
export const SERIF_FAMILY = 'var(--font-boli-serif), Georgia, "Iowan Old Style", serif'

export function serif(weight = 380, opsz = 72, tracking = "-0.025em"): CSSProperties {
    return {
        fontFamily: SERIF_FAMILY,
        fontWeight: weight,
        letterSpacing: tracking,
        fontVariationSettings: `"SOFT" 100, "WONK" 0, "opsz" ${opsz}`,
    }
}

/** The display ladder used across the approved designs, so every surface shares one scale. */
export const DISPLAY = {
    /** Hero headline, 56px and up. */
    display: serif(360, 144, "-0.035em"),
    /** Section headline, 36-48px. */
    h2: serif(380, 96, "-0.03em"),
    /** Sub-section, 24-32px. */
    h3: serif(400, 48, "-0.02em"),
    /** A card title or a short line set in the serif, 18-24px. */
    card: serif(420, 36, "-0.015em"),
    /** A big figure (credits, a price). */
    number: serif(400, 72, "-0.02em"),
} as const
