import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ROUTES } from '@/lib/navigation'
import { listConversationsFor, loadConversationView, needsYouFor } from '@/lib/ai/conversations'
import { KuraPage } from '@/components/kura/kura-page'
import type { ConversationRow, NeedsYouList } from '@/lib/ai/types'

/**
 * Kura's server half, shared by /kura and /kura/[conversationId]. It awaits only the session and (for a chat URL) that
 * conversation; History and Needs you start here as promises and stream into the column (read with `use()`). A
 * conversation id that is not this person's (deleted, or another account on this browser) falls back to a new chat.
 */
export async function KuraRoute({ conversationId }: { conversationId: string | null }) {
    const s = await getSession()
    if (!s) redirect(ROUTES.signIn)
    const me = s.user

    // A failed read shows inline in the column (the client query retries), never an error page.
    const historyPromise = listConversationsFor(me.id).catch((): ConversationRow[] => [])
    const needsYouPromise = needsYouFor({ id: me.id, emailVerified: me.emailVerified })
        .catch((): NeedsYouList => ({ items: [], failed: ['this list'] }))
    const initialConversation = conversationId ? await loadConversationView(me.id, conversationId) : null

    return <KuraPage initialConversation={initialConversation} historyPromise={historyPromise} needsYouPromise={needsYouPromise} />
}
