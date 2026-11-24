import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ROUTES } from '@/lib/navigation'
import { canUseProduct } from '@repo/boli/workspace-access'
import { getCurrentWorkspaceFor } from '@/lib/workspace'
import { loadConversationView, needsYouFor } from '@/lib/ai/conversations'
import { KuraPage } from '@/components/kura/kura-page'
import type { NeedsYouList } from '@/lib/ai/types'

/**
 * Kura's server half, shared by /kura and /kura/[conversationId]. It awaits only the session and (for a chat URL) that
 * conversation; Needs you starts here as a promise and streams into the column (read with `use()`). The chat history
 * is the product sidebar's (the (main) layout starts that promise; components/kura/kura-sidebar.tsx). A
 * conversation id that is not this person's (deleted, or another account on this browser) falls back to a new chat.
 */
export async function KuraRoute({ conversationId }: { conversationId: string | null }) {
    const s = await getSession()
    if (!s) redirect(ROUTES.signIn)
    const me = s.user
    // Chats live in the CURRENT workspace; a member without Kura access is sent to the no-access screen.
    const ws = await getCurrentWorkspaceFor(me.id)
    if (!canUseProduct(ws, 'kura')) redirect(ROUTES.accessDenied)

    // A failed read shows inline in the column (the client query retries), never an error page.
    const needsYouPromise = needsYouFor({ id: me.id, emailVerified: me.emailVerified }, ws.id)
        .catch((): NeedsYouList => ({ items: [], failed: ['this list'] }))
    const initialConversation = conversationId ? await loadConversationView(me.id, ws.id, conversationId) : null

    return <KuraPage initialConversation={initialConversation} needsYouPromise={needsYouPromise} />
}
