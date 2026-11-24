"use client"

import { forwardRef, useRef, useState } from "react"
import { ArrowUp, Mic, Square, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import { JAWAF_PUBLIC_QUESTION_CHARS } from "@/schemas/jawaf-public"
import { ACCENT_BUTTON } from "./contact-card"
import { useVoice, VOICE_MAX_SECONDS } from "./use-voice"

/**
 * The visitor's composer: one rounded box with the text, the mic and Send. Voice: on a phone, press and HOLD the mic
 * (release to send the clip, slide away to cancel); with a mouse or the keyboard, click to start and click again to
 * stop (or Cancel). The words come back INTO the box for the visitor to send or edit - never sent on their own.
 */

const fmt = (s: number) => `0:${String(Math.min(s, VOICE_MAX_SECONDS)).padStart(2, "0")}`

export const JawafComposer = forwardRef<HTMLTextAreaElement, {
    value: string
    onChange: (v: string) => void
    onSend: () => void
    busy: boolean
    speechEndpoint: string
}>(function JawafComposer({ value, onChange, onSend, busy, speechEndpoint }, ref) {
    const local = useRef<HTMLTextAreaElement | null>(null)
    const voice = useVoice({
        endpoint: speechEndpoint,
        onText: (text) => {
            onChange(value.trim() ? `${value.trim()} ${text}` : text)
            window.setTimeout(() => local.current?.focus(), 0)
        },
    })
    const pointer = useRef<"mouse" | "touch">("mouse")
    const [holding, setHolding] = useState(false)
    const [outside, setOutside] = useState(false)

    const recording = voice.state === "recording" || voice.state === "starting"
    const canSend = !!value.trim() && !busy && !recording && voice.state !== "transcribing"

    const setRefs = (el: HTMLTextAreaElement | null) => {
        local.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) ref.current = el
    }

    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-end gap-1.5 rounded-[1.75rem] border border-neutral-200 bg-white p-1.5 shadow-[0_2px_12px_-4px_rgb(0_0_0/0.08)] transition-colors focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-600">
                {recording ? (
                    <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center gap-1.5 px-3" aria-live="polite">
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                            <span aria-hidden className="relative flex size-2 shrink-0">
                                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--jawaf-accent)] opacity-60 motion-reduce:hidden" />
                                <span className="relative size-2 rounded-full bg-[var(--jawaf-accent)]" />
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-700 dark:text-neutral-300">{fmt(voice.seconds)}</span>
                            <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-300">
                                {voice.state === "starting" ? "Opening the microphone..." : holding ? (outside ? "Release to cancel" : "Listening - release to send") : "Listening - click the mic to stop"}
                            </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div className="h-full rounded-full bg-[var(--jawaf-accent)] transition-[width] duration-200" style={{ width: `${(Math.min(voice.seconds, VOICE_MAX_SECONDS) / VOICE_MAX_SECONDS) * 100}%` }} />
                        </div>
                    </div>
                ) : voice.state === "transcribing" ? (
                    <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-3 text-sm text-neutral-700 dark:text-neutral-300" aria-live="polite">
                        <InlineLoader size={14} label="Writing down what you said" />
                        Writing down what you said...
                    </div>
                ) : (
                    <Textarea
                        data-no-pill
                        ref={setRefs}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault()
                                if (canSend) onSend()
                            }
                        }}
                        rows={1}
                        maxLength={JAWAF_PUBLIC_QUESTION_CHARS}
                        placeholder="Type or hold to speak"
                        aria-label="Your question"
                        enterKeyHint="send"
                        className="max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2.5 text-base shadow-none [field-sizing:content] hover:bg-transparent focus-visible:border-0 focus-visible:ring-0 sm:text-sm dark:bg-transparent dark:hover:bg-transparent"
                    />
                )}

                {recording && !holding ? (
                    <Button type="button" variant="ghost" size="icon" aria-label="Cancel recording" onClick={voice.cancel} className="size-10 shrink-0 cursor-pointer rounded-full">
                        <X aria-hidden className="size-4" />
                    </Button>
                ) : null}

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={recording ? "Stop recording" : "Hold to speak"}
                    aria-pressed={recording}
                    title={recording ? "Stop" : "Hold to speak (or click)"}
                    disabled={voice.state === "transcribing" || busy}
                    className={cn(
                        "size-10 shrink-0 cursor-pointer touch-none select-none rounded-full [-webkit-touch-callout:none]",
                        recording ? "bg-neutral-100 dark:bg-neutral-800" : "text-neutral-700 dark:text-neutral-300",
                    )}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                        pointer.current = e.pointerType === "mouse" ? "mouse" : "touch"
                        if (pointer.current === "mouse") return
                        e.preventDefault()
                        e.currentTarget.setPointerCapture(e.pointerId)
                        setHolding(true)
                        setOutside(false)
                        void voice.start()
                    }}
                    onPointerMove={(e) => {
                        if (!holding) return
                        const r = e.currentTarget.getBoundingClientRect()
                        const far = e.clientX < r.left - 48 || e.clientX > r.right + 48 || e.clientY < r.top - 64 || e.clientY > r.bottom + 48
                        if (far !== outside) setOutside(far)
                    }}
                    onPointerUp={() => {
                        if (!holding) return
                        setHolding(false)
                        if (outside) voice.cancel()
                        else voice.stop()
                    }}
                    onPointerCancel={() => {
                        if (!holding) return
                        setHolding(false)
                        voice.cancel()
                    }}
                    onClick={() => {
                        // Touch is handled by the hold above; a mouse click or the keyboard toggles.
                        if (pointer.current === "touch") {
                            pointer.current = "mouse"
                            return
                        }
                        if (recording) voice.stop()
                        else void voice.start()
                    }}
                >
                    {recording ? <Square aria-hidden className="size-3.5 fill-current" /> : <Mic aria-hidden className="size-[18px]" />}
                </Button>

                <Button
                    type="button"
                    size="icon"
                    aria-label="Send"
                    disabled={!canSend}
                    onClick={onSend}
                    className={cn("size-10 shrink-0 cursor-pointer rounded-full disabled:opacity-40", ACCENT_BUTTON)}
                >
                    <ArrowUp aria-hidden className="size-[18px]" />
                </Button>
            </div>
            {voice.error ? (
                <p role="status" className="px-3 text-xs text-neutral-700 dark:text-neutral-300">
                    {voice.error}
                </p>
            ) : null}
        </div>
    )
})
