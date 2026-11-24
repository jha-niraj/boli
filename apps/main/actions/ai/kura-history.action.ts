'use server'

// Kura's HISTORY actions: list, rename, delete. Split from ./kura.action.ts because the shell's Kura sidebar (in the
// (main) layout tree) imports them, and a 'use server' file registers EVERY export on every route whose tree imports
// it - so the layout pulls in only these three. Each checks the session itself and filters by the signed-in person (a
// chat is its person's own; rename and delete match on the user id, as before workspaces).
import { z } from 'zod'
import { ok, fail, failWith, type ActionResult } from '@repo/errors'
import { db, and, eq } from '@repo/db'
import { aiConversations } from '@repo/db/schema'
import { getSession } from '@/lib/session'
import { listConversationsFor } from '@/lib/ai/conversations'
import { getCurrentWorkspaceFor } from '@/lib/workspace'
import { canUseProduct } from '@repo/boli/workspace-access'
import type { ConversationRow } from '@/lib/ai/types'

const idSchema = z.string().min(1).max(100)

export async function listConversations(): Promise<ActionResult<ConversationRow[]>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        // The person's chats in the CURRENT workspace; none when they have no Kura access there.
        const ws = await getCurrentWorkspaceFor(s.user.id)
        if (!canUseProduct(ws, 'kura')) return ok([])
        return ok(await listConversationsFor(s.user.id, ws.id))
    } catch (err) {
        return fail(err)
    }
}

export async function renameConversation(id: string, title: string): Promise<ActionResult<null>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        const t = title.trim().slice(0, 120)
        if (!idSchema.safeParse(id).success || !t) return failWith('validation', 'Give the chat a name.')
        await db.update(aiConversations).set({ title: t })
            .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, s.user.id)))
        return ok(null)
    } catch (err) {
        return fail(err)
    }
}

export async function deleteConversation(id: string): Promise<ActionResult<null>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        if (!idSchema.safeParse(id).success) return failWith('validation', 'That chat could not be found.')
        await db.delete(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, s.user.id)))
        return ok(null)
    } catch (err) {
        return fail(err)
    }
}
