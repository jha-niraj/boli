import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const USAGE_TITLE = "Usage"
export const USAGE_DESCRIPTION = "Requests, tokens and credits from Kura and the API. Days are Nepal days."

function TableBlock({ rows, title }: { rows: number; title: string }) {
    return (
        <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="px-4 pb-2 pt-4">
                <Skeleton className={`h-4 ${title} rounded`} />
                <Skeleton className="mt-1.5 h-3 w-56 max-w-full rounded" />
            </div>
            <div className="px-4 pb-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="mt-1 h-10 w-full rounded-lg" delay={i * 0.04} />)}
            </div>
        </div>
    )
}

/** /usage's body: the filter row, the band, the daily chart, the per-key table, the request log and its pager. */
export function UsageSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-48 rounded-full" />
                <Skeleton className="h-9 w-40 rounded-full" />
            </div>
            <StatBandSkeleton count={4} />
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="mt-1.5 h-3 w-28 rounded" />
                <Skeleton className="mt-3 h-[220px] w-full rounded-xl" />
            </div>
            <TableBlock rows={3} title="w-32" />
            <TableBlock rows={8} title="w-28" />
            <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
    )
}
