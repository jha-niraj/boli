import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const BILLING_TITLE = "Billing"
export const BILLING_DESCRIPTION = "Your credits, packs and payments. Pay as you go in rupees."
/** Credits | Plans | History, on the right of the header (`?tab=`); the plain URL is Credits. */
export const BILLING_TABS = [
    { value: "credits", label: "Credits" },
    { value: "plans", label: "Plans" },
    { value: "history", label: "History" },
] as const
export type BillingTab = (typeof BILLING_TABS)[number]["value"]

const CARD = "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"

/** The two top cards (balance, pay as you go) and a table - the Credits tab, the default. Shared by loading.tsx. */
export function BillingSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <div className={CARD}>
                    <Skeleton className="h-10 w-36 rounded" />
                    <Skeleton className="mt-2 h-3 w-20 rounded" />
                    <Skeleton className="mt-5 h-9 w-32 rounded-full" />
                </div>
                <div className={CARD}>
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="mt-3 h-3 w-64 max-w-full rounded" />
                    <Skeleton className="mt-1.5 h-3 w-52 max-w-full rounded" />
                    <Skeleton className="mt-5 h-9 w-32 rounded-full" />
                </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="mt-3 h-8 w-full rounded-lg" />
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mt-1 h-10 w-full rounded-lg" delay={i * 0.04} />)}
            </div>
        </div>
    )
}

/** The Plans tab while it loads: four pack cards with their band, then the custom amount and Enterprise. */
export function PlansSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-3 pb-6">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <Skeleton className="h-[9px] w-full rounded-none" delay={i * 0.04} />
                        <div className="p-4">
                            <Skeleton className="h-3 w-16 rounded" />
                            <Skeleton className="mt-3 h-8 w-28 rounded" />
                            <Skeleton className="mt-3 h-3.5 w-32 rounded" />
                            <Skeleton className="mt-2 h-3 w-40 rounded" />
                            <Skeleton className="mt-4 h-8 w-full rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-[1.4fr_1fr]">
                <div className={CARD}>
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="mt-2 h-3 w-56 max-w-full rounded" />
                    <Skeleton className="mt-4 h-10 w-full rounded-full" />
                    <Skeleton className="mt-4 h-8 w-64 max-w-full rounded-full" />
                </div>
                <div className={CARD}>
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="mt-3 h-3 w-full rounded" />
                    <Skeleton className="mt-1.5 h-3 w-3/4 rounded" />
                    <Skeleton className="mt-4 h-8 w-28 rounded-full" />
                </div>
            </div>
        </div>
    )
}
