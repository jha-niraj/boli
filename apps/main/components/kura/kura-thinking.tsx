'use client'

import { memo, useEffect, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Brain, Check, ChevronDown } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { cn } from '@repo/ui/lib/utils'

/**
 * Kura's thinking, as steps (owner, 2026-11-24: "thinking and reasoning UI steps").
 *
 * boli-chat (Gemma 4) thinks in numbered, headed sections - "1. **Analyze the Request:**", "2. **Perform the
 * Calculation:**" - so the thought is split on those top-level headings into a timeline: a dot per step, the step's
 * title, and its body as small markdown under it. While it streams, the group is open, the last step pulses and the
 * list follows the newest line; when the reply starts the group folds to one row ("Thought for 10s - 5 steps"), and
 * only on that edge, so it never fights a reader who opened it again. Text with no headings is one step, "Reasoning".
 */

export interface ThinkingStep {
    title: string
    body: string
}

// A top-level step: "1. **Title:** rest" / "1.  **Title**" / "* **Title:** rest" at the start of a line (indent < 2).
const STEP_RE = /^ {0,1}(?:\d+[.)]|[*-])\s+\*\*(.+?)\*\*:?\s*(.*)$/

export function splitThought(text: string): ThinkingStep[] {
    const lines = text.replace(/\r\n/g, '\n').split('\n')
    const steps: (ThinkingStep & { lead: string })[] = []
    const preamble: string[] = []
    for (const line of lines) {
        const m = STEP_RE.exec(line)
        if (m) {
            steps.push({ title: (m[1] ?? '').replace(/:\s*$/, '').trim(), lead: (m[2] ?? '').trim(), body: '' })
            continue
        }
        const last = steps[steps.length - 1]
        if (last) last.body += `${line}\n`
        else preamble.push(line)
    }
    if (!steps.length) return text.trim() ? [{ title: 'Reasoning', body: text }] : []
    // The step bodies are indented under their heading; take the shared indent off so markdown sees real lists.
    return steps.map((s) => {
        // The text after "**Title:**" sits on the heading's own line; the lines under it are indented. Dedent only
        // those, and start them on a new paragraph so markdown reads them as a list, not part of the sentence.
        const tail = dedent(s.body).trim()
        return { title: s.title, body: s.lead ? (tail ? `${s.lead}\n\n${tail}` : s.lead) : tail }
    })
}

function dedent(s: string): string {
    const lines = s.split('\n')
    const indents = lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)?.[0].length ?? 0)
    const cut = indents.length ? Math.min(...indents) : 0
    return cut ? lines.map((l) => l.slice(Math.min(cut, /^ */.exec(l)?.[0].length ?? 0))).join('\n') : s
}

function seconds(ms: number | undefined): string | null {
    if (ms == null || !Number.isFinite(ms) || ms < 300) return null
    return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`
}

const md: Components = {
    p: ({ children }) => <p className="my-1 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
    ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
    strong: ({ children }) => <strong className="font-medium text-neutral-800 dark:text-neutral-200">{children}</strong>,
    code: ({ children }) => <code className="rounded bg-neutral-100 px-1 font-mono text-[0.92em] dark:bg-neutral-800">{children}</code>,
    pre: ({ children }) => <pre className="my-1 whitespace-pre-wrap break-words font-mono">{children}</pre>,
    a: ({ children }) => <span>{children}</span>,
    h1: ({ children }) => <p className="my-1 font-medium">{children}</p>,
    h2: ({ children }) => <p className="my-1 font-medium">{children}</p>,
    h3: ({ children }) => <p className="my-1 font-medium">{children}</p>,
}

export const KuraThinking = memo(function KuraThinking({ text, ms, active }: { text: string; ms?: number; active: boolean }) {
    const steps = splitThought(text)
    const [open, setOpen] = useState(active)
    const wasActive = useRef(active)
    useEffect(() => {
        if (active && !wasActive.current) setOpen(true)
        if (!active && wasActive.current) setOpen(false)
        wasActive.current = active
    }, [active])

    // Follow the newest line while it streams, unless the reader scrolled up inside the list.
    const viewport = useRef<HTMLDivElement>(null)
    const pinned = useRef(true)
    useEffect(() => {
        const el = viewport.current
        if (!el || !active || !pinned.current) return
        el.scrollTop = el.scrollHeight
    }, [text, active])

    const secs = seconds(ms)
    const title = active ? 'Thinking' : secs ? `Thought for ${secs}` : 'Thought for a moment'
    const count = steps.length > 1 ? `${steps.length} steps` : null
    const current = active ? steps[steps.length - 1]?.title : null

    return (
        <div className="min-w-0 text-xs">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="-ml-2 h-7 max-w-full gap-1.5 rounded-full px-2 text-xs font-normal text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 [&_svg]:size-3.5"
            >
                <Brain className={cn(active && 'motion-safe:animate-pulse')} />
                <span className={cn('shrink-0', active && 'kura-shimmer')}>{title}</span>
                {current ? <span className="min-w-0 truncate text-neutral-500 dark:text-neutral-500">- {current}</span> : null}
                {!active && count ? <span className="shrink-0 text-neutral-500">- {count}</span> : null}
                <ChevronDown className={cn('shrink-0 transition-transform duration-200', open && 'rotate-180')} />
            </Button>
            {open && steps.length > 0 ? (
                <ScrollArea
                    orientation="vertical"
                    className="mt-1 min-w-0"
                    viewportClassName="max-h-72"
                    viewportRef={viewport}
                    onScrollCapture={() => {
                        const el = viewport.current
                        if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
                    }}
                >
                    <ol className="relative min-w-0 pr-3">
                        {steps.map((s, i) => {
                            const last = i === steps.length - 1
                            const running = active && last
                            return (
                                <li key={i} className="relative flex min-w-0 gap-3 pb-3 last:pb-1">
                                    {/* The rail between dots. */}
                                    {!last && <span aria-hidden className="absolute left-[7px] top-4 bottom-0 w-px bg-neutral-200 dark:bg-neutral-800" />}
                                    <span aria-hidden className="relative mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                                        {running
                                            ? <span className="h-1.5 w-1.5 rounded-full bg-boli-sky motion-safe:animate-pulse" />
                                            : <Check className="h-2.5 w-2.5 text-neutral-500" strokeWidth={3} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={cn('font-medium text-neutral-800 dark:text-neutral-200', running && 'kura-shimmer')}>{s.title}</p>
                                        {s.body ? (
                                            <div className="mt-0.5 min-w-0 break-words text-neutral-600 dark:text-neutral-400">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{s.body}</ReactMarkdown>
                                            </div>
                                        ) : null}
                                    </div>
                                </li>
                            )
                        })}
                    </ol>
                </ScrollArea>
            ) : null}
        </div>
    )
})
