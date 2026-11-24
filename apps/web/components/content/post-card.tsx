import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { entryHref, formatContentDate, type ContentEntry } from "@/lib/content"
import { Cover } from "./cover"
import { DraftBadge } from "./draft-badge"

/**
 * One post or guide in a grid: the cover, "date - category" (or the reading time for a guide), the title. The whole card
 * is one link. `headingLevel` keeps the page's outline right (h2 on an index, h3 under a "Read next" h2).
 */
export function PostCard({ entry, headingLevel = 2, className }: { entry: ContentEntry; headingLevel?: 2 | 3; className?: string }) {
    const H = headingLevel === 2 ? "h2" : "h3"
    const meta = entry.kind === "blog" ? `${formatContentDate(entry.date)} - ${entry.category ?? ""}` : `${entry.readingMinutes} min read`
    return (
        <AppLink href={entryHref(entry)} className={cn("group flex min-w-0 cursor-pointer flex-col gap-4", className)}>
            <Cover name={entry.cover} decorative className="transition-[border-color,box-shadow] duration-200 group-hover:border-boli-ink/20 group-hover:shadow-[0_12px_32px_-20px_rgba(20,20,20,0.3)]" />
            <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs text-boli-muted">
                    <span>{meta}</span>
                    <DraftBadge draft={entry.draft} />
                </p>
                <H className="mt-2 font-serif text-xl leading-snug text-boli-ink group-hover:underline group-hover:decoration-boli-line group-hover:underline-offset-4">{entry.title}</H>
                {entry.kind === "guides" ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-boli-text">{entry.summary}</p> : null}
            </div>
        </AppLink>
    )
}
