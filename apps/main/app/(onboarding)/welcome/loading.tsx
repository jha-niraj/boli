import { Skeleton } from "@repo/ui/components/ui/skeleton"

/** The welcome card's shape: the progress bar, a serif title and line, the name field, a row of chips, the footer. */
export default function Loading() {
    return (
        <section role="status" aria-busy="true" className="rounded-3xl border border-boli-line bg-card dark:border-neutral-800">
            <div className="px-6 pt-6 sm:px-8 sm:pt-7">
                <div className="flex gap-1.5">
                    {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-1 flex-1 rounded-full" />)}
                </div>
                <Skeleton className="mt-2.5 h-3 w-20 rounded" />
            </div>
            <div className="min-h-[22rem] space-y-6 px-6 py-6 sm:px-8">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
                    <Skeleton className="h-4 w-80 max-w-full rounded" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-10 w-full rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-boli-line px-6 py-4 sm:px-8 dark:border-neutral-800">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
            </div>
        </section>
    )
}
