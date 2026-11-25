import { MessagesSquare } from "lucide-react"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"

export const CONVERSATION_TITLE = "Conversation"

/** Back link + title, the transcript column and the side card (contact, details). Shared by loading.tsx. */
export function ConversationSkeleton() {
    return (
        <PageSkeleton title={CONVERSATION_TITLE} back icon={<MessagesSquare />}>
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="flex min-w-0 flex-col gap-3">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className={i % 2 ? "h-24 w-[85%] rounded-2xl" : "ml-auto h-10 w-2/3 rounded-2xl"} />
                    ))}
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                    <Skeleton className="h-44 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
            </div>
        </PageSkeleton>
    )
}
