import 'server-only'
import { db, and, eq, asc, desc, isNull, count } from '@repo/db'
import { aiConversations, aiMessages, apiKey } from '@repo/db/schema'
import { BOLI_CHAT, MICRO_PER_CREDIT, formatCredits } from '@/lib/boli'
import { ROUTES } from '@/lib/navigation'
import { getBalanceMicro } from '@/lib/platform/credits'
import { asParts } from './parts'
import { asKuraSettings } from './settings'
import type { ChatViewMessage, ConversationRow, ConversationView, NeedsYouItem, NeedsYouList } from './types'

/**
 * Server reads for Kura. Every read filters by the signed-in person's id - a conversation id from the URL is never
 * trusted on its own. Called from the route's server half and from actions/ai (which check the session).
 */

export async function listConversationsFor(userId: string): Promise<ConversationRow[]> {
    const rows = await db
        .select({ id: aiConversations.id, title: aiConversations.title, updatedAt: aiConversations.updatedAt })
        .from(aiConversations)
        .where(eq(aiConversations.userId, userId))
        .orderBy(desc(aiConversations.updatedAt))
        .limit(100)
    return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt.toISOString() }))
}

export type MessageRow = typeof aiMessages.$inferSelect

export async function conversationRows(userId: string, conversationId: string): Promise<{ title: string; settings: unknown; rows: MessageRow[] } | null> {
    const [conv, rows] = await db.batch([
        db.select({ title: aiConversations.title, settings: aiConversations.settings }).from(aiConversations)
            .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId))).limit(1),
        db.select().from(aiMessages)
            .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.userId, userId)))
            .orderBy(asc(aiMessages.createdAt)),
    ])
    const c = conv[0]
    return c ? { title: c.title, settings: c.settings, rows } : null
}

export function toView(rows: MessageRow[]): ChatViewMessage[] {
    return rows.map((r) => r.role === 'user'
        ? { id: r.id, role: 'user', text: r.display ?? r.content, parts: [] }
        : { id: r.id, role: 'assistant', text: '', parts: asParts(r.parts) })
}

export async function loadConversationView(userId: string, conversationId: string): Promise<ConversationView | null> {
    const found = await conversationRows(userId, conversationId)
    return found
        ? { id: conversationId, title: found.title, messages: toView(found.rows), settings: asKuraSettings(found.settings) }
        : null
}

/** A new chat's title: the first message, one line, cut at 60 characters. No model call. */
export function titleFrom(text: string): string {
    const one = text.replace(/\s+/g, ' ').trim()
    return one.length > 60 ? `${one.slice(0, 57).trimEnd()}...` : one || 'New chat'
}

export type HistoryMessage = { role: 'user' | 'assistant'; content: string }

/** A rough token count (about 3 characters per token for English and Romanized Nepali on Gemma's tokenizer). */
const estimateTokens = (text: string) => Math.ceil(text.length / 3)

/**
 * The model history: user text and assistant reply text (thinking is never replayed). Kept inside the model's context
 * window: the oldest turns drop first, so system prompt + history + the new message + the reply budget fit.
 */
export function buildHistory(rows: MessageRow[], budget: { systemPrompt: string; message: string; maxTokens: number }): HistoryMessage[] {
    const all: HistoryMessage[] = []
    for (const r of rows) {
        if (r.role === 'user') all.push({ role: 'user', content: r.content })
        else if (r.content.trim()) all.push({ role: 'assistant', content: r.content })
    }
    let room = BOLI_CHAT.contextTokens - budget.maxTokens - estimateTokens(budget.systemPrompt) - estimateTokens(budget.message) - 64
    const kept: HistoryMessage[] = []
    for (let i = all.length - 1; i >= 0 && room > 0; i--) {
        const m = all[i]!
        const cost = estimateTokens(m.content) + 4
        if (cost > room) break
        room -= cost
        kept.unshift(m)
    }
    // Start on a user turn, and never put two user turns side by side (a failed turn stored no reply).
    while (kept[0] && kept[0].role !== 'user') kept.shift()
    return kept.filter((m, i) => !(m.role === 'user' && kept[i + 1]?.role === 'user'))
}

// ─── Needs you (cheap reads, no model call) ───────────────────────────────────

/** Below this many credits the list says they are running low. */
const LOW_BALANCE_MICRO = 10 * MICRO_PER_CREDIT

/**
 * What a Boli person should act on. Each source has its own try/catch, so one failure marks the list partial instead
 * of hiding it.
 */
export async function needsYouFor(viewer: { id: string; emailVerified: boolean }): Promise<NeedsYouList> {
    const items: NeedsYouItem[] = []
    const failed: string[] = []

    if (!viewer.emailVerified) {
        items.push({
            id: 'verify-email',
            group: 'now',
            title: 'Verify your email',
            detail: 'Open the link we sent you - your free credits arrive when it is verified.',
            href: ROUTES.profile,
            action: 'Open profile',
        })
    }

    const [balance, keys] = await Promise.allSettled([
        getBalanceMicro(viewer.id),
        db.select({ n: count() }).from(apiKey).where(and(eq(apiKey.userId, viewer.id), isNull(apiKey.revokedAt))),
    ])

    if (balance.status === 'fulfilled') {
        const micro = balance.value
        if (micro <= 0) {
            items.push({ id: 'credits-out', group: 'now', title: 'You are out of credits', detail: 'Kura and the API stop until you add credits.', href: `${ROUTES.billing}?tab=plans`, action: 'Add credits' })
        } else if (micro < LOW_BALANCE_MICRO) {
            items.push({ id: 'credits-low', group: 'today', title: 'Credits running low', detail: `${formatCredits(micro)} credits left.`, href: `${ROUTES.billing}?tab=plans`, action: 'Add credits' })
        }
    } else {
        console.error('[kura] needs-you: balance failed', balance.reason instanceof Error ? balance.reason.message : balance.reason)
        failed.push('your credit balance')
    }

    if (keys.status === 'fulfilled') {
        if ((keys.value[0]?.n ?? 0) === 0) {
            items.push({ id: 'first-key', group: 'later', title: 'Create your first API key', detail: 'Call boli-chat from your own code with the same model.', href: ROUTES.keys, action: 'API keys' })
        }
    } else {
        console.error('[kura] needs-you: api keys failed', keys.reason instanceof Error ? keys.reason.message : keys.reason)
        failed.push('your API keys')
    }

    return { items, failed }
}
