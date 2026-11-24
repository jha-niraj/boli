/** Light and dark ink sets for the Round 2 dashboard frames (one black + soft shadow in dark, owner 2026-11-24). */
export type Tone = {
    dark: boolean
    ground: string
    surface: string
    raised: string
    line: string
    ink: string
    text: string
    muted: string
    faint: string
}

export const LIGHT: Tone = { dark: false, ground: "#f7f5f3", surface: "#ffffff", raised: "#efebe6", line: "#e6e1db", ink: "#141414", text: "#3a3a3a", muted: "#6b6560", faint: "rgba(20,20,20,0.08)" }
export const DARK: Tone = { dark: true, ground: "#121314", surface: "#1a1b1d", raised: "#222326", line: "#2a2b2e", ink: "#f5f3f0", text: "#d6d3cf", muted: "#8f8a85", faint: "rgba(255,255,255,0.08)" }
