import type { ReactNode } from "react"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"

/**
 * A table in its card, the same as apps/main (Keys, Usage): a bordered white card, the rows' lines running edge to
 * edge (no inner padding round the table; the first and last cells carry the 16px instead), a ceiling on the height
 * so it scrolls inside, and a sideways scroll on a phone. Pair with `<Table scroller="parent">` + `<TableHeader sticky>`
 * and `pin="end"` on the row-action column.
 *
 * `minWidth` is a Tailwind class (`min-w-[46rem]`) - a literal, so Tailwind sees it.
 */
export const TABLE_CARD = "min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
export const TABLE_EDGES = "[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4"

export function TableCard({ minWidth, maxHeight = "max-h-[44rem]", className, children }: {
    minWidth: string
    /** The viewport's ceiling (about 10 rows by default). */
    maxHeight?: string
    className?: string
    children: ReactNode
}) {
    return (
        <section className={cn(TABLE_CARD, className)}>
            <ScrollArea orientation="both" className="min-w-0" viewportClassName={maxHeight}>
                <div className={cn(minWidth, TABLE_EDGES)}>{children}</div>
            </ScrollArea>
        </section>
    )
}
