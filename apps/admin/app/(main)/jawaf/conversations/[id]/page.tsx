import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isAppError } from "@repo/errors"
import { requireAdminPage } from "@/lib/admin-session"
import { conversationTranscript } from "@/lib/jawaf"
import { jawafIdSchema } from "@/schemas/jawaf"
import { ConversationView, PrivateConversation } from "./_components/conversation-view"

export const metadata: Metadata = { title: "Conversation" }

type Params = Promise<{ id: string }>

/**
 * One visitor conversation of a DEMO bot (plan/admin/jawaf/admin-v1.md): the transcript with sources, script and
 * ratings, the visitor's contact card, channel, times, back to the prospect. A customer bot's conversation is never
 * shown - the 403 screen says so.
 */
export default async function ConversationPage({ params }: { params: Params }) {
    await requireAdminPage("jawaf")
    const { id } = await params
    const parsed = jawafIdSchema.safeParse(id)
    if (!parsed.success) notFound()
    let t
    try {
        t = await conversationTranscript(parsed.data)
    } catch (err) {
        if (isAppError(err) && err.kind === "notfound") notFound()
        throw err
    }
    if (!t) return <PrivateConversation />
    return <ConversationView t={t} />
}
