import { Skeleton } from "@repo/ui/components/ui/skeleton"

/** The welcome step's shape, flat in the split frame: the progress bar, a serif title and line, a field, chips, the footer. */
export default function Loading() {
    return (
        <section role="status" aria-busy="true">
            <div className="flex gap-1.5">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-1 flex-1 rounded-full" />)}
            </div>
            <Skeleton className="mt-2.5 h-3 w-20 rounded" />
            <div className="min-h-[22rem] space-y-6 py-7">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
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
            <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
            </div>
        </section>
    )
}
