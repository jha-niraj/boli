import { Skeleton } from "@repo/ui/components/ui/skeleton"

const CARD = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

/**
 * The Profile tab's shape (the default tab; loading.tsx is not given `?tab=`): the identity card (photo, name, email
 * with its badge, joined and sign-in methods, the photo button on the right), then Details (heading and line, Name,
 * Email, Bio with its counter, Save changes in the footer).
 */
export function ProfileSkeleton() {
    return (
        <div className="flex w-full flex-col gap-3">
            <div className={`${CARD} p-5 sm:p-6`}>
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                    <Skeleton className="size-20 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                        <Skeleton className="h-6 w-40 rounded" />
                        <div className="mt-1.5 flex items-center gap-2">
                            <Skeleton className="h-4 w-48 max-w-full rounded" />
                            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                            <Skeleton className="h-3 w-28 rounded" />
                            <Skeleton className="h-3 w-48 rounded" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-32 shrink-0 rounded-full" />
                </div>
            </div>
            <div className={CARD}>
                <div className="p-4 sm:p-5">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="mt-1.5 h-3 w-56 max-w-full rounded" />
                    <div className="mt-4 space-y-4">
                        <div className="space-y-1.5"><Skeleton className="h-4 w-12 rounded" /><Skeleton className="h-9 w-full rounded-full" /></div>
                        <div className="space-y-1.5"><Skeleton className="h-4 w-12 rounded" /><Skeleton className="h-9 w-full rounded-full" /></div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-8 rounded" />
                            <Skeleton className="h-20 w-full rounded-3xl" />
                            <Skeleton className="ml-auto h-3 w-12 rounded" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end border-t border-neutral-200 px-4 py-3 sm:px-5 dark:border-neutral-800">
                    <Skeleton className="h-8 w-32 rounded-full" />
                </div>
            </div>
        </div>
    )
}
