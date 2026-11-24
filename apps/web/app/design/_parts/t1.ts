import type { CSSProperties } from "react"
import { FACE } from "../_components/faces"

/**
 * T1, the owner's pick (2026-11-24): Fraunces with the SOFT axis for display, Instrument Sans for everything else.
 * Every Round 2 frame is set through these two helpers so a weight or tracking change lands everywhere at once.
 *
 * Fraunces' optical size (opsz 9-144) is set by hand: low opsz is sturdier and wider (good under 32px), high opsz has
 * finer contrast and tighter spacing (good for 48px+ headlines). WONK stays off - its leaning n/h/m read as a typo.
 */
export function serif(weight = 380, opsz = 72, tracking = "-0.025em"): CSSProperties {
    return {
        fontFamily: FACE.fraunces,
        fontWeight: weight,
        letterSpacing: tracking,
        fontVariationSettings: `"SOFT" 100, "WONK" 0, "opsz" ${opsz}`,
    }
}

/** Instrument Sans. Body sits at 400 with a touch of positive tracking; labels at 450-500. */
export function sans(weight = 400, tracking = "0.01em"): CSSProperties {
    return { fontFamily: FACE.instrumentSans, fontWeight: weight, letterSpacing: tracking }
}

export const MONO = FACE.mono

/** Headline presets used across Round 2, so sections share one ladder. */
export const T1 = {
    display: serif(360, 144, "-0.035em"),
    h2: serif(380, 96, "-0.03em"),
    h3: serif(400, 48, "-0.02em"),
    card: serif(420, 36, "-0.015em"),
    number: serif(400, 72, "-0.02em"),
    body: sans(400),
    label: sans(450, "0.01em"),
} as const

/** WCAG relative luminance contrast between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
    const lum = (hex: string) => {
        const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0)
    }
    const x = lum(a)
    const y = lum(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
