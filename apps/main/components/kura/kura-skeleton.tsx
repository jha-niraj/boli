import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { PageSkeleton } from '@repo/ui/components/ui/page'
import { cn } from '@repo/ui/lib/utils'
import { CHAT_COLUMN, CHAT_COLUMN_STYLE, READING_MEASURE } from './query-keys'

/**
 * Skeletons for Kura. The transcript skeleton sits in the SAME reading measure as the transcript, so the page never
 * narrows when messages land. `KuraPageSkeleton` is loading.tsx's and mirrors the page: the chat column (Page header +
 * transcript + composer with its pills) and, from lg, the right column with its four tabs and the Settings form.
 */

export function TranscriptSkeleton() {
    return (
        <div className={cn('mx-auto flex w-full min-w-0 flex-col gap-6 px-3 py-6 sm:px-6', READING_MEASURE)}>
            {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3">
                    <div className="flex justify-end"><Skeleton className="h-9 w-2/5 rounded-2xl" delay={i * 0.1} /></div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-11/12 rounded" delay={i * 0.1} />
                        <Skeleton className="h-3.5 w-4/5 rounded" delay={i * 0.1} />
                        <Skeleton className="h-3 w-40 rounded" delay={i * 0.1} />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function ComposerSkeleton() {
    return (
        <div className={cn('mx-auto w-full min-w-0 px-3 pb-3', READING_MEASURE)}>
            <div className="rounded-3xl border border-neutral-200 p-2.5 dark:border-neutral-800">
                <Skeleton className="mx-1.5 mt-1 h-4 w-2/5 rounded" />
                <div className="mt-6 flex items-center gap-1.5">
                    <Skeleton className="h-7 w-40 rounded-full" />
                    <Skeleton className="h-7 w-16 rounded-full" />
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

export function KuraPageSkeleton({ title }: { title: string }) {
    return (
        <div className="flex h-[var(--app-page-h)] min-h-0 w-full min-w-0">
            <div className={CHAT_COLUMN} style={CHAT_COLUMN_STYLE}>
                <PageSkeleton title={title} icon={false} description={false} actions={2} primaryAction bleed body="fill" className="[&>[data-page-header]]:px-4">
                    <div className="relative flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-hidden"><TranscriptSkeleton /></div>
                        <ComposerSkeleton />
                    </div>
                </PageSkeleton>
            </div>
            <div className="hidden h-full w-[clamp(320px,calc(100vw-1024px),560px)] shrink-0 flex-col bg-white shadow-[-12px_0_28px_-18px_rgb(0_0_0/0.22)] lg:flex dark:bg-neutral-950">
                <div className="flex h-12 items-center border-b border-neutral-200 px-3 dark:border-neutral-800">
                    <Skeleton className="h-8 w-72 rounded-full" />
                </div>
                <SettingsSkeleton />
            </div>
        </div>
    )
}
