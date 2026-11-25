import { Presentation } from "lucide-react"
import { FilterBarSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const DEMOS_TITLE = "Demos"
export const DEMOS_DESCRIPTION = "Demo bots built for prospects, and where each one stands"

/** Header (one primary action), the six-cell stage band, the search row and the table. Shared by loading.tsx and the view. */
export function DemosSkeleton() {
    return (
        <PageSkeleton title={DEMOS_TITLE} description={DEMOS_DESCRIPTION} icon={<Presentation />} actions={1} primaryAction>
            <StatBandSkeleton count={6} />
            <FilterBarSkeleton filters={0} inCard={false} />
            <TableSkeleton rows={8} cols={8} />
        </PageSkeleton>
    )
}
