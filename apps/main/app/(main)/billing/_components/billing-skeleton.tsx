import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const BILLING_TITLE = "Billing"
export const BILLING_DESCRIPTION = "Your credits, purchases and spending. Pay as you go in rupees."
export const BILLING_TABS = [
    { value: "history", label: "History" },
    { value: "payments", label: "Payments" },
] as const
export type BillingTab = (typeof BILLING_TABS)[number]["value"]

const CARD = "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"

/** /billing's body: the two cards (plan, balance) and the history table. Shared by loading.tsx. */
export function BillingSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-4 pb-6">
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <div className={CARD}>
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="mt-3 h-3 w-64 max-w-full rounded" />
                    <Skeleton className="mt-1.5 h-3 w-52 max-w-full rounded" />
                    <Skeleton className="mt-5 h-9 w-32 rounded-full" />
                </div>
                <div className={CARD}>
                    <Skeleton className="h-10 w-36 rounded" />
                    <Skeleton className="mt-2 h-3 w-20 rounded" />
                    <Skeleton className="mt-5 h-9 w-32 rounded-full" />
                </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Skeleton className="h-8 w-full rounded-lg" />
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mt-1 h-10 w-full rounded-lg" delay={i * 0.04} />)}
            </div>
        </div>
    )
}
