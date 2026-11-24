'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { JawafIcon } from '@repo/brand/product-icons'
import { AppLink } from '@repo/ui/components/app-link'
import { Button } from '@repo/ui/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip'
import { CompactRailButton, compactRailItemClass } from '@repo/ui/components/shell/product-rail'
import { listJawafBotOptions } from '@/actions/jawaf/switcher.action'
import { setCurrentJawafBot } from '@/lib/jawaf/bot-cookie'
import { ROUTES } from '@/lib/navigation'
import { JAWAF_KEYS, JAWAF_ROOT, unwrap } from './keys'

/** One Jawaf bot, as the switcher needs it. */
export interface JawafBotOption {
    id: string
    name: string
}

/**
 * The bot switcher at the top of Jawaf's sidebar. Prop-driven: Wave 2 (plan/main/jawaf/jawaf-v1.md task 7) passes the
 * workspace's bots and what switching does. With no bot yet it is a quiet card that leads to the setup.
 *
 * `compact`: the collapsed sidebar's 64px icon rail (Sarvam-style) - the bot as a round avatar (the Jawaf mark) that opens
 * the same menu to the right; with no bot, a Jawaf icon that leads to the setup. Names in tooltips.
 */
export function JawafBotSwitcher({ bots, currentId, onSwitch, compact = false }: {
    bots: JawafBotOption[]
    currentId: string | null
    onSwitch: (id: string) => void
    compact?: boolean
}) {
    if (bots.length === 0 && compact) {
        return (
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <AppLink href={ROUTES.jawafSetup} aria-label="No bot yet - set up Jawaf" className={compactRailItemClass()}>
                        <span aria-hidden className="flex size-7 items-center justify-center rounded-full border border-dashed border-neutral-300 text-boli-sky-ink dark:border-neutral-700">
                            <JawafIcon className="size-4" />
                        </span>
                    </AppLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">No bot yet - set up Jawaf</TooltipContent>
            </Tooltip>
        )
    }
    if (bots.length === 0) {
        return (
            <AppLink
                href={ROUTES.jawafSetup}
                className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-neutral-300 px-2.5 py-2 outline-none transition-colors hover:bg-neutral-950/[0.03] focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:hover:bg-white/[0.04]"
            >
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-boli-sky-soft text-boli-sky-ink">
                    <JawafIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">No bot yet</span>
                    <span className="block truncate text-xs text-boli-sky-ink">Set up Jawaf</span>
                </span>
            </AppLink>
        )
    }
    const current = bots.find((b) => b.id === currentId) ?? bots[0]!
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                {compact ? (
                    <CompactRailButton
                        label={`Bot - ${current.name}. Switch bot`}
                        hint={current.name}
                        icon={
                            // The same Jawaf mark as the open switcher (owner, 2026-11-25), until the business uploads a logo.
                            <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-boli-sky-soft text-boli-sky-ink">
                                <JawafIcon className="size-4" />
                            </span>
                        }
                    />
                ) : (
                <Button
                    type="button"
                    variant="outline"
                    aria-label={`Bot - ${current.name}. Switch bot`}
                    className="h-10 w-full min-w-0 cursor-pointer justify-start gap-2.5 px-2"
                >
                    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-boli-sky-soft text-boli-sky-ink">
                        <JawafIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{current.name}</span>
                    <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-neutral-500" />
                </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64" {...(compact ? { side: 'right' as const, sideOffset: 8 } : {})}>
                <DropdownMenuLabel className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Bots</DropdownMenuLabel>
                {bots.map((b) => (
                    <DropdownMenuItem key={b.id} className="cursor-pointer gap-2" onSelect={() => { if (b.id !== current.id) onSwitch(b.id) }}>
                        <span className="min-w-0 flex-1 truncate">{b.name}</span>
                        {b.id === current.id ? <Check aria-label="Current bot" className="size-4 shrink-0" /> : null}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <AppLink href={`${ROUTES.jawafSetup}?new=1`}><Plus className="size-4" /> New bot</AppLink>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/**
 * The switcher as the shell mounts it (main-shell.tsx): the workspace's bots from a client query (the layout never
 * waits for them), the current one from the `boli_jawaf_bot` cookie. Switching writes the cookie, drops every cached
 * Jawaf read and refreshes the route, so you stay on the same Jawaf page with the other bot's data.
 */
export function JawafSidebarSwitcher({ compact = false }: { compact?: boolean }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data, isPending } = useQuery({
        queryKey: JAWAF_KEYS.switcher,
        queryFn: async () => unwrap(await listJawafBotOptions(), 'Your bots could not be loaded.'),
    })
    const [optimisticId, setOptimisticId] = React.useState<string | null>(null)
    React.useEffect(() => { setOptimisticId(null) }, [data?.currentId])

    const onSwitch = React.useCallback((id: string) => {
        setOptimisticId(id)
        setCurrentJawafBot(id)
        queryClient.invalidateQueries({ queryKey: JAWAF_ROOT })
        router.refresh()
    }, [queryClient, router])

    if (isPending) return <Skeleton className={compact ? 'size-10 rounded-xl' : 'h-10 w-full rounded-full'} />
    return <JawafBotSwitcher bots={data?.bots ?? []} currentId={optimisticId ?? data?.currentId ?? null} onSwitch={onSwitch} compact={compact} />
}
