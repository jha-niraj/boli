import { Skeleton } from "@repo/ui/components/ui/skeleton"

/** /claim's shape while it loads: the title and line, the bot card, the button (the frame paints with the page). */
export default function Loading() {
    return (
        <main role="status" aria-busy="true" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center space-y-6 bg-background px-4 py-10">
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
            <Skeleton className="h-10 w-56 rounded-full" />
        </main>
    )
}
