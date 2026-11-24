"use client"

import * as React from "react"
import type { JawafAnswer, JawafFrame } from "@/types/jawaf"

export interface PlaygroundMsg {
    id: string
    role: "user" | "assistant"
    text: string
    pending?: boolean
    /** The engine's final result (replaces the streamed draft). */
    answer?: JawafAnswer
    /** A transport or server error, said in a sentence. */
    error?: string
    /** For an assistant message: the question it answers (Fix this answer, Try as visitor). */
    question?: string
}

const FRAMES = new Set(["meta", "text", "final", "error", "done"])

/** Read the NDJSON JawafFrame stream (same line protocol as Kura's lib/ai/protocol.ts readFrameStream). */
async function readFrames(body: ReadableStream<Uint8Array>, onFrame: (f: JawafFrame) => void) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    const line = (raw: string) => {
        const t = raw.trim()
        if (!t) return
        try {
            const v: unknown = JSON.parse(t)
            if (v && typeof v === "object" && "t" in v && typeof v.t === "string" && FRAMES.has(v.t)) onFrame(v as JawafFrame)
        } catch { /* a broken line is skipped */ }
    }
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl = buffer.indexOf("\n")
        while (nl !== -1) {
            line(buffer.slice(0, nl))
            buffer = buffer.slice(nl + 1)
            nl = buffer.indexOf("\n")
        }
    }
    line(buffer + decoder.decode())
}

/**
 * The playground chat: POST /api/jawaf/ask (channel playground, free), streamed. Draft text frames are coalesced to
 * one state update per animation frame (as Kura does); the `final` frame REPLACES the draft, because the guards may
 * drop sentences or citations. One conversation until New chat.
 */
export function usePlayground(botId: string, opts: { onAnswered?: (answer: JawafAnswer) => void } = {}) {
    const [messages, setMessages] = React.useState<PlaygroundMsg[]>([])
    const [streaming, setStreaming] = React.useState(false)
    const conversationId = React.useRef<string | null>(null)
    const abortRef = React.useRef<AbortController | null>(null)
    const answeredRef = React.useRef(opts.onAnswered)
    React.useEffect(() => { answeredRef.current = opts.onAnswered })
    React.useEffect(() => () => abortRef.current?.abort(), [])

    const patch = React.useCallback((id: string, fn: (m: PlaygroundMsg) => PlaygroundMsg) => {
        setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)))
    }, [])

    const send = React.useCallback(async (raw: string): Promise<boolean> => {
        const text = raw.trim()
        if (!text || abortRef.current) return false
        const userId = `u-${crypto.randomUUID()}`
        let assistantId = `a-${crypto.randomUUID()}`
        setMessages((prev) => [...prev, { id: userId, role: "user", text }, { id: assistantId, role: "assistant", text: "", pending: true, question: text }])
        setStreaming(true)
        const controller = new AbortController()
        abortRef.current = controller

        let pendingText = ""
        let raf: number | null = null
        const flush = () => {
            raf = null
            if (!pendingText) return
            const d = pendingText
            pendingText = ""
            patch(assistantId, (m) => ({ ...m, text: m.text + d }))
        }

        try {
            const res = await fetch("/api/jawaf/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ botId, conversationId: conversationId.current, message: text, channel: "playground" }),
                signal: controller.signal,
            })
            if (res.status === 401) { window.location.assign("/signin?stale=1"); return false }
            if (!res.ok || !res.body) {
                const body: unknown = await res.json().catch(() => null)
                const msg = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "That question could not be sent. Try again."
                patch(assistantId, (m) => ({ ...m, pending: false, error: msg }))
                return false
            }
            await readFrames(res.body, (f) => {
                if (f.t === "text") {
                    pendingText += f.d
                    if (raf === null) raf = requestAnimationFrame(flush)
                    return
                }
                if (raf !== null) { cancelAnimationFrame(raf); raf = null }
                flush()
                if (f.t === "meta") {
                    conversationId.current = f.conversationId
                    const next = f.messageId
                    const prevId = assistantId
                    assistantId = next
                    patch(prevId, (m) => ({ ...m, id: next }))
                } else if (f.t === "final") {
                    conversationId.current = f.answer.conversationId ?? conversationId.current
                    patch(assistantId, (m) => ({ ...m, pending: false, text: f.answer.text, answer: f.answer }))
                    answeredRef.current?.(f.answer)
                } else if (f.t === "error") {
                    patch(assistantId, (m) => ({ ...m, pending: false, error: f.message }))
                }
            })
            return true
        } catch {
            if (!controller.signal.aborted) patch(assistantId, (m) => ({ ...m, pending: false, error: "Could not reach the server. Check the connection and try again." }))
            return false
        } finally {
            if (raf !== null) cancelAnimationFrame(raf)
            flush()
            patch(assistantId, (m) => (m.pending ? { ...m, pending: false, error: m.text ? undefined : "Stopped." } : m))
            abortRef.current = null
            setStreaming(false)
        }
    }, [botId, patch])

    const stop = React.useCallback(() => abortRef.current?.abort(), [])
    const reset = React.useCallback(() => {
        abortRef.current?.abort()
        conversationId.current = null
        setMessages([])
    }, [])

    return { messages, streaming, send, stop, reset }
}
