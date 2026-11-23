'use client'

import { forwardRef, useEffect, useState } from 'react'
import { ArrowUp, Brain, Square } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Kbd } from '@repo/ui/components/ui/kbd'
import { cn } from '@repo/ui/lib/utils'
import { BOLI_CHAT } from '@/lib/boli'
import { READING_MEASURE } from './query-keys'

/** "boli-chat - Gemma 4 E4B": the id and the label without its quantization note. */
const MODEL_CHIP = `${BOLI_CHAT.id} - ${BOLI_CHAT.label.split(',')[0] ?? BOLI_CHAT.label}`

/**
 * The composer - pinned at the bottom of the chat column in EVERY state (welcome, transcript, loading). It keeps one
 * position in the React tree, so the textarea never remounts and the caret never leaves it on Enter. It is never
 * disabled while a reply streams (focus would leave it); `onSend` guards instead.
 *
 * Options sit INSIDE the box as small pills next to Send (as llama.cpp's web UI does): the model chip and the Think
 * toggle (off by default; on = the model thinks before it answers, and the thinking shows above the reply).
 */
export const ChatComposer = forwardRef<HTMLTextAreaElement, {
    value: string
    onChange: (v: string) => void
    onSend: () => void
    onStop: () => void
    streaming: boolean
    think: boolean
    onThink: (on: boolean) => void
    placeholder?: string
}>(function ChatComposer({ value, onChange, onSend, onStop, streaming, think, onThink, placeholder }, ref) {
    // The modifier key label is resolved after mount (hydration-safe).
    const [mod, setMod] = useState('Ctrl')
    useEffect(() => {
        if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setMod('Cmd')
    }, [])

    return (
        <div className={cn('mx-auto w-full min-w-0 px-3 pb-3', READING_MEASURE)}>
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-[0_2px_12px_-4px_rgb(0_0_0/0.08)] focus-within:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-700">
                <Textarea
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            onSend()
                        }
                    }}
                    rows={1}
                    maxLength={8000}
                    placeholder={placeholder ?? 'Message Kura in English, Nepali or both'}
                    aria-label="Message"
                    className="max-h-48 min-h-[52px] resize-none rounded-none border-0 bg-transparent px-4 pt-3.5 text-sm shadow-none [field-sizing:content] focus-visible:ring-0 sm:resize-none dark:bg-transparent"
                />
                <div className="flex min-w-0 items-center gap-1.5 px-2.5 pb-2.5">
                    <span
                        title={`${BOLI_CHAT.id} - ${BOLI_CHAT.label}`}
                        className="inline-flex h-7 min-w-0 items-center gap-1.5 truncate rounded-full border border-neutral-200 px-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:text-neutral-300"
                    >
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="truncate">{MODEL_CHIP}</span>
                    </span>
                    <button
                        type="button"
                        aria-pressed={think}
                        onClick={() => onThink(!think)}
                        title={think ? 'Thinking is on - the model reasons first (costs output tokens)' : 'Let the model think before it answers'}
                        className={cn(
                            'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            think
                                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800',
                        )}
                    >
                        <Brain className="h-3.5 w-3.5" />
                        Think
                    </button>
                    <span className="flex-1" />
                    {streaming ? (
                        <Button type="button" size="icon-sm" variant="outline" onClick={onStop} aria-label="Stop" className="cursor-pointer rounded-full">
                            <Square className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button type="button" size="icon-sm" onClick={onSend} disabled={!value.trim()} aria-label="Send" className="cursor-pointer rounded-full">
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <p className="mt-1.5 hidden items-center justify-center gap-1.5 text-xs text-neutral-600 sm:flex dark:text-neutral-400">
                <Kbd>Enter</Kbd> send <span aria-hidden>-</span> <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line <span aria-hidden>-</span> <Kbd>{mod}</Kbd>+<Kbd>J</Kbd> focus
            </p>
        </div>
    )
})
