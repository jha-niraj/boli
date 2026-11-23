import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const KEYS_TITLE = "API keys"
export const KEYS_DESCRIPTION = "Keys for calling the Boli API from your own code. Each key is shown once."

/** /keys' body: the how-to strip, then the keys table (heading row + rows). Shared by loading.tsx. */
export function KeysSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-4 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    {["w-24", "w-32", "w-20", "w-20", "w-16"].map((w, i) => <Skeleton key={i} className={`h-3 ${w} rounded`} />)}
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3.5 last:border-0 dark:border-neutral-800/60">
                        <Skeleton className="h-4 w-28 rounded" delay={i * 0.05} />
                        <Skeleton className="h-6 w-40 rounded-full" delay={i * 0.05} />
                        <Skeleton className="h-4 w-20 rounded" delay={i * 0.05} />
                        <Skeleton className="h-4 w-20 rounded" delay={i * 0.05} />
                        <Skeleton className="ml-auto h-8 w-20 rounded-full" delay={i * 0.05} />
                    </div>
                ))}
            </div>
        </div>
    )
}
