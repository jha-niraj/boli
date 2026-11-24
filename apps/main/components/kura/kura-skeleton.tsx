import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { PageSkeleton } from '@repo/ui/components/ui/page'
import { SHELL_SHADOW_RIGHT, SHELL_SURFACE } from '@repo/ui/lib/surfaces'
import { cn } from '@repo/ui/lib/utils'
import { NamasteBubble } from '@/components/art/status/scenes'
import { KURA_SUGGESTIONS } from '@/lib/boli'
import { CHAT_AREA, CHAT_COLUMN, CHAT_COLUMN_STYLE, CHAT_GUTTER, CHAT_PAGE_CLASS, KURA_HEADER_H } from './query-keys'
import { ChatFrame } from './chat-frame'

/**
 * Skeletons for Kura. The transcript skeleton sits in the SAME reading measure as the transcript, so the page never
 * narrows when messages land. `KuraPageSkeleton` is loading.tsx's and mirrors the page: the chat column (Page header +
 * transcript + composer with its pills, inside the same column lines and frame) and, from lg, the right column with its four tabs and the Settings form.
 * A NEW chat (/kura) draws the welcome instead of a transcript: where the KS1 scene will sit, Kura's pixel bubble types
 * and says "namaste" (F4, owner pick 2026-11-24 for opening Kura), then the title, the subtitle and the suggestion cards.
 */

/** /kura's empty state while it loads (KuraWelcome's shape), with F4 in the scene's frame. */
export function WelcomeSkeleton() {
    return (
        <div className={cn('flex min-h-full w-full min-w-0 flex-col justify-center py-8', CHAT_GUTTER)}>
            <div className="flex flex-col items-center text-center">
                <div className="flex aspect-[112/48] w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-boli-sky-soft ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                    <NamasteBubble className="w-36 sm:w-44" />
                </div>
                <div className="mt-6 flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
                <Skeleton className="mt-2 h-3 w-40 rounded" />
                <Skeleton className="mt-3 h-4 w-80 max-w-full rounded" />
            </div>
            <div className="mt-6 grid min-w-0 gap-2.5 sm:grid-cols-2">
                {KURA_SUGGESTIONS.map((sg, i) => (
                    <div key={sg.label} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <Skeleton className="h-1.5 w-full rounded-none" delay={i * 0.05} />
                        <div className="space-y-1.5 px-3.5 pb-3 pt-2.5">
                            <Skeleton className="h-3 w-20 rounded" delay={i * 0.05} />
                            <Skeleton className="h-4 w-4/5 rounded" delay={i * 0.05} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-5 flex justify-center"><Skeleton className="h-3.5 w-32 rounded" /></div>
        </div>
    )
}

export function TranscriptSkeleton() {
    return (
        <div className={cn('flex w-full min-w-0 flex-col gap-6 py-6', CHAT_GUTTER)}>
            {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3">
                    <div className="flex justify-end"><Skeleton className="h-9 w-2/5 rounded-2xl" delay={i * 0.1} /></div>
                    <div className="flex items-start gap-3">
                        <Skeleton className="h-7 w-7 shrink-0 rounded-full" delay={i * 0.1} />
                        <div className="min-w-0 flex-1 space-y-2 pt-1">
                            <Skeleton className="h-3.5 w-11/12 rounded" delay={i * 0.1} />
                            <Skeleton className="h-3.5 w-4/5 rounded" delay={i * 0.1} />
                            <Skeleton className="h-3 w-40 rounded" delay={i * 0.1} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export function ComposerSkeleton() {
    return (
        <div className={cn('w-full min-w-0 pb-3', CHAT_GUTTER)}>
            <div className="rounded-3xl border border-neutral-200 p-2.5 dark:border-neutral-800">
                <Skeleton className="mx-1.5 mt-1 h-4 w-2/5 rounded" />
                <div className="mt-6 flex items-center gap-1.5">
                    <Skeleton className="h-7 w-40 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <span className="flex-1" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>
            <div className="mt-1.5 hidden h-5 sm:block" />
        </div>
    )
}

export function SettingsSkeleton() {
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-5 p-4">
            <Skeleton className="h-3 w-48 rounded" />
            <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                    <div className="flex justify-between"><Skeleton className="h-4 w-24 rounded" delay={i * 0.05} /><Skeleton className="h-7 w-20 rounded-full" delay={i * 0.05} /></div>
                    <Skeleton className="h-1.5 w-full rounded-full" delay={i * 0.05} />
                </div>
            ))}
        </div>
    )
}

export function KuraPageSkeleton({ title, variant = 'transcript' }: { title: string; variant?: 'welcome' | 'transcript' }) {
    return (
        <div className="flex h-[var(--app-page-h)] min-h-0 w-full min-w-0 overflow-hidden">
            <div className={CHAT_AREA}>
                <div className={CHAT_COLUMN} style={CHAT_COLUMN_STYLE}>
                    <ChatFrame />
                    <PageSkeleton title={title} icon={false} description={false} actions={3} primaryAction bleed body="fill" className={CHAT_PAGE_CLASS}>
                        <div className="relative flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-hidden">{variant === 'welcome' ? <WelcomeSkeleton /> : <TranscriptSkeleton />}</div>
                            <ComposerSkeleton />
                        </div>
                    </PageSkeleton>
                </div>
            </div>
            <div className={cn('hidden h-full w-[clamp(320px,calc(100vw-1024px),560px)] shrink-0 flex-col lg:flex', SHELL_SURFACE, SHELL_SHADOW_RIGHT)}>
                <div style={{ height: KURA_HEADER_H }} className="flex shrink-0 items-center gap-1 border-b border-neutral-200 px-3 dark:border-neutral-800">
                    <Skeleton className="h-8 w-72 rounded-full" />
                </div>
                <SettingsSkeleton />
            </div>
        </div>
    )
}
