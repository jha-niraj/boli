'use client'

import { RotateCw, Wallet, X } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { AppLink } from '@repo/ui/components/app-link'
import { cn } from '@repo/ui/lib/utils'
import { RestingScene } from '@/components/art/status/scenes'
import { ROUTES } from '@/lib/navigation'
import type { ChatNote } from '@/stores/kura-chat.store'
import { CHAT_GUTTER } from './query-keys'

/**
 * What stands between the person and a reply, drawn as a designed state above the composer - never a raw error.
 * Out of credits: a panel with Add credits. Model offline: St4 "The model is resting" (the Boli house asleep at
 * night) with Try again. Anything else: one line, with a
 * button when there is somewhere to fix it.
 */
export function KuraNote({ note, onRetry, onDismiss }: { note: ChatNote; onRetry?: () => void; onDismiss: () => void }) {
    if (note.kind === 'credits') {
        return (
            <StatePanel
                tone="crimson"
                icon={<Wallet className="h-4 w-4" />}
                title="You are out of credits"
                text="Kura and the API pause at zero. Add credits to keep chatting - they never expire."
                onDismiss={onDismiss}
            >
                <Button asChild size="sm" className="cursor-pointer">
                    <AppLink href={note.action?.href ?? `${ROUTES.billing}?tab=plans`}>Add credits</AppLink>
                </Button>
                <Button asChild size="sm" variant="ghost" className="cursor-pointer">
                    <AppLink href={ROUTES.usage}>See usage</AppLink>
                </Button>
            </StatePanel>
        )
    }
    if (note.kind === 'offline') {
        return <ModelResting onRetry={onRetry} onDismiss={onDismiss} />
    }
    return (
        <div role="status" className={cn('flex w-full min-w-0 items-center justify-between gap-3 pb-2 text-sm text-neutral-700 dark:text-neutral-300', CHAT_GUTTER)}>
            <p className="min-w-0">{note.message}</p>
            {note.action && (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                    <AppLink href={note.action.href}>{note.action.label}</AppLink>
                </Button>
            )}
        </div>
    )
}

function StatePanel({ tone, icon, title, text, onDismiss, children }: {
    tone: 'crimson' | 'neutral'
    icon: React.ReactNode
    title: string
    text: string
    onDismiss: () => void
    children?: React.ReactNode
}) {
    return (
        <div className={cn('w-full min-w-0 pb-2', CHAT_GUTTER)}>
            <div role="alert" className="flex min-w-0 items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
                <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    tone === 'crimson' ? 'bg-boli-crimson-soft text-boli-crimson-ink dark:bg-red-950/50 dark:text-red-300' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                )}>
                    {icon}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{text}</p>
                    </div>
                    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss" className="h-7 w-7 shrink-0 cursor-pointer text-neutral-500">
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

/**
 * St4 (owner pick, 2026-11-24): the model is down. The Boli house asleep under the moon beside the words, Try again, and
 * the promise that nothing was charged. Compact - it sits above the composer and never covers it.
 */
function ModelResting({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss: () => void }) {
    return (
        <div className={cn('w-full min-w-0 pb-2', CHAT_GUTTER)}>
            <div role="alert" className="relative flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 sm:items-center dark:border-neutral-800 dark:bg-neutral-900">
                <RestingScene className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-40" />
                <div className="min-w-0 flex-1 space-y-2 pr-8">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" /> boli-chat - Unavailable
                        </p>
                        <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">The model is resting</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            boli-chat did not answer - usually a restart, back within a few minutes. Nothing was charged, and your conversation is safe.
                        </p>
                    </div>
                    {onRetry && (
                        <Button type="button" size="sm" variant="outline" onClick={onRetry} className="cursor-pointer">
                            <RotateCw className="h-3.5 w-3.5" /> Try again
                        </Button>
                    )}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss" className="absolute right-2 top-2 h-7 w-7 cursor-pointer text-neutral-500">
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}
