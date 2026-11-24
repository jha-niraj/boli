import { PageSkeleton } from "@repo/ui/components/ui/page"
import { API_HOME_DESCRIPTION, API_HOME_TITLE, ApiHomeSkeleton } from "./_components/api-home-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={API_HOME_TITLE} description={API_HOME_DESCRIPTION} icon={false} actions={2} primaryAction body="page">
            <ApiHomeSkeleton />
        </PageSkeleton>
    )
}
