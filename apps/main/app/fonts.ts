import localFont from "next/font/local"

/**
 * Boli's faces (owner, 2026-11-24), committed as woff2 (OFL, from Fontsource) and loaded with next/font/local - never
 * next/font/google (a fonts.gstatic 404 failed a deploy once).
 *
 * - Inter (UI and body) is loaded under the variable name `--font-geist-sans` ON PURPOSE: the shared globals map
 *   Tailwind's `font-sans` and the heading face onto that variable, so every component in @repo/ui picks Inter up
 *   without a change in the shared package (the admin app keeps real Geist).
 * - Instrument Serif (display) is `--font-boli-serif`, exposed as the `font-serif` utility by app/boli.css. Use it for
 *   big public headings and hero numbers, not for dashboard chrome.
 * - Geist Mono stays the code face (`font-mono`).
 */
export const interSans = localFont({
    src: [{ path: "./fonts/InterLatin.woff2", weight: "100 900", style: "normal" }],
    variable: "--font-geist-sans",
    display: "swap",
})

export const instrumentSerif = localFont({
    src: [
        { path: "./fonts/InstrumentSerifLatin.woff2", weight: "400", style: "normal" },
        { path: "./fonts/InstrumentSerifLatinItalic.woff2", weight: "400", style: "italic" },
    ],
    variable: "--font-boli-serif",
    display: "swap",
})

export const geistMono = localFont({
    src: [{ path: "./fonts/GeistMonoLatin.woff2", weight: "100 900", style: "normal" }],
    variable: "--font-geist-mono",
    display: "swap",
})
