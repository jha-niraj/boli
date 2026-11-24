import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { cn } from "@repo/ui/lib/utils"

/**
 * The result card's shape (`PaymentResultCard`): the status icon, a title and a sentence, the four detail rows (For,
 * Amount, Started, Reference), the buttons. `framed` on the full page, flat in the billing sheet.
 */
export function ResultCardSkeleton({ framed = true }: { framed?: boolean }) {
    return (
        <div className={cn(
            "flex w-full min-w-0 flex-col items-center gap-3",
            framed && "mx-auto max-w-lg rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-neutral-900",
        )}>
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-4 w-64 max-w-full rounded" />
            <div className="mt-2 w-full divide-y divide-neutral-100 dark:divide-neutral-800">
                {["w-28", "w-36", "w-32", "w-44"].map((w, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                        <Skeleton className="h-3.5 w-16 rounded" delay={i * 0.05} />
                        <Skeleton className={`h-3.5 ${w} max-w-[60%] rounded`} delay={i * 0.05} />
                    </div>
                ))}
            </div>
            {framed ? <div className="mt-2 flex gap-2"><Skeleton className="h-9 w-32 rounded-full" /></div> : null}
        </div>
    )
}
