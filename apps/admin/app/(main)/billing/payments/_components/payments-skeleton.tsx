import { CreditCard } from "lucide-react"
import { FilterBarSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"

export const PAYMENTS_TITLE = "Payments"
export const PAYMENTS_DESCRIPTION = "Every payment, its gateway and whether it was applied"

/** Header (one primary action), the toolbar (search + two filters) and the table. */
export function PaymentsSkeleton() {
    return (
        <PageSkeleton title={PAYMENTS_TITLE} description={PAYMENTS_DESCRIPTION} icon={<CreditCard />} actions={1} primaryAction>
            <FilterBarSkeleton filters={2} inCard={false} />
            <TableSkeleton rows={8} cols={6} withPagination />
        </PageSkeleton>
    )
}
