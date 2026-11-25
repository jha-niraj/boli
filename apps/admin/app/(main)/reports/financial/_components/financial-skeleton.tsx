import { Wallet } from "lucide-react"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"
import { ChartCardSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"

export const FINANCIAL_TITLE = "Financial report"
export const FINANCIAL_DESCRIPTION = "Rupees received, credits sold, granted and spent, in Nepal days"

/** The five-cell band, the credits-spent chart and the payment events table. */
export function FinancialSkeleton() {
    return (
        <PageSkeleton title={FINANCIAL_TITLE} icon={<Wallet />} description={FINANCIAL_DESCRIPTION} body="page">
            <StatBandSkeleton count={5} />
            <ChartCardSkeleton height={220} />
            <TableSkeleton rows={5} cols={5} />
        </PageSkeleton>
    )
}
