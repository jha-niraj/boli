import { cn } from "@repo/ui/lib/utils"

/**
 * "Key takeaways": the piece in 3-5 lines, at the top of the article (frontmatter `takeaways`). A neutral card; the
 * words carry it. The short, self-contained lines are also what answer engines lift as a summary.
 */
export function KeyTakeaways({ items, className }: { items: readonly string[]; className?: string }) {
    if (!items.length) return null
    return (
        <aside aria-labelledby="key-takeaways" className={cn("rounded-2xl border border-boli-line bg-white p-6 sm:p-7", className)}>
            <h2 id="key-takeaways" className="text-sm font-[450] text-boli-sky-ink">
                Key takeaways
            </h2>
            <ul className="mt-4 space-y-3">
                {items.map((t) => (
                    <li key={t} className="flex gap-3 text-[15px] leading-7 text-boli-text">
                        <span aria-hidden className="mt-[11px] size-1.5 shrink-0 rounded-full bg-boli-sky" />
                        <span className="min-w-0">{t}</span>
                    </li>
                ))}
            </ul>
        </aside>
    )
}
