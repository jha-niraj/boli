import localFont from "next/font/local"

/**
 * Boli's faces, the same files and setup as apps/main (`apps/main/app/fonts.ts`), committed as woff2 and loaded with
 * next/font/local - never next/font/google (a fonts.gstatic 404 failed a deploy once).
 *
 * - Instrument Sans (UI and body) is loaded under `--font-geist-sans` ON PURPOSE: the shared globals map Tailwind's
 *   `font-sans` onto that variable, so every @repo/ui component picks it up without a change in the shared package.
 * - Fraunces (display) is `--font-boli-serif`, exposed as `font-serif` by app/boli.css (SOFT 100, WONK off).
 * - Geist Mono stays the code face (`font-mono`).
 */
export const instrumentSans = localFont({
    src: [{ path: "./fonts/InstrumentSansLatin.woff2", weight: "400 700", style: "normal" }],
    variable: "--font-geist-sans",
    display: "swap",
})

export const fraunces = localFont({
    src: [{ path: "./fonts/FrauncesLatin.woff2", weight: "100 900", style: "normal" }],
    variable: "--font-boli-serif",
    display: "swap",
})

export const geistMono = localFont({
    src: [{ path: "./fonts/GeistMonoLatin.woff2", weight: "100 900", style: "normal" }],
    variable: "--font-geist-mono",
    display: "swap",
})
