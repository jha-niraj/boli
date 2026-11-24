import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { JAWAF_CARD } from "@/components/jawaf/keys"
import { JAWAF_PAGES } from "./_components/jawaf-pages"

/** Jawaf Home's loading state: the real title, the setup banner's shape (band, headline, bar, five rows), the note card. */
export default function Loading() {
    const copy = JAWAF_PAGES.home
    return (
        <PageSkeleton title={copy.title} description={copy.description} icon={false} body="page">
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <div className={`${JAWAF_CARD} overflow-hidden`}>
                    <Skeleton className="h-[9px] w-full rounded-none" />
                    <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
                        <div className="flex flex-col gap-3">
                            <Skeleton className="h-3 w-28 rounded" />
                            <Skeleton className="h-7 w-72 max-w-full rounded" />
                            <Skeleton className="h-3.5 w-96 max-w-full rounded" />
                            <Skeleton className="h-1.5 w-full max-w-md rounded-full" />
                            <Skeleton className="h-8 w-36 rounded-full" />
                        </div>
                        <Skeleton className="hidden aspect-[96/60] w-56 rounded-xl sm:block" />
                    </div>
                    <div className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                        {Array.from({ length: 5 }, (_, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                                <Skeleton className="size-7 rounded-full" />
                                <div className="flex flex-1 flex-col gap-1.5">
                                    <Skeleton className="h-3.5 w-40 rounded" />
                                    <Skeleton className="h-3 w-56 max-w-full rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`${JAWAF_CARD} flex items-start gap-3 p-4`}>
                    <Skeleton className="size-9 rounded-xl" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-4 w-40 rounded" />
                        <Skeleton className="h-3 w-80 max-w-full rounded" />
                    </div>
                </div>
            </div>
        </PageSkeleton>
    )
}
