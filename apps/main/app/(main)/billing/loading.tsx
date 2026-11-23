import { PageSkeleton } from "@repo/ui/components/ui/page"
import { BILLING_DESCRIPTION, BILLING_TABS, BILLING_TITLE, BillingSkeleton } from "./_components/billing-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={BILLING_TITLE} description={BILLING_DESCRIPTION} icon={false} tabs={BILLING_TABS.length} body="page">
            <BillingSkeleton />
        </PageSkeleton>
    )
}
