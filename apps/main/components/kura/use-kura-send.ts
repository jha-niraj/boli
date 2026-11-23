'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { readFrameStream, type KuraErrorCode, type KuraFrame } from '@/lib/ai/protocol'
import type { ChatRequestBody } from '@/lib/ai/types'
import { ROUTES } from '@/lib/navigation'
import { getConversation } from '@/actions/ai/kura.action'
import { useKuraChat } from '@/stores/kura-chat.store'
import { BALANCE_QUERY_KEY } from '@/components/shell/credits-chip'
import { KURA_HISTORY_KEY, KURA_NEEDS_YOU_KEY } from './query-keys'

/** Write the conversation into the URL without a navigation (router.replace would re-render the route under the chat). */
function setUrl(conversationId: string | null) {
    const path = conversationId ? ROUTES.kuraConversation(conversationId) : ROUTES.kura
    if (window.location.pathname === path) return
    const url = new URL(window.location.href)
    url.pathname = path
    window.history.replaceState(window.history.state, '', url.toString())
}

const ERROR_KINDS = new Set<KuraErrorCode>(['offline', 'credits', 'rate', 'invalid', 'unknown'])
const asErrorKind = (code: unknown): KuraErrorCode | 'plain' =>
    typeof code === 'string' && ERROR_KINDS.has(code as KuraErrorCode) ? (code as KuraErrorCode) : 'plain'

/**
 * THE one send path for Kura (typed messages and suggestion chips). Token frames are coalesced to one store update
 * per animation frame. The turn runs with the store's current settings (the Think pill included).
 */
export function useKuraSend() {
    const queryClient = useQueryClient()
    const abortRef = useRef<AbortController | null>(null)
    const pending = useRef<{ messageId: string; text: string } | null>(null)
    const raf = useRef<number | null>(null)

    const flush = useCallback(() => {
        raf.current = null
        const p = pending.current
        if (p && p.text) {
            useKuraChat.getState().appendText(p.messageId, p.text)
            p.text = ''
        }
    }, [])

    useEffect(() => () => {
        if (raf.current !== null) cancelAnimationFrame(raf.current)
        abortRef.current?.abort()
    }, [])

    const openConversation = useCallback(async (id: string) => {
        const st = useKuraChat.getState()
        if (st.status === 'streaming') abortRef.current?.abort()
        st.setLoading(true)
        const res = await getConversation(id)
        if (res.success) {
            useKuraChat.getState().load(res.data)
            setUrl(res.data.id)
        } else {
            useKuraChat.getState().reset()
            useKuraChat.getState().setNote({ kind: 'plain', message: res.error ?? 'That chat could not be opened.' })
            setUrl(null)
        }
    }, [])

    const newChat = useCallback(() => {
        abortRef.current?.abort()
        useKuraChat.getState().reset()
        setUrl(null)
    }, [])

    const stop = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    // Annotated: `send` calls itself once (a gone chat is retried fresh), so its type cannot be inferred.
    const send: (content: string, retried?: boolean) => Promise<boolean> = useCallback(async (content: string, retried = false): Promise<boolean> => {
        const store = useKuraChat.getState()
        // Guard here, not by disabling the textarea: focus must stay in the composer while a reply streams.
        if (store.status === 'streaming' || !content.trim()) return false
        const tempUser = `local-u-${crypto.randomUUID()}`
        const tempAssistant = `local-a-${crypto.randomUUID()}`
        store.setNote(null)
        store.setStatus('streaming')
        store.push(
            { id: tempUser, role: 'user', text: content, parts: [] },
            { id: tempAssistant, role: 'assistant', text: '', parts: [], pending: true },
        )
        let userId = tempUser
        let assistantId = tempAssistant
        const wasNew = !store.conversationId
        const sentSettings = store.settings
        const controller = new AbortController()
        abortRef.current = controller

        const onFrame = (frame: KuraFrame) => {
            const s = useKuraChat.getState()
            if (frame.t === 'text') {
                if (!pending.current || pending.current.messageId !== assistantId) pending.current = { messageId: assistantId, text: '' }
                pending.current.text += frame.d
                if (raf.current === null) raf.current = requestAnimationFrame(flush)
                return
            }
            flush()
            switch (frame.t) {
                case 'meta':
                    s.renameMessage(tempUser, frame.userMessageId)
                    s.renameMessage(tempAssistant, frame.assistantMessageId)
                    userId = frame.userMessageId
                    assistantId = frame.assistantMessageId
                    if (s.conversationId !== frame.conversationId) {
                        s.setConversation(frame.conversationId, frame.title)
                        setUrl(frame.conversationId)
                    }
                    break
                case 'reasoning': s.appendThought(assistantId, frame.d); break
                case 'reasoning-end': s.thoughtEnd(assistantId, frame.ms); break
                case 'notice': s.addNotice(assistantId, frame.text); break
                case 'usage': s.setUsage(assistantId, frame.usage); break
                case 'error':
                    // No answer at all: the server took the question back (and removed a chat this turn created), so
                    // the page does too - Try again sends it once more.
                    s.removeMessage(userId)
                    s.removeMessage(assistantId)
                    if (wasNew) { s.reset(); s.setSettings(sentSettings); setUrl(null) }
                    s.setNote({
                        kind: frame.code,
                        message: frame.message,
                        action: frame.code === 'credits' ? { label: 'Add credits', href: ROUTES.billing } : null,
                        retry: content,
                    })
                    break
                case 'done': break
            }
        }

        try {
            const payload: ChatRequestBody = { conversationId: store.conversationId, message: content, settings: store.settings }
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            })
            if (!res.ok || !res.body) {
                const err: unknown = await res.json().catch(() => null)
                const obj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {}
                const message = typeof obj.message === 'string' ? obj.message : 'That message could not be sent. Try again.'
                const s = useKuraChat.getState()
                s.removeMessage(tempUser)
                s.removeMessage(tempAssistant)
                s.setStatus('idle')
                if (res.status === 401) { window.location.assign(`${ROUTES.signIn}?stale=1`); return false }
                if (res.status === 404 && !retried) {
                    // The chat is gone (deleted, or another account on this browser): start fresh and send once more.
                    const kept = s.settings
                    s.reset()
                    s.setSettings(kept)
                    setUrl(null)
                    return send(content, true)
                }
                // Out of credits: the sentence plus a button to where it is fixed - never "Connection failed".
                const action = res.status === 402 && typeof obj.href === 'string' && obj.href.startsWith('/')
                    ? { href: obj.href, label: typeof obj.actionLabel === 'string' ? obj.actionLabel : 'Add credits' }
                    : null
                s.setNote({ kind: asErrorKind(obj.code), message, action, retry: content })
                return false
            }
            await readFrameStream(res.body, onFrame)
            return true
        } catch {
            if (!controller.signal.aborted) {
                useKuraChat.getState().setNote({ kind: 'plain', message: 'Could not reach the server. Check the connection and try again.' })
            }
            return false
        } finally {
            flush()
            const s = useKuraChat.getState()
            const msg = s.messages.find((m) => m.id === assistantId)
            if (msg && !msg.parts.length && !controller.signal.aborted) s.removeMessage(assistantId)
            s.finish(assistantId)
            s.setStatus('idle')
            if (abortRef.current === controller) abortRef.current = null
            queryClient.invalidateQueries({ queryKey: KURA_HISTORY_KEY })
            queryClient.invalidateQueries({ queryKey: KURA_NEEDS_YOU_KEY })
            queryClient.invalidateQueries({ queryKey: BALANCE_QUERY_KEY })
        }
    }, [flush, queryClient])

    return { send, stop, newChat, openConversation }
}
