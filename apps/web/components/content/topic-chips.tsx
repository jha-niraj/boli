import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { topicsInUse, TOPICS, type TopicId } from "@/lib/content"
import { ROUTES } from "@/lib/routes"

/** Small links to a piece's topic hubs. Only topics that have a page (topicsInUse) are links; none = nothing. */
export function TopicChips({ topics, className }: { topics: readonly TopicId[]; className?: string }) {
    const live = new Set(topicsInUse().map((t) => t.id))
    const shown = topics.filter((t) => live.has(t))
    if (!shown.length) return null
    return (
        <ul aria-label="Topics" className={cn("flex flex-wrap gap-2", className)}>
            {shown.map((t) => (
                <li key={t}>
                    <AppLink
                        href={ROUTES.blogTopic(t)}
                        className="inline-flex cursor-pointer items-center rounded-full border border-boli-line bg-white px-3 py-1 text-xs font-[450] text-boli-text transition-colors hover:border-boli-ink/20 hover:text-boli-ink"
                    >
                        {TOPICS[t].title}
                    </AppLink>
                </li>
            ))}
        </ul>
    )
}
