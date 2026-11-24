import type { ReactNode } from "react"
import { DocsNav } from "./_components/docs-nav"
import { DOCS_LABEL, GetKeyCard } from "./_components/prose"

/** Docs: page list on the left (a sheet on phones, rendered by each page), the page in the middle. */
export default function DocsLayout({ children }: { children: ReactNode }) {
    return (
        // 40px under the nav on a desktop (the sticky columns hold the same 40px: 64px nav + 40 = 6.5rem), so the page
        // list, the page and "On this page" all start on one line.
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:pb-20 lg:pt-10">
            <aside className="hidden lg:block">
                <div className="sticky top-[6.5rem] space-y-6">
                    <div>
                        <p className={`px-3 ${DOCS_LABEL}`}>Documentation</p>
                        <nav aria-label="Docs" className="mt-3">
                            <DocsNav />
                        </nav>
                    </div>
                    <GetKeyCard compact />
                </div>
            </aside>
            <div className="min-w-0">{children}</div>
        </div>
    )
}
