'use client'

import { ArrowUpRight, Code2 } from 'lucide-react'
import { AppLink } from '@repo/ui/components/app-link'
import { cn } from '@repo/ui/lib/utils'
import { BOLI_CHAT, KURA, KURA_SUGGESTIONS } from '@/lib/boli'
import { ROUTES } from '@/lib/navigation'
import { READING_MEASURE } from './query-keys'

/**
 * Kura's empty state - a NEW chat only (no messages, nothing loading); gone the moment the first message exists. The
 * name with its meaning, the subtitle, the suggestions as chips (English / Romanized / Mixed / Summarize) and a way to
 * the same model from code. The composer stays pinned at the bottom by the page.
 *
 * A suggestion that ends in "..." is a template: it goes into the composer for the person to finish; the rest send.
 */
export function KuraWelcome({ busy, onPrompt, onSeed }: { busy: boolean; onPrompt: (text: string) => void; onSeed: (text: string) => void }) {
    return (
        <div className={cn('relative mx-auto flex min-h-full w-full min-w-0 flex-col justify-center px-4 py-10', READING_MEASURE)}>
            {/* Dot grid behind the name only, fading down. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle,rgb(0_0_0/0.09)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_70%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
            />
            <div className="relative flex flex-col items-center text-center">
                <p className="rounded-full border border-neutral-200 bg-white/70 px-2.5 py-0.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
                    <span className="font-mono">{BOLI_CHAT.id}</span> - {BOLI_CHAT.label}
                </p>
                <h2 className="mt-3 flex items-baseline gap-3 font-serif text-5xl leading-none text-neutral-900 sm:text-6xl dark:text-neutral-100">
                    {KURA.name}
                    <span lang="ne" className="font-sans text-2xl text-boli-crimson-ink sm:text-3xl dark:text-red-300">कुरा</span>
                </h2>
                <p className="mt-2 text-sm italic text-neutral-600 dark:text-neutral-400">{KURA.meaning}</p>
                <p className="mt-4 max-w-md text-base text-neutral-800 dark:text-neutral-200">{KURA.subtitle}</p>
            </div>

            <div className="relative mt-8 grid min-w-0 gap-2 sm:grid-cols-2">
                {KURA_SUGGESTIONS.map((s) => {
                    const template = s.prompt.endsWith('...')
                    return (
                        <button
                            key={s.label}
                            type="button"
                            disabled={busy}
                            onClick={() => (template ? onSeed(s.prompt.slice(0, -3)) : onPrompt(s.prompt))}
                            className="group flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
                        >
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{s.label}</span>
                            <span className="line-clamp-2 min-w-0 text-sm text-neutral-800 dark:text-neutral-200">{s.prompt}</span>
                        </button>
                    )
                })}
            </div>

            <div className="relative mt-6 flex justify-center">
                <AppLink href={ROUTES.doc('quickstart')} className="inline-flex items-center gap-1.5 text-xs text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100">
                    <Code2 className="h-3.5 w-3.5" /> Use this from code <ArrowUpRight className="h-3 w-3" />
                </AppLink>
            </div>
        </div>
    )
}
