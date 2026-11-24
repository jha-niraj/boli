import type { ReactNode } from "react"
import { RevealObserver } from "./reveal-observer"
import { SiteFooter } from "./site-footer"
import { SiteNav } from "./site-nav"

/**
 * The public frame shared by the landing, About, Docs and the legal pages: sticky nav, the page, the F5 footer. Light
 * only: it sets the warm ground and ink itself, so a visitor in dark mode still reads the public pages as designed.
 * The pixel-art motion classes come from components/art/art.css, imported once by app/layout.tsx; the text entrance
 * motion (`data-reveal`) is RevealObserver's.
 */
export function PublicShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-boli-ground font-sans text-boli-ink">
            <SiteNav />
            <main id="content" className="flex-1">
                {children}
            </main>
            <SiteFooter />
            <RevealObserver />
        </div>
    )
}
