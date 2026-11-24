/**
 * The accent: C5 "Clear Himalayan sky" (owner pick, 2026-11-24). Each value:
 * - fill: the colour itself (chart bar, focus ring, hero wash),
 * - text: a darker companion that passes WCAG AA (4.5:1) as text on the ground #f7f5f3 and on white,
 * - soft: a tint for badges and panels, wash: a deeper tint for gradients,
 * - dark: the dark-mode variant (text and bars on #121314), darkSoft its tint.
 * The other candidates (C2, C4, C6) were removed with the picker.
 */
export type Sky = {
    code: "C5"
    name: string
    note: string
    fill: string
    text: string
    soft: string
    wash: string
    dark: string
    darkSoft: string
}

export const C5: Sky = {
    code: "C5",
    name: "Clear Himalayan sky",
    note: "The blue above the range on a clear October morning. Saturated enough that a bar or ring reads at 3:1 on white.",
    fill: "#3d8fd6",
    text: "#1d64a3",
    soft: "#e4f0fb",
    wash: "#cfe4f7",
    dark: "#6cb2ef",
    darkSoft: "#152533",
}

/** Kept as a hook so every frame reads the accent the same way; it is a constant now. */
export function useSky(): Sky {
    return C5
}
