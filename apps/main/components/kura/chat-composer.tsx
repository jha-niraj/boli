'use client'

import { forwardRef, useEffect, useState } from 'react'
import { ArrowUp, Brain, Square } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Kbd } from '@repo/ui/components/ui/kbd'
import { cn } from '@repo/ui/lib/utils'
import { BOLI_CHAT } from '@/lib/boli'
import { SKY_FILL, SKY_RING, SKY_SOFT, SKY_TEXT } from '@/components/platform/sky'
import { CHAT_GUTTER } from './query-keys'

/** "Gemma 4 E4B": the label without its quantization note (the full line is the chip's title). */
const MODEL_LABEL = BOLI_CHAT.label.split(',')[0] ?? BOLI_CHAT.label

/**
 * The composer - pinned at the bottom of the chat column in EVERY state (welcome, transcript, loading). It keeps one
 * position in the React tree, so the textarea never remounts and the caret never leaves it on Enter. It is never
 * disabled while a reply streams (focus would leave it); `onSend` guards instead.
 *
 * Options sit INSIDE the box as small pills next to Send (as llama.cpp's web UI does): the model chip and the Think
 * switch (off by default; on = the model thinks before it answers, and the thinking shows above the reply).
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
        <div className={cn('w-full min-w-0 pb-3', CHAT_GUTTER)}>
            {/* The box is the ONE surface: the textarea inside is transparent with no radius, ring or hover fill of its
                own; focus tints the box border instead. */}
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-[0_2px_12px_-4px_rgb(0_0_0/0.08)] transition-colors focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-600">
                <Textarea
                    data-no-pill
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
                    className="max-h-48 min-h-[52px] resize-none rounded-none border-0 bg-transparent px-4 pt-3.5 text-sm shadow-none [field-sizing:content] hover:bg-transparent focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                />
                <div className="flex min-w-0 items-center gap-1.5 px-2.5 pb-2.5">
                    {/* K1 v2 model chip: a live dot, the id in mono, what it is (from sm). One model, so no menu. */}
                    <span
                        title={`${BOLI_CHAT.id} - ${BOLI_CHAT.label}`}
                        className="inline-flex h-7 min-w-0 items-center gap-2 rounded-full bg-white pl-2.5 pr-3 text-xs ring-1 ring-inset ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
                    >
                        <span aria-hidden className="relative flex size-1.5 shrink-0">
                            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" />
                            <span className="relative size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        </span>
                        <span className="shrink-0 font-mono text-neutral-900 dark:text-neutral-100">{BOLI_CHAT.id}</span>
                        <span className="hidden min-w-0 truncate text-neutral-600 sm:inline dark:text-neutral-400">{MODEL_LABEL}</span>
                    </span>
                    {/* K1 v2 Think: a labelled switch - the brain, the word, a small track that says on or off. */}
                    <Button
                        type="button"
                        variant="ghost"
                        role="switch"
                        aria-checked={think}
                        onClick={() => onThink(!think)}
                        title={think ? 'Thinking is on - the model reasons first (costs output tokens)' : 'Let the model think before it answers'}
                        className={cn(
                            'h-7 shrink-0 gap-2 rounded-full pl-2.5 pr-1.5 text-xs font-normal ring-1 ring-inset focus-visible:ring-offset-0 [&_svg]:size-3.5',
                            think
                                ? cn('text-neutral-900 hover:text-neutral-900 dark:text-white dark:hover:text-white', SKY_SOFT, SKY_RING, 'hover:bg-boli-sky-soft')
                                : 'text-neutral-700 ring-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:ring-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white',
                        )}
                    >
                        <Brain className={think ? SKY_TEXT : undefined} />
                        Think
                        <span aria-hidden className={cn('relative h-4 w-7 rounded-full transition-colors motion-reduce:transition-none', think ? SKY_FILL : 'bg-neutral-200 dark:bg-neutral-700')}>
                            <span className={cn('absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-[left] motion-reduce:transition-none', think ? 'left-[14px]' : 'left-0.5')} />
                        </span>
                    </Button>
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
