import { PageSkeleton } from "@repo/ui/components/ui/page"
import { ResultCardSkeleton } from "@/components/platform/payment-result-skeleton"

export const RESULT_TITLE = "Payment"
export const RESULT_DESCRIPTION = "What happened to your payment."

export function CheckoutResultSkeleton() {
    return (
        <PageSkeleton title={RESULT_TITLE} description={RESULT_DESCRIPTION} icon={false} back body="page">
            <ResultCardSkeleton />
        </PageSkeleton>
    )
}
