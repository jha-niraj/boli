import { Home } from "lucide-react"
import { ChartCardSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { SkyGlow } from "@/components/brand/sky-glow"

export const HOME_TITLE = "Home"
export const HOME_DESCRIPTION = "How Boli is doing, and what needs you"
export const HOME_CARD = "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

/** Home's loading state: the glow, the header, the band, Needs attention + Recent activity, then the two charts. */
export function HomeSkeleton() {
    return (
        <SkyGlow>
            <PageSkeleton title={HOME_TITLE} description={HOME_DESCRIPTION} icon={<Home />} body="page">
                <StatBandSkeleton count={5} />
                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {[0, 1].map((i) => (
                        <div key={i} className={HOME_CARD}>
                            <Skeleton className="h-[9px] w-full rounded-none" />
                            <div className="flex flex-col gap-3 p-4">
                                <Skeleton className="h-4 w-36 rounded" />
                                {Array.from({ length: 4 }, (_, j) => <Skeleton key={j} className="h-10 w-full rounded-lg" />)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    <ChartCardSkeleton height={220} />
                    <ChartCardSkeleton height={220} />
                </div>
            </PageSkeleton>
        </SkyGlow>
    )
}
