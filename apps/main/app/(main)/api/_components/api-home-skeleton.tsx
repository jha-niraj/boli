import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const API_HOME_TITLE = "API"
export const API_HOME_DESCRIPTION = "Call Boli's open model from your own code - OpenAI compatible."

const CARD = "rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"

/** /api's body: the band, then Start building (quickstart beside the coding-agent prompt). Shared by loading.tsx. */
export function ApiHomeSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <StatBandSkeleton count={4} />
            <div className={CARD}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <Skeleton className="h-4 w-44 rounded" />
                        <Skeleton className="mt-1.5 h-3 w-64 max-w-full rounded" />
                    </div>
                </div>
                <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
                    <Skeleton className="h-[24.75rem] w-full rounded-2xl" />
                    <Skeleton className="h-[24.75rem] w-full rounded-2xl" />
                </div>
            </div>
        </div>
    )
}
