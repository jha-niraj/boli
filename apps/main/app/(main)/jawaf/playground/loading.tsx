import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { JAWAF_CARD } from "@/components/jawaf/keys"
import { JAWAF_PAGES } from "../_components/jawaf-pages"

/** Playground's loading state: the real title, New chat, the chat column with its composer, the Needs fixing column. */
export default function Loading() {
    const copy = JAWAF_PAGES.playground
    return (
        <PageSkeleton title={copy.title} description={copy.description} icon={false} actions={1} width="full" body="fill">
            <div className="grid min-h-0 min-w-0 flex-1 gap-3 pb-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className={`${JAWAF_CARD} flex min-h-0 flex-col overflow-hidden`}>
                    <div className="flex flex-1 flex-col items-center gap-3 py-16">
                        <Skeleton className="h-4 w-64 rounded" />
                        <Skeleton className="h-3 w-80 max-w-full rounded" />
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8 w-40 rounded-full" />)}
                        </div>
                    </div>
                    <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
                        <Skeleton className="mx-auto h-12 w-full max-w-3xl rounded-3xl" />
                    </div>
                </div>
                <div className={`${JAWAF_CARD} hidden flex-col overflow-hidden lg:flex`}>
                    <div className="flex flex-col gap-1.5 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-52 rounded" />
                    </div>
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="flex flex-col gap-1.5 border-b border-neutral-200 px-4 py-3 last:border-0 dark:border-neutral-800">
                            <Skeleton className="h-3.5 w-full rounded" />
                            <Skeleton className="h-3 w-32 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </PageSkeleton>
    )
}
