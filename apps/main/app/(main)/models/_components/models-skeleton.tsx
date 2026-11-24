import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { MODELS } from "@repo/boli"

export const MODELS_TITLE = "Models"
export const MODELS_DESCRIPTION = "Open models you can chat with in Kura and call through the API."

/**
 * /models' body: one card per model - the Dhaka hem, icon + id + label with the badges on the right, the blurb, the
 * languages list, the four facts, the price box (two figures and a note), Try in Kura and API docs. Shared by
 * loading.tsx (the catalogue is static, so the count and the list lengths are the real ones).
 */
export function ModelsSkeleton() {
    return (
        <div className="grid min-w-0 gap-3 pb-6 lg:grid-cols-2">
            {MODELS.map((m) => (
                <div key={m.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <Skeleton className="h-[9px] w-full rounded-none" />
                    <div className="p-5">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                            <div className="min-w-0 flex-1">
                                <Skeleton className="h-5 w-32 rounded" />
                                <Skeleton className="mt-1.5 h-3 w-40 rounded" />
                            </div>
                            <div className="hidden shrink-0 gap-1.5 sm:flex">
                                <Skeleton className="h-5 w-12 rounded-full" />
                                <Skeleton className="h-5 w-10 rounded-full" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                            </div>
                        </div>
                        <Skeleton className="mt-4 h-3.5 w-full rounded" />
                        <Skeleton className="mt-1.5 h-3.5 w-3/4 rounded" />
                        <div className="mt-3 flex flex-col gap-2">
                            {m.languages.map((l, i) => <Skeleton key={l} className="h-3.5 w-44 rounded" delay={i * 0.04} />)}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[3.25rem] rounded-xl" delay={i * 0.05} />)}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                            {[0, 1].map((i) => (
                                <div key={i}>
                                    <Skeleton className="h-3 w-28 rounded" />
                                    <Skeleton className="mt-2 h-7 w-20 rounded-lg" />
                                </div>
                            ))}
                            <Skeleton className="col-span-2 h-3 w-64 max-w-full rounded" />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Skeleton className="h-8 w-32 rounded-full" />
                            <Skeleton className="h-8 w-28 rounded-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
