'use client'

import { ArrowUpRight, Code2 } from 'lucide-react'
import { AppLink } from '@repo/ui/components/app-link'
import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'
import { ArtRoot } from '@repo/brand/art/art-root'
import { KuraScene } from '@repo/brand/art/kura/kura-scene'
import { BoliAvatar } from '@repo/brand/boli-mark'
import { DashDhaka } from '@/components/platform/dhaka-band'
import { SKY_LINK, SKY_TEXT } from '@/components/platform/sky'
import { KURA, KURA_SUGGESTIONS } from '@repo/boli'
import { WEB } from '@/lib/web-links'
import { CHAT_GUTTER } from './query-keys'

/**
 * Kura's empty state (K1 v2, owner 2026-11-24) - a NEW chat only (no messages, nothing loading); gone the moment the
 * first message exists. The KS1 pixel scene (an elder and a student in kura by the stupa; the dusk palette in dark
 * mode), Kura's mark with the name and its meaning, the subtitle, then the suggestions as PC3-style cards (a thin Dhaka
 * hem, the language in sky ink, the prompt, an arrow) and a way to the same model from code. The composer stays pinned
 * at the bottom by the page.
 *
 * A suggestion that ends in "..." is a template: it goes into the composer for the person to finish; the rest send.
 */
export function KuraWelcome({ busy, onPrompt, onSeed }: { busy: boolean; onPrompt: (text: string) => void; onSeed: (text: string) => void }) {
    return (
        <div className={cn('relative flex min-h-full w-full min-w-0 flex-col justify-center py-8', CHAT_GUTTER)}>
            <div className="flex flex-col items-center text-center">
                {/* Both palettes render; the theme class picks one, so the first frame is right with no client code. */}
                <ArtRoot className="w-full max-w-md overflow-hidden rounded-2xl ring-1 ring-inset ring-neutral-200 shadow-[0_10px_30px_-22px_rgb(20_20_20/0.45)] dark:ring-neutral-800">
                    <div className="dark:hidden">
                        <KuraScene variant="day" className="block aspect-[112/48] w-full" />
                    </div>
                    <div className="hidden dark:block">
                        <KuraScene variant="gold" className="block aspect-[112/48] w-full" />
                    </div>
                </ArtRoot>
                <div className="mt-6 flex items-center gap-2.5">
                    <BoliAvatar size={32} />
                    <h2 className="font-serif text-4xl leading-none text-neutral-900 dark:text-neutral-100">{KURA.name}</h2>
                </div>
                <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <span lang="ne">कुरा</span> - {KURA.meaning.toLowerCase()}
                </p>
                <p className="mt-3 max-w-md text-sm text-neutral-800 dark:text-neutral-200">{KURA.subtitle}</p>
            </div>

            <div className="mt-6 grid min-w-0 gap-2.5 sm:grid-cols-2">
                {KURA_SUGGESTIONS.map((s) => {
                    const template = s.prompt.endsWith('...')
                    return (
                        <Button
                            key={s.label}
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => (template ? onSeed(s.prompt.slice(0, -3)) : onPrompt(s.prompt))}
                            className="group/sg h-auto min-w-0 cursor-pointer flex-col items-stretch justify-start gap-0 overflow-hidden whitespace-normal !rounded-2xl border border-neutral-200 bg-white p-0 text-left font-normal transition-colors hover:border-neutral-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                        >
                            <DashDhaka height={6} />
                            <span className="flex min-w-0 items-start gap-2 px-3.5 pb-3 pt-2.5">
                                <span className="min-w-0 flex-1">
                                    <span className={cn('block text-xs font-medium', SKY_TEXT)}>{s.label}</span>
                                    <span className="mt-0.5 block break-words text-sm leading-5 text-neutral-900 dark:text-neutral-100">{s.prompt}</span>
                                </span>
                                <ArrowUpRight
                                    aria-hidden
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform group-hover/sg:-translate-y-0.5 group-hover/sg:translate-x-0.5 motion-reduce:transition-none dark:text-neutral-400"
                                />
                            </span>
                        </Button>
                    )
                })}
            </div>

            <div className="mt-5 flex justify-center">
                <AppLink href={WEB.doc('quickstart')} className={cn('inline-flex items-center gap-1.5 text-xs', SKY_LINK)}>
                    <Code2 className="h-3.5 w-3.5" /> Use this from code <ArrowUpRight className="h-3 w-3" />
                </AppLink>
            </div>
        </div>
    )
}
