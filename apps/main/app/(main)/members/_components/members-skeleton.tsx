import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const MEMBERS_TITLE = "Members"
export const MEMBERS_DESCRIPTION = "Who can use this workspace, and which products each person can open."

/** One divider row: avatar, name + email, access line, role pill. */
function RowSkeleton({ i }: { i: number }) {
    return (
        <div className="flex h-16 items-center gap-3 px-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" delay={i * 0.05} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-36 rounded" delay={i * 0.05} />
                <Skeleton className="h-3 w-52 rounded" delay={i * 0.05} />
            </div>
            <Skeleton className="hidden h-3 w-32 rounded sm:block" delay={i * 0.05} />
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" delay={i * 0.05} />
        </div>
    )
}

/**
 * /members' body (shared by loading.tsx and the client): the workspace name row, then the members card (divider rows)
 * and the pending invitations card.
 */
export function MembersSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-4 w-48 rounded" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
                <Skeleton className="h-4 w-20 rounded" />
                <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                    {Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} i={i} />)}
                </div>
            </div>
        </div>
    )
}
