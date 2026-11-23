import type { ReactNode } from "react"
import { SiteFooter } from "./site-footer"
import { SiteNav } from "./site-nav"

/**
 * The public frame shared by the landing, About, Docs and the legal pages: sticky nav, the page, the footer. Light
 * first: it sets the warm ground and ink itself, so a visitor in dark mode still reads the public pages as designed.
 */
export function PublicShell({ children, top }: { children: ReactNode; top?: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-boli-ground text-boli-ink">
            {top}
            <SiteNav />
            <main id="content" className="flex-1">
                {children}
            </main>
            <SiteFooter />
        </div>
    )
}
