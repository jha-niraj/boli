import type { ReactNode } from "react"
import { DocsNav } from "./_components/docs-nav"
import { GetKeyCard } from "./_components/prose"

/** Docs: page list on the left (a sheet on phones, rendered by each page), the page in the middle. */
export default function DocsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14">
            <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-6">
                    <div>
                        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-boli-muted">Documentation</p>
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
