import { PageSkeleton } from "@repo/ui/components/ui/page"
import { MODELS_DESCRIPTION, MODELS_TITLE, ModelsSkeleton } from "./_components/models-skeleton"

export default function Loading() {
    return (
        <PageSkeleton title={MODELS_TITLE} description={MODELS_DESCRIPTION} icon={false}>
            <ModelsSkeleton />
        </PageSkeleton>
    )
}
