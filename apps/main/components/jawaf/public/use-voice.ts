"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Voice for the public chat: record up to 30 s with MediaRecorder, upload to /j/<slug>/api/speech (Sarvam speech to
 * text), hand the words back for the visitor to send or edit. Voice is included in the answer price - nothing is
 * charged here. The microphone is released as soon as a clip ends.
 */

export const VOICE_MAX_SECONDS = 30

export type VoiceState = "idle" | "starting" | "recording" | "transcribing"

function pickType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined
    for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
        if (MediaRecorder.isTypeSupported?.(t)) return t
    }
    return undefined
}

export function useVoice({ endpoint, onText }: { endpoint: string; onText: (text: string) => void }) {
    const [state, setState] = useState<VoiceState>("idle")
    const [seconds, setSeconds] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const recorder = useRef<MediaRecorder | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const chunks = useRef<Blob[]>([])
    const timer = useRef<number | null>(null)
    const startedAt = useRef(0)
    /** What to do when the recorder stops: send the clip, or throw it away. */
    const onStop = useRef<"send" | "discard">("send")
    /** Released (or cancelled) while the microphone was still being opened. */
    const abortStart = useRef<"send" | "discard" | null>(null)
    const onTextRef = useRef(onText)
    onTextRef.current = onText

    const supported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia

    const release = useCallback(() => {
        if (timer.current) window.clearInterval(timer.current)
        timer.current = null
        stream.current?.getTracks().forEach((t) => t.stop())
        stream.current = null
        recorder.current = null
    }, [])

    useEffect(() => () => {
        onStop.current = "discard"
        try { recorder.current?.stop() } catch { /* already stopped */ }
        release()
    }, [release])

    const upload = useCallback(async (blob: Blob) => {
        setState("transcribing")
        try {
            const form = new FormData()
            const type = blob.type || "audio/webm"
            form.append("audio", blob, `voice.${type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm"}`)
            const res = await fetch(endpoint, { method: "POST", body: form })
            const json = (await res.json().catch(() => null)) as { success?: boolean; data?: { text?: string }; error?: string } | null
            if (!res.ok || !json?.success || !json.data?.text) throw new Error(json?.error || "We could not hear that. Try again, or type instead.")
            onTextRef.current(json.data.text)
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : "We could not hear that. Try again, or type instead.")
        } finally {
            setState("idle")
        }
    }, [endpoint])

    const finish = useCallback((how: "send" | "discard") => {
        const r = recorder.current
        if (!r) {
            // Still opening the microphone (or nothing running): remember, and stop as soon as it opens. `start` clears it.
            abortStart.current = how
            return
        }
        onStop.current = how
        try { r.stop() } catch { release(); setState("idle") }
    }, [release])

    const start = useCallback(async () => {
        if (state !== "idle") return
        setError(null)
        if (!supported) {
            setError("Voice does not work in this browser. Type your question instead.")
            return
        }
        setState("starting")
        abortStart.current = null
        try {
            const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
            stream.current = media
            const type = pickType()
            const r = new MediaRecorder(media, type ? { mimeType: type, audioBitsPerSecond: 32_000 } : undefined)
            recorder.current = r
            chunks.current = []
            onStop.current = "send"
            r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
            r.onstop = () => {
                const how = onStop.current
                const elapsed = (Date.now() - startedAt.current) / 1000
                const blob = new Blob(chunks.current, { type: r.mimeType || type || "audio/webm" })
                chunks.current = []
                release()
                setSeconds(0)
                if (how === "discard") return setState("idle")
                if (elapsed < 0.6 || blob.size < 1000) {
                    setError("That was too short. Hold the mic while you speak.")
                    return setState("idle")
                }
                void upload(blob).catch(() => undefined)
            }
            r.start(250)
            startedAt.current = Date.now()
            setSeconds(0)
            setState("recording")
            timer.current = window.setInterval(() => {
                const s = Math.floor((Date.now() - startedAt.current) / 1000)
                setSeconds(s)
                if (s >= VOICE_MAX_SECONDS) {
                    onStop.current = "send"
                    try { r.stop() } catch { /* already stopped */ }
                }
            }, 200)
            const pending = abortStart.current
            if (pending) {
                abortStart.current = null
                // Released during the permission prompt: a first-time "hold" cannot be a real clip; ask to hold again.
                onStop.current = "discard"
                r.stop()
                if (pending === "send") setError("Microphone ready. Now hold the mic while you speak.")
            }
        } catch (e) {
            release()
            setState("idle")
            const name = e instanceof DOMException ? e.name : ""
            if (name === "NotAllowedError" || name === "SecurityError") setError("The microphone is blocked. Allow it from the lock icon in the address bar, or type instead.")
            else if (name === "NotFoundError") setError("No microphone was found. Type your question instead.")
            else setError("The microphone could not start. Type your question instead.")
        }
    }, [release, state, supported, upload])

    return { state, seconds, error, setError, supported, start, stop: () => finish("send"), cancel: () => finish("discard") }
}
