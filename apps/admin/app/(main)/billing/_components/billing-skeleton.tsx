import { CircleDollarSign } from "lucide-react"
import { TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const BILLING_TITLE = "Billing"
export const BILLING_DESCRIPTION = "Rupees received and credits sold this month, by pack and by workspace, in Nepal time"

/** Header (one primary action), the four-cell band, then two sections: credit packs sold and top buying workspaces. */
export function BillingSkeleton() {
    return (
        <PageSkeleton title={BILLING_TITLE} description={BILLING_DESCRIPTION} icon={<CircleDollarSign />} actions={1} primaryAction>
            <StatBandSkeleton count={4} />
            <Skeleton className="h-5 w-40 rounded" />
            <TableSkeleton rows={5} cols={6} />
            <Skeleton className="h-5 w-48 rounded" />
            <TableSkeleton rows={6} cols={6} />
        </PageSkeleton>
    )
}
