'use server'

// Kura's actions. Every export here is a public endpoint: each checks the session itself and filters by the signed-in
// person. Only async functions are exported (anything else empties the module at build).
import { z } from 'zod'
import { ok, fail, failWith, type ActionResult } from '@repo/errors'
import { db, and, eq } from '@repo/db'
import { aiConversations, aiMessages } from '@repo/db/schema'
import { getSession } from '@/lib/session'
import { listConversationsFor, loadConversationView, needsYouFor } from '@/lib/ai/conversations'
import { kuraSettingsSchema } from '@/lib/ai/settings'
import type { KuraSettings } from '@repo/boli'
import { KURA_DISLIKE_REASONS, type ConversationRow, type ConversationView, type KuraDislikeReason, type KuraRating, type NeedsYouList } from '@/lib/ai/types'

const idSchema = z.string().min(1).max(100)

export async function listConversations(): Promise<ActionResult<ConversationRow[]>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        return ok(await listConversationsFor(s.user.id))
    } catch (err) {
        return fail(err)
    }
}

export async function getConversation(id: string): Promise<ActionResult<ConversationView>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        const parsed = idSchema.safeParse(id)
        if (!parsed.success) return failWith('validation', 'That chat could not be found.')
        const view = await loadConversationView(s.user.id, parsed.data)
        return view ? ok(view) : failWith('notfound', 'That chat could not be found. It may have been deleted.')
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

/** Save a conversation's settings (system prompt, temperature, max tokens, top-p, top-k, think). */
export async function saveConversationSettings(id: string, settings: KuraSettings): Promise<ActionResult<null>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        if (!idSchema.safeParse(id).success) return failWith('validation', 'That chat could not be found.')
        const parsed = kuraSettingsSchema.safeParse(settings)
        if (!parsed.success) return failWith('validation', 'One of the settings is out of range.')
        // A blank system prompt is stored as typed; reading it back falls to the default (lib/ai/settings.ts).
        await db.update(aiConversations).set({ settings: parsed.data })
            .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, s.user.id)))
        return ok(null)
    } catch (err) {
        return fail(err)
    }
}

export async function getNeedsYou(): Promise<ActionResult<NeedsYouList>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        return ok(await needsYouFor({ id: s.user.id, emailVerified: s.user.emailVerified }))
    } catch (err) {
        return fail(err)
    }
}

const reasonKeys = KURA_DISLIKE_REASONS.map((r) => r.key) as [KuraDislikeReason, ...KuraDislikeReason[]]
const rateSchema = z.object({
    messageId: idSchema,
    rating: z.union([z.literal(1), z.literal(-1), z.null()]),
    reason: z.enum(reasonKeys).nullable(),
})

/**
 * Rate one of Kura's replies: 1 helpful, -1 not helpful (with an optional reason), null clears it. Only the person's
 * own assistant messages can be rated.
 */
export async function rateMessage(messageId: string, rating: KuraRating | null, reason: KuraDislikeReason | null): Promise<ActionResult<null>> {
    try {
        const s = await getSession()
        if (!s) return failWith('auth', 'Your session ended. Sign in again.')
        const parsed = rateSchema.safeParse({ messageId, rating, reason })
        if (!parsed.success) return failWith('validation', 'That rating could not be saved.')
        const d = parsed.data
        const rows = await db.update(aiMessages)
            .set({ rating: d.rating, ratingReason: d.rating === -1 ? d.reason : null, ratedAt: d.rating === null ? null : new Date() })
            .where(and(eq(aiMessages.id, d.messageId), eq(aiMessages.userId, s.user.id), eq(aiMessages.role, 'assistant')))
            .returning({ id: aiMessages.id })
        return rows.length ? ok(null) : failWith('notfound', 'That reply could not be found. Refresh the chat and try again.')
    } catch (err) {
        return fail(err)
    }
}
