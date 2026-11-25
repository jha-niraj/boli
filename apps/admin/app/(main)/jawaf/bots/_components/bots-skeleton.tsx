import { Bot } from "lucide-react"
import { FilterBarSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const BOTS_TITLE = "All bots"
export const BOTS_DESCRIPTION = "Every Jawaf bot - numbers only for customer bots"

/** The four-cell band, the search + filter row and the table. Shared by loading.tsx and the view. */
export function BotsSkeleton() {
    return (
        <PageSkeleton title={BOTS_TITLE} description={BOTS_DESCRIPTION} icon={<Bot />}>
            <StatBandSkeleton count={4} />
            <FilterBarSkeleton filters={1} inCard={false} />
            <TableSkeleton rows={8} cols={8} />
        </PageSkeleton>
    )
}
