import { PageSkeleton } from "@repo/ui/components/ui/page"
import { KEYS_DESCRIPTION, KEYS_TITLE, KeysSkeleton } from "./_components/keys-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={KEYS_TITLE} description={KEYS_DESCRIPTION} icon={false} actions={1} primaryAction>
            <KeysSkeleton />
        </PageSkeleton>
    )
}
