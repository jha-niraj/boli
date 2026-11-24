import { ChevronRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"

/** "Blog / Research" above a title. The last crumb is the current section, still a link (the title is the page). */
export function Breadcrumb({ items }: { items: readonly { name: string; href: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-boli-muted">
                {items.map((it, i) => (
                    <li key={it.href} className="flex min-w-0 items-center gap-1.5">
                        {i > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-boli-muted/70" aria-hidden /> : null}
                        <AppLink href={it.href} className="cursor-pointer truncate transition-colors hover:text-boli-ink">
                            {it.name}
                        </AppLink>
                    </li>
                ))}
            </ol>
        </nav>
    )
}
