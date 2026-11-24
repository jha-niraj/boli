'use client'

import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { AppLink } from '@repo/ui/components/app-link'
import { SITE } from '@repo/core/site'
import { KURA_SUGGESTIONS } from '@repo/boli'
import { buildSamples, type SampleMessage } from '@repo/boli/code-samples'
import { ROUTES } from '@/lib/navigation'
import { WEB } from '@/lib/web-links'
import type { ChatViewMessage } from '@/lib/ai/types'
import { CodeTabs } from '@repo/brand/code-tabs'
import { useKuraChat } from '@/stores/kura-chat.store'

/** Turns of the current chat put into the sample (more makes a wall of JSON). */
const SAMPLE_MESSAGES = 6
/** A long message is cut in the sample - it shows the shape, not the whole chat. */
const SAMPLE_CHARS = 400

const clip = (s: string) => (s.length > SAMPLE_CHARS ? `${s.slice(0, SAMPLE_CHARS - 3).trimEnd()}...` : s)

function sampleMessages(messages: ChatViewMessage[], systemPrompt: string, draft: string): SampleMessage[] {
    const turns: SampleMessage[] = messages.flatMap((m): SampleMessage[] => {
        if (m.role === 'user') return m.text.trim() ? [{ role: 'user', content: clip(m.text) }] : []
        const text = m.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('').trim()
        return text ? [{ role: 'assistant', content: clip(text) }] : []
    })
    const last = turns.slice(-SAMPLE_MESSAGES)
    while (last[0] && last[0].role !== 'user') last.shift()
    // The sample always ends on a question: what is typed now, else the chat's own last turns, else a suggestion.
    if (draft.trim()) last.push({ role: 'user', content: clip(draft.trim()) })
    else if (!last.length) last.push({ role: 'user', content: KURA_SUGGESTIONS[1]?.prompt ?? 'Namaste!' })
    return [{ role: 'system', content: systemPrompt }, ...last]
}

/**
 * Code tab: this very chat as an API call (cURL / Python / TypeScript / JavaScript / Go), live - it follows the settings,
 * the Think pill, the chat's last turns and what is being typed. The key is always the placeholder `$BOLI_API_KEY`.
 * Highlighting: CodeTabs imports the Shiki module the first time this tab opens (nothing on Kura's first load), caches
 * it for the session, then re-colours synchronously on every change.
 */
export function CodePanel({ draft }: { draft: string }) {
    const messages = useKuraChat((s) => s.messages)
    const settings = useKuraChat((s) => s.settings)
    const samples = useMemo(
        () => buildSamples({ baseUrl: SITE.url, messages: sampleMessages(messages, settings.systemPrompt, draft), settings }),
        [messages, settings, draft],
    )

    return (
        <ScrollArea orientation="vertical" className="min-h-0 flex-1">
            <div className="flex min-w-0 flex-col gap-3 p-4">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    This chat as an API call, with its settings and last turns. It updates as you change them.
                </p>
                {/* Fixed height (owner, 2026-11-24): the request grows with the chat, so the block keeps one size and the code scrolls inside. */}
                <CodeTabs samples={samples} className="min-w-0" bodyViewportClassName="h-[24rem]" />
                <div className="flex min-w-0 flex-col gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                    <p>Set <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono dark:bg-neutral-800">BOLI_API_KEY</code> to a key from your API keys first.</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <AppLink href={ROUTES.keys} className="inline-flex items-center gap-1 underline underline-offset-2">Create an API key<ArrowUpRight className="h-3 w-3" /></AppLink>
                        <AppLink href={WEB.doc('chatcompletions')} className="inline-flex items-center gap-1 underline underline-offset-2">Chat completions reference<ArrowUpRight className="h-3 w-3" /></AppLink>
                    </div>
                </div>
            </div>
        </ScrollArea>
    )
}
