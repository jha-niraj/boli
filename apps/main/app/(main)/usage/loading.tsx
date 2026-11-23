import { PageSkeleton } from "@repo/ui/components/ui/page"
import { USAGE_DESCRIPTION, USAGE_TITLE, UsageSkeleton } from "./_components/usage-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={USAGE_TITLE} description={USAGE_DESCRIPTION} icon={false} body="page">
            <UsageSkeleton />
        </PageSkeleton>
    )
}
