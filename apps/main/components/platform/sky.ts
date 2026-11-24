/*
 * The C5 "Clear Himalayan sky" accent for the dashboard (owner pick, 2026-11-24), as the class strings the dashboard
 * pages share. They map to the tokens in app/boli.css (`boli-sky`, `boli-sky-dark`, `boli-sky-ink`, `boli-sky-soft`);
 * ink and soft switch with the theme on their own.
 */

/** Links and small accent text: the text-safe sky (#1d64a3 light, #6cb2ef dark). */
export const SKY_TEXT = "text-boli-sky-ink"
/** A filled accent (a chart's highlighted bar, a progress bar). */
export const SKY_FILL = "bg-boli-sky dark:bg-boli-sky-dark"
/** A soft tint for badges and panels. */
export const SKY_SOFT = "bg-boli-sky-soft"
/** A ring in the accent. */
export const SKY_RING = "ring-boli-sky dark:ring-boli-sky-dark"
/** A text link: sky ink, underline on hover. */
export const SKY_LINK = `${SKY_TEXT} underline-offset-4 hover:underline`

/**
 * Raw values for SVG and recharts fills and for the Dhaka art palettes, which take a colour, not a class. Keep equal
 * to app/boli.css.
 */
export const SKY = { fill: "#3d8fd6", text: "#1d64a3", dark: "#6cb2ef", soft: "#e4f0fb", darkSoft: "#152533" } as const
