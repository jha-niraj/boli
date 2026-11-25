import { BarChart3 } from "lucide-react"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"
import { ChartCardSkeleton } from "@repo/ui/components/skeleton-kit"

export const ANALYTICS_TITLE = "Sign-ups"
export const ANALYTICS_DESCRIPTION = "Who joined and when, in Nepal days"

export function AnalyticsSkeleton() {
    return (
        <PageSkeleton title={ANALYTICS_TITLE} icon={<BarChart3 />} description={ANALYTICS_DESCRIPTION} body="page">
            <StatBandSkeleton count={5} />
            <ChartCardSkeleton height={220} />
        </PageSkeleton>
    )
}
