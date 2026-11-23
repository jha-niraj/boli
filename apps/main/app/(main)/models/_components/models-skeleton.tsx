import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const MODELS_TITLE = "Models"
export const MODELS_DESCRIPTION = "Open models you can chat with in Kura and call through the API."

/** /models' body: one model card (head, facts grid, prices, buttons). Shared by loading.tsx. */
export function ModelsSkeleton() {
    return (
        <div className="grid min-w-0 gap-3 pb-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1">
                        <Skeleton className="h-5 w-32 rounded" />
                        <Skeleton className="mt-1.5 h-3 w-40 rounded" />
                    </div>
                </div>
                <Skeleton className="mt-4 h-3 w-full rounded" />
                <Skeleton className="mt-1.5 h-3 w-3/4 rounded" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" delay={i * 0.05} />)}
                </div>
                <Skeleton className="mt-4 h-16 w-full rounded-xl" />
                <div className="mt-4 flex gap-2">
                    <Skeleton className="h-9 w-32 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-full" />
                </div>
            </div>
        </div>
    )
}
