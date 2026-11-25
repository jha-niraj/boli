import type { Metadata } from "next"
import { getContactMessages, getFeedbackList, getInboxStats } from "@/actions/inbox.action"
import { requireAdminPage } from "@/lib/admin-session"
import { DEFAULT_INBOX_FILTERS } from "@/types/inbox"
import { InboxView } from "./_components/inbox-view"

export const metadata: Metadata = { title: "Inbox" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Inbox (task 3 of plan/admin/jawaf/admin-v1.md): the guard, then the first page of both tabs and the band read in
 * parallel on the server and handed to the view as initialData under the same query keys.
 */
export default async function InboxPage({ searchParams }: { searchParams: SearchParams }) {
    await requireAdminPage("communications")
    const sp = await searchParams
    const tab = sp.tab === "feedback" ? "feedback" : "messages"
    const [stats, messages, feedback] = await Promise.all([getInboxStats(), getContactMessages(DEFAULT_INBOX_FILTERS, 1), getFeedbackList(DEFAULT_INBOX_FILTERS, 1)])
    return (
        <InboxView
            initialTab={tab}
            initialStats={stats.success ? stats.data : undefined}
            initialMessages={messages.success ? messages.data : undefined}
            initialFeedback={feedback.success ? feedback.data : undefined}
        />
    )
}
