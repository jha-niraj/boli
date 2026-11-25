import { Coins } from "lucide-react"
import { TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"

export const CREDITS_TITLE = "Credits"
export const CREDITS_DESCRIPTION = "Every credit grant, who gave it and why"

export function CreditsSkeleton() {
    return (
        <PageSkeleton title={CREDITS_TITLE} description={CREDITS_DESCRIPTION} icon={<Coins />} actions={1} primaryAction>
            <TableSkeleton rows={8} cols={5} withPagination />
        </PageSkeleton>
    )
}
