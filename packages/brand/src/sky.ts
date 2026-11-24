/**
 * C5 "Clear Himalayan sky" (owner pick, 2026-11-24) as raw values, for the places a class cannot reach: SVG pattern
 * fills (the Dhaka weave), gradients built in a style. In markup use the Tailwind tokens from app/boli.css instead.
 * - fill: bars, focus rings, the hero wash (not for text)
 * - text: the companion that passes 4.5:1 as text on the ground and on white
 * - soft / wash: tints for badges, panels and gradients
 * - dark / darkSoft: the dark-mode pair
 */
export const SKY = {
    fill: "#3d8fd6",
    text: "#1d64a3",
    soft: "#e4f0fb",
    wash: "#cfe4f7",
    dark: "#6cb2ef",
    darkSoft: "#152533",
} as const

export type Sky = typeof SKY
