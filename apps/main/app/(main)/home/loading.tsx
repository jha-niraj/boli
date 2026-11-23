import { PageSkeleton } from "@repo/ui/components/ui/page"
import { HOME_DESCRIPTION, HOME_TITLE, HomeSkeleton } from "./_components/home-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={HOME_TITLE} description={HOME_DESCRIPTION} icon={false} body="page">
            <HomeSkeleton />
        </PageSkeleton>
    )
}
