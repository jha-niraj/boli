import { create } from 'zustand'
import { KURA_DEFAULTS, type KuraSettings } from '@repo/boli'
import type { KuraErrorCode, KuraUsage } from '@/lib/ai/protocol'
import type { ChatViewMessage, ConversationView, KuraDislikeReason, KuraRating } from '@/lib/ai/types'

/**
 * Kura's chat state. Client only. The transcript, the composer, the Settings and Code tabs and History all read it.
 * `settings` are the current conversation's (a new chat starts from KURA_DEFAULTS); the Think pill is `settings.think`.
 */
export type ChatStatus = 'idle' | 'streaming'

/**
 * One line (or a designed state) above the composer. `credits` and `offline` draw their own panels; `plain` is a
 * sentence with an optional button.
 */
export interface ChatNote {
    kind: KuraErrorCode | 'plain'
    message: string
    action?: { label: string; href: string } | null
    /** The message that did not get an answer - Try again sends it once more. */
    retry?: string
}

interface KuraChatState {
    conversationId: string | null
    title: string
    messages: ChatViewMessage[]
    status: ChatStatus
    note: ChatNote | null
    loadingConversation: boolean
    settings: KuraSettings

    reset: () => void
    load: (view: ConversationView) => void
    setLoading: (on: boolean) => void
    setNote: (note: ChatNote | null) => void
    setStatus: (status: ChatStatus) => void
    setConversation: (id: string, title: string) => void
    setSettings: (patch: Partial<KuraSettings>) => void
    push: (...messages: ChatViewMessage[]) => void
    renameMessage: (from: string, to: string) => void
    removeMessage: (id: string) => void
    appendText: (messageId: string, text: string) => void
    /** Streamed thinking: kept as ONE `thought` part, first in the message. */
    appendThought: (messageId: string, text: string) => void
    thoughtEnd: (messageId: string, ms: number) => void
    addNotice: (messageId: string, text: string) => void
    setUsage: (messageId: string, usage: KuraUsage) => void
    setRating: (messageId: string, rating: KuraRating | null, reason: KuraDislikeReason | null) => void
    finish: (messageId: string) => void
}

function mapMessage(messages: ChatViewMessage[], id: string, fn: (m: ChatViewMessage) => ChatViewMessage): ChatViewMessage[] {
    return messages.map((m) => (m.id === id ? fn(m) : m))
}

export const useKuraChat = create<KuraChatState>((set) => ({
    conversationId: null,
    title: '',
    messages: [],
    status: 'idle',
    note: null,
    loadingConversation: false,
    settings: { ...KURA_DEFAULTS },

    reset: () => set({ conversationId: null, title: '', messages: [], status: 'idle', note: null, loadingConversation: false, settings: { ...KURA_DEFAULTS } }),
    load: (view) => set({ conversationId: view.id, title: view.title, messages: view.messages, settings: view.settings, status: 'idle', note: null, loadingConversation: false }),
    setLoading: (on) => set({ loadingConversation: on }),
    setNote: (note) => set({ note }),
    setStatus: (status) => set({ status }),
    setConversation: (id, title) => set({ conversationId: id, title }),
    setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    push: (...messages) => set((s) => ({ messages: [...s.messages, ...messages] })),
    renameMessage: (from, to) => set((s) => ({ messages: mapMessage(s.messages, from, (m) => ({ ...m, id: to })) })),
    removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
    appendText: (messageId, text) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => {
            const parts = [...m.parts]
            const last = parts[parts.length - 1]
            if (last?.type === 'text') parts[parts.length - 1] = { type: 'text', text: last.text + text }
            else parts.push({ type: 'text', text })
            return { ...m, parts }
        }),
    })),
    appendThought: (messageId, text) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => {
            const first = m.parts[0]
            const parts = first?.type === 'thought'
                ? [{ ...first, text: first.text + text }, ...m.parts.slice(1)]
                : [{ type: 'thought' as const, text, ms: 0 }, ...m.parts]
            return { ...m, parts, thinking: true }
        }),
    })),
    thoughtEnd: (messageId, ms) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => {
            const first = m.parts[0]
            if (first?.type !== 'thought') return { ...m, thinking: false }
            return { ...m, thinking: false, parts: [{ ...first, ms: (first.ms ?? 0) + ms }, ...m.parts.slice(1)] }
        }),
    })),
    addNotice: (messageId, text) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => ({ ...m, parts: [...m.parts, { type: 'notice', text }] })),
    })),
    setUsage: (messageId, usage) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => ({ ...m, parts: [...m.parts.filter((p) => p.type !== 'usage'), { type: 'usage', usage }] })),
    })),
    setRating: (messageId, rating, reason) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => ({ ...m, rating, ratingReason: reason })),
    })),
    finish: (messageId) => set((s) => ({
        messages: mapMessage(s.messages, messageId, (m) => ({ ...m, pending: false, thinking: false })),
    })),
}))
