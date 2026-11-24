import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"
import { GetStartedSkeleton } from "./get-started"
import { LaunchersSkeleton } from "./launchers"

export const HOME_TITLE = "Home"
export const HOME_DESCRIPTION = "Your credits, usage and recent activity at a glance."

const CARD = "rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"

/** /home's body: launchers, Get started, the band, the chart beside recent activity, then the API pointer. Shared by loading.tsx. */
export function HomeSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <LaunchersSkeleton />
            <GetStartedSkeleton />
            <StatBandSkeleton count={4} />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                <div className={CARD}>
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="mt-1.5 h-3 w-48 rounded" />
                    <Skeleton className="mt-3 h-[220px] w-full rounded-xl" />
                </div>
                <div className={CARD}>
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="mt-1.5 h-3 w-44 rounded" />
                    <div className="mt-3 space-y-1">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" delay={i * 0.05} />)}
                    </div>
                </div>
            </div>
            <Skeleton className="h-[3.75rem] w-full rounded-2xl" />
        </div>
    )
}
