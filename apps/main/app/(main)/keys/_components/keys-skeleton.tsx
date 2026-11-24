import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const KEYS_TITLE = "API keys"
export const KEYS_DESCRIPTION = "Keys for calling the Boli API from your own code. Each key is shown once."

/**
 * /keys' body: the how-to strip, then the keys table - its header row (Name, Key, Created, Last used, Status, actions)
 * and 64px rows (key tile + name, the masked key pill, two dates, status, copy + Revoke pinned at the end). Shared by
 * loading.tsx.
 */
export function KeysSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                <Skeleton className="h-4 w-full max-w-xl rounded" />
                <Skeleton className="h-4 w-24 shrink-0 rounded" />
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex h-10 items-center gap-6 border-b border-neutral-200 px-4 dark:border-neutral-800">
                    {["w-12", "w-8", "w-14", "w-16", "w-12"].map((w, i) => <Skeleton key={i} className={`h-3 ${w} rounded`} />)}
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex h-16 items-center gap-6 border-b border-neutral-100 px-4 last:border-0 dark:border-neutral-800/60">
                        <div className="flex w-40 shrink-0 items-center gap-2.5">
                            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" delay={i * 0.05} />
                            <Skeleton className="h-4 w-24 rounded" delay={i * 0.05} />
                        </div>
                        <Skeleton className="h-6 w-36 shrink-0 rounded-full" delay={i * 0.05} />
                        <Skeleton className="hidden h-4 w-20 rounded sm:block" delay={i * 0.05} />
                        <Skeleton className="hidden h-4 w-20 rounded md:block" delay={i * 0.05} />
                        <Skeleton className="hidden h-4 w-12 rounded md:block" delay={i * 0.05} />
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                            <Skeleton className="h-9 w-9 rounded-full" delay={i * 0.05} />
                            <Skeleton className="h-8 w-20 rounded-full" delay={i * 0.05} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
