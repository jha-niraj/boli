import localFont from "next/font/local"

/**
 * Boli's faces, T1 (owner, 2026-11-24), committed as woff2 (OFL, from Fontsource) and loaded with next/font/local -
 * never next/font/google (a fonts.gstatic 404 failed a deploy once).
 *
 * - Instrument Sans (UI and body, variable weight) is loaded under the variable name `--font-geist-sans` ON PURPOSE:
 *   the shared globals map Tailwind's `font-sans` and the heading face onto that variable, so every component in
 *   @repo/ui picks it up without a change in the shared package (the admin app keeps real Geist). Latin only:
 *   next/font/local cannot give two files of one face a unicode-range, so a second (latin-ext) file would replace it.
 * - Fraunces (display) is `--font-boli-serif`, exposed as the `font-serif` utility by app/boli.css, which also turns the
 *   SOFT axis to 100 and WONK off. The "full" Fontsource cut carries opsz, wght, SOFT and WONK. Latin only (latin-ext
 *   is another 105 kB for a display face); no italic file - the one italic quote is synthesised.
 * - Geist Mono stays the code face (`font-mono`).
 */
export const instrumentSans = localFont({
    src: [
        { path: "./fonts/InstrumentSansLatin.woff2", weight: "400 700", style: "normal" },
    ],
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
