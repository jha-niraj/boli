import { KeyRound } from "lucide-react"
import { FilterBarSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"

export const CLAIMS_TITLE = "Claims"
export const CLAIMS_DESCRIPTION = "Claim links sent to businesses, opened and used"

/** The search + status row and the table. Shared by loading.tsx and the view. */
export function ClaimsSkeleton() {
    return (
        <PageSkeleton title={CLAIMS_TITLE} description={CLAIMS_DESCRIPTION} icon={<KeyRound />}>
            <FilterBarSkeleton filters={1} inCard={false} />
            <TableSkeleton rows={8} cols={8} />
        </PageSkeleton>
    )
}
