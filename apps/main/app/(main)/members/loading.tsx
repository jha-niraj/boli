import { PageSkeleton } from "@repo/ui/components/ui/page"
import { MEMBERS_DESCRIPTION, MEMBERS_TITLE, MembersSkeleton } from "./_components/members-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={MEMBERS_TITLE} description={MEMBERS_DESCRIPTION} icon={false} width="reading" actions={1} primaryAction>
            <MembersSkeleton />
        </PageSkeleton>
    )
}
