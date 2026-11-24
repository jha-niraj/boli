'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KuraSettings } from '@repo/boli'
import { saveConversationSettings } from '@/actions/ai/kura.action'
import { useKuraChat } from '@/stores/kura-chat.store'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const SAVE_AFTER_MS = 600

/**
 * The current conversation's settings and one `update` for every control (the Settings tab and the Think pill). An
 * edit applies at once (the next message runs with it); on a saved chat it is also written to
 * `ai_conversation.settings` after a short pause. A new chat has no row yet - its settings go with the first message.
 * A pending save is sent at once when the chat changes, so an edit never lands on the wrong conversation.
 */
export function useKuraSettings() {
    const settings = useKuraChat((s) => s.settings)
    const conversationId = useKuraChat((s) => s.conversationId)
    const [state, setState] = useState<SaveState>('idle')
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pending = useRef<{ id: string; value: KuraSettings } | null>(null)

    const flush = useCallback(() => {
        if (timer.current) { clearTimeout(timer.current); timer.current = null }
        const p = pending.current
        pending.current = null
        if (!p) return
        setState('saving')
        saveConversationSettings(p.id, p.value)
            .then((res) => {
                if (useKuraChat.getState().conversationId === p.id) setState(res.success ? 'saved' : 'error')
            })
            .catch(() => {
                if (useKuraChat.getState().conversationId === p.id) setState('error')
            })
    }, [])

    const update = useCallback((patch: Partial<KuraSettings>) => {
        const st = useKuraChat.getState()
        st.setSettings(patch)
        const id = st.conversationId
        if (!id) return
        pending.current = { id, value: useKuraChat.getState().settings }
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(flush, SAVE_AFTER_MS)
    }, [flush])

    useEffect(() => {
        flush()
        setState('idle')
    }, [conversationId, flush])
    useEffect(() => flush, [flush])

    return { settings, update, state, saved: !!conversationId }
}
