import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const RESULT_TITLE = "Payment"
export const RESULT_DESCRIPTION = "What happened to your payment."

/** The result card's shape: the status icon, a title and a sentence, the four detail rows (For, Amount, Started, Reference), the buttons. */
export function ResultCardSkeleton() {
    return (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-neutral-900">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-4 w-64 max-w-full rounded" />
            <div className="mt-2 w-full divide-y divide-neutral-100 dark:divide-neutral-800">
                {["w-28", "w-36", "w-32", "w-44"].map((w, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                        <Skeleton className="h-3.5 w-16 rounded" delay={i * 0.05} />
                        <Skeleton className={`h-3.5 ${w} rounded`} delay={i * 0.05} />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex gap-2"><Skeleton className="h-9 w-32 rounded-full" /></div>
        </div>
    )
}

export function CheckoutResultSkeleton() {
    return (
        <PageSkeleton title={RESULT_TITLE} description={RESULT_DESCRIPTION} icon={false} back body="page">
            <ResultCardSkeleton />
        </PageSkeleton>
    )
}
