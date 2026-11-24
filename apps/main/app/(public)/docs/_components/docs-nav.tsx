"use client"

import { usePathname } from "next/navigation"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { DOCS_PAGES, ROUTES } from "@/lib/navigation"

/** The docs page list, with the current page marked. Used in the sidebar and in the phone sheet. */
export function DocsNav({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    return (
        <ul className="space-y-0.5">
            {DOCS_PAGES.map((p) => {
                const href = ROUTES.doc(p.slug)
                const active = pathname === href
                return (
                    <li key={p.slug}>
                        <AppLink
                            href={href}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "relative block cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors",
                                active ? "bg-white font-medium text-boli-ink ring-1 ring-boli-line" : "text-boli-text hover:bg-boli-sand hover:text-boli-ink",
                            )}
                        >
                            {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-boli-ink" /> : null}
                            {p.title}
                        </AppLink>
                    </li>
                )
            })}
        </ul>
    )
}
