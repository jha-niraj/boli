import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { FlowStepsSkeleton } from "@repo/ui/components/ui/flow-steps"
import { JAWAF_PAGES } from "../_components/jawaf-pages"

/** Setup's loading state: the real title, the five-step strip, the form on the left and the preview on the right. */
export default function Loading() {
    const copy = JAWAF_PAGES.setup
    return (
        <PageSkeleton title={copy.title} icon={false} actions={1}>
            <div className="flex w-full min-w-0 flex-col gap-6 pb-10 pt-2">
                <FlowStepsSkeleton count={5} size="sm" />
                <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-9 w-80 max-w-full rounded" />
                            <Skeleton className="h-3.5 w-96 max-w-full rounded" />
                        </div>
                        <div className="flex flex-wrap gap-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}</div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Skeleton className="h-9 rounded-full" />
                            <Skeleton className="h-9 rounded-full" />
                        </div>
                        <Skeleton className="h-9 rounded-full" />
                        <Skeleton className="h-9 rounded-full" />
                        <Skeleton className="h-9 w-28 rounded-full" />
                    </div>
                    <Skeleton className="h-[30rem] rounded-2xl" />
                </div>
            </div>
        </PageSkeleton>
    )
}
