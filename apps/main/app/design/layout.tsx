import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
/*
 * T1, the chosen faces, imported here so they load on /design only (fontsource woff2 files, bundled locally - never
 * next/font/google). Fraunces "full" carries the SOFT and WONK axes.
 */
import "@fontsource-variable/fraunces/full.css"
import "@fontsource-variable/instrument-sans/index.css"
import "./_art/art.css"

export const metadata: Metadata = {
    title: "Design",
    robots: { index: false, follow: false },
}

/**
 * /design - the owner's brand review (plan/main/design/design-pass-v1.md, task B). Development only: in any other
 * build it is a 404. Its own light frame, outside the (main) and (public) groups. Delete the folder once the brand is
 * chosen.
 */
export default function DesignLayout({ children }: { children: ReactNode }) {
    if (process.env.NODE_ENV !== "development") notFound()
    return <div className="min-h-dvh bg-boli-ground font-sans text-boli-ink antialiased">{children}</div>
}
