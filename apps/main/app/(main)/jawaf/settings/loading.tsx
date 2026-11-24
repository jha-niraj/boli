import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { JAWAF_CARD } from "@/components/jawaf/keys"
import { JAWAF_PAGES } from "../_components/jawaf-pages"

/** Settings' loading state: the real title, four tabs, the reading column with the Bot tab's three section cards. */
export default function Loading() {
    const copy = JAWAF_PAGES.settings
    return (
        <PageSkeleton title={copy.title} description={copy.description} icon={false} tabs={4} width="reading">
            <div className="flex min-w-0 flex-col gap-4 pb-8">
                {[3, 3, 2].map((rows, i) => (
                    <div key={i} className={`${JAWAF_CARD} flex flex-col gap-4 p-4 sm:p-5`}>
                        <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-36 rounded" />
                            <Skeleton className="h-3 w-72 max-w-full rounded" />
                        </div>
                        {Array.from({ length: rows }, (_, j) => (
                            <div key={j} className="flex flex-col gap-1.5">
                                <Skeleton className="h-3.5 w-24 rounded" />
                                <Skeleton className="h-9 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </PageSkeleton>
    )
}
