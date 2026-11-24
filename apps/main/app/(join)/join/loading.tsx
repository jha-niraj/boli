import { Skeleton } from "@repo/ui/components/ui/skeleton"

/** /join's shape in the split frame: the serif title and line, the invitation card, the buttons. */
export default function Loading() {
    return (
        <section role="status" aria-busy="true" className="space-y-6 py-2">
            <div className="space-y-2">
                <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
                <Skeleton className="h-4 w-64 max-w-full rounded" />
            </div>
            <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-4 w-36 rounded" />
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-40 rounded-full" />
                <Skeleton className="h-10 w-24 rounded-full" />
            </div>
        </section>
    )
}
