'use client'

import { CloudOff, RotateCw, Wallet, X } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { AppLink } from '@repo/ui/components/app-link'
import { cn } from '@repo/ui/lib/utils'
import { ROUTES } from '@/lib/navigation'
import type { ChatNote } from '@/stores/kura-chat.store'
import { READING_MEASURE } from './query-keys'

/**
 * What stands between the person and a reply, drawn as a designed state above the composer - never a raw error.
 * Out of credits: a panel with Add credits. Model offline: a panel with Try again. Anything else: one line, with a
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
                    <AppLink href={note.action?.href ?? ROUTES.billing}>Add credits</AppLink>
                </Button>
                <Button asChild size="sm" variant="ghost" className="cursor-pointer">
                    <AppLink href={ROUTES.usage}>See usage</AppLink>
                </Button>
            </StatePanel>
        )
    }
    if (note.kind === 'offline') {
        return (
            <StatePanel
                tone="neutral"
                icon={<CloudOff className="h-4 w-4" />}
                title="Boli's model is offline right now"
                text="The model server did not answer. Nothing was charged for this. Try again in a few minutes."
                onDismiss={onDismiss}
            >
                {onRetry && (
                    <Button type="button" size="sm" variant="outline" onClick={onRetry} className="cursor-pointer">
                        <RotateCw className="h-3.5 w-3.5" /> Try again
                    </Button>
                )}
            </StatePanel>
        )
    }
    return (
        <div role="status" className={cn('mx-auto flex w-full min-w-0 items-center justify-between gap-3 px-6 pb-2 text-sm text-neutral-700 dark:text-neutral-300', READING_MEASURE)}>
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
        <div className={cn('mx-auto w-full min-w-0 px-3 pb-2', READING_MEASURE)}>
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
