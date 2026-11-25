import { Inbox } from "lucide-react"
import { FilterBarSkeleton, TableSkeleton } from "@repo/ui/components/skeleton-kit"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

export const INBOX_TITLE = "Inbox"
export const INBOX_DESCRIPTION = "Contact messages, Jawaf pilot requests and app feedback"

/**
 * The Inbox's loading state, shared by loading.tsx and the view's loading branch: header with two tabs, the four-cell
 * band, the toolbar (search + three filters) and the table. Change the header here and in the view in the same edit.
 */
export function InboxSkeleton() {
    return (
        <PageSkeleton title={INBOX_TITLE} description={INBOX_DESCRIPTION} icon={<Inbox />} tabs={2}>
            <StatBandSkeleton count={4} />
            <FilterBarSkeleton filters={3} inCard={false} />
            <TableSkeleton rows={8} cols={6} withPagination />
        </PageSkeleton>
    )
}
