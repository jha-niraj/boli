import { FileBarChart } from "lucide-react"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"
import { ChartCardSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"

export function ActivitySkeleton() {
    return (
        <PageSkeleton title="Admin activity" icon={<FileBarChart />} description="Who did what in the console, in Nepal days" body="page">
            <StatBandSkeleton count={4} />
            <div className="grid gap-3 lg:grid-cols-2">
                <ChartCardSkeleton height={176} />
                <ChartCardSkeleton height={176} />
            </div>
            <TableSkeleton rows={5} cols={6} withAvatar />
        </PageSkeleton>
    )
}
