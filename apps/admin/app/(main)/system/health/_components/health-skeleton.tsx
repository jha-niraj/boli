import { HeartPulse } from "lucide-react"
import { TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const HEALTH_TITLE = "Health"
export const HEALTH_DESCRIPTION = "The database, logged errors and Jawaf's background jobs"

export function HealthSkeleton() {
    return (
        <PageSkeleton title={HEALTH_TITLE} description={HEALTH_DESCRIPTION} icon={<HeartPulse />} actions={1}>
            <StatBandSkeleton count={5} />
            <Skeleton className="h-5 w-48 rounded" />
            <TableSkeleton rows={6} cols={5} />
        </PageSkeleton>
    )
}
