'use client'

import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AlertCircle } from 'lucide-react'
import { ReasoningSteps } from '@repo/ui/components/ui/reasoning-steps'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { BoliAvatar } from '@/components/brand/boli-mark'
import { SpinnerDots } from '@/components/loaders/spinners'
import { MICRO_PER_CREDIT, formatCredits } from '@/lib/boli'
import type { KuraPart, KuraUsage } from '@/lib/ai/protocol'
import type { ChatViewMessage } from '@/lib/ai/types'

/**
 * One message. Markdown with nothing that scrolls sideways (tables and code scroll inside their own box). The model's
 * thinking shows in the folded "Thought for 1.3s" row above the reply; a reply ends with its meta line.
 */

const md: Components = {
    p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    h1: ({ children }) => <p className="mb-1 mt-3 font-semibold">{children}</p>,
    h2: ({ children }) => <p className="mb-1 mt-3 font-semibold">{children}</p>,
    h3: ({ children }) => <p className="mb-1 mt-3 font-semibold">{children}</p>,
    code: ({ children }) => <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-neutral-800">{children}</code>,
    pre: ({ children }) => (
        <ScrollArea orientation="horizontal" className="my-2 w-full min-w-0 rounded-lg bg-neutral-100 dark:bg-neutral-900">
            <pre className="p-3 font-mono text-xs">{children}</pre>
        </ScrollArea>
    ),
    // A small model can invent URLs: links render as plain text, never navigation.
    a: ({ children }) => <span className="underline decoration-neutral-300 underline-offset-2">{children}</span>,
    table: ({ children }) => (
        <ScrollArea orientation="horizontal" className="my-2 w-full min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-[28rem] text-left text-sm">{children}</table>
        </ScrollArea>
    ),
    th: ({ children }) => <th className="border-b border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{children}</th>,
    td: ({ children }) => <td className="border-b border-neutral-100 px-3 py-1.5 dark:border-neutral-800/60">{children}</td>,
}

function seconds(ms: number): string {
    return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`
}

/** Tiny turns cost a fraction of a hundredth: say so instead of "0.00". */
export function creditsLabel(micro: number): string {
    if (micro > 0 && micro < MICRO_PER_CREDIT / 100) return '< 0.01 credits'
    return `${formatCredits(micro)} credits`
}

function MetaLine({ usage }: { usage: KuraUsage }) {
    const bits = [
        `${usage.inputTokens.toLocaleString('en-US')} in`,
        `${usage.outputTokens.toLocaleString('en-US')} out${usage.reasoningTokens ? ` (${usage.reasoningTokens.toLocaleString('en-US')} thinking)` : ''}`,
        creditsLabel(usage.costMicro),
        seconds(usage.ms),
    ]
    return (
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-neutral-500 tabular-nums dark:text-neutral-400" title="Tokens in / out, credits used, time">
            {bits.map((b, i) => (
                // The cost bit carries the exact figure on hover (owner: "< 0.01 credits" + exact value in a tooltip).
                <span key={i} className="whitespace-nowrap" title={i === 2 ? `${(usage.costMicro / MICRO_PER_CREDIT).toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} credits exactly` : undefined}>
                    {i > 0 && <span aria-hidden className="mr-1.5">-</span>}
                    {b}
                </span>
            ))}
        </p>
    )
}

export const ChatMessage = memo(function ChatMessage({ message }: { message: ChatViewMessage }) {
    if (message.role === 'user') {
        return (
            <div className="flex w-full min-w-0 justify-end">
                <div className="max-w-[85%] min-w-0 whitespace-pre-wrap break-words rounded-2xl bg-neutral-100 px-3.5 py-2 text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                    {message.text}
                </div>
            </div>
        )
    }

    const thoughtPart = message.parts.find((p): p is Extract<KuraPart, { type: 'thought' }> => p.type === 'thought')
    const usagePart = message.parts.find((p): p is Extract<KuraPart, { type: 'usage' }> => p.type === 'usage')
    const empty = !message.parts.some((p) => p.type === 'text' || p.type === 'thought')
    const thought = thoughtPart ? { text: thoughtPart.text, ms: thoughtPart.ms, active: !!message.thinking } : null

    return (
        <div className="flex w-full min-w-0 items-start gap-3">
        {/* Kura's avatar: the Boli mark (R2) on a round tile. */}
        <BoliAvatar size={28} className="mt-[-2px]" />
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 text-sm text-neutral-900 dark:text-neutral-100">
            {message.pending && empty && (
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <SpinnerDots size={16} /> Kura is writing
                </div>
            )}
            {thought && <ReasoningSteps steps={[]} thought={thought} active={!!message.pending} className="min-w-0" />}
            {message.parts.map((p, i) => {
                switch (p.type) {
                    case 'text':
                        return <div key={`text-${i}`} className="min-w-0 break-words"><ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{p.text}</ReactMarkdown></div>
                    case 'notice':
                        return (
                            <div key={`notice-${i}`} className="flex min-w-0 items-start gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" /><span>{p.text}</span>
                            </div>
                        )
                    default:
                        return null
                }
            })}
            {usagePart && !message.pending && <MetaLine usage={usagePart.usage} />}
        </div>
        </div>
    )
})
