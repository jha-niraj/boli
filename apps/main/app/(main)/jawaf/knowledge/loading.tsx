import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { JAWAF_CARD } from "@/components/jawaf/keys"
import { JAWAF_PAGES } from "../_components/jawaf-pages"

/** Knowledge's loading state: the real title, five tabs, two actions, then the Facts tab's grid of section cards. */
export default function Loading() {
    const copy = JAWAF_PAGES.knowledge
    return (
        <PageSkeleton title={copy.title} description={copy.description} icon={false} tabs={5} actions={2} primaryAction>
            <div className="flex min-w-0 flex-col gap-3 pb-6">
                <Skeleton className="h-3 w-96 max-w-full rounded" />
                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className={`${JAWAF_CARD} flex flex-col gap-3 p-4`}>
                            <div className="flex items-center justify-between gap-2">
                                <Skeleton className="h-4 w-32 rounded" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-3.5 w-full rounded" />
                            <Skeleton className="h-3.5 w-4/5 rounded" />
                            <Skeleton className="h-3.5 w-3/5 rounded" />
                            <div className="flex gap-2 pt-1">
                                <Skeleton className="h-9 w-20 rounded-full" />
                                <Skeleton className="h-9 w-20 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageSkeleton>
    )
}
