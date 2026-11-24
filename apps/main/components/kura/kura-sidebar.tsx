'use client'

import { Suspense, use, useMemo, useState, type MouseEvent } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { AppLink } from '@repo/ui/components/app-link'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover'
import { ConfirmPopover } from '@repo/ui/components/ui/confirm-popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip'
import { CompactRailButton, compactRailItemClass } from '@repo/ui/components/shell/product-rail'
import { cn } from '@repo/ui/lib/utils'
import { BoliEmpty } from '@/components/empty/boli-empty'
import { deleteConversation, listConversations, renameConversation } from '@/actions/ai/kura-history.action'
import type { ConversationRow } from '@/lib/ai/types'
import { ROUTES } from '@/lib/navigation'
import { nepalDayStart } from '@/lib/platform-display'
import { kuraNewInPlace, kuraOpenInPlace } from './kura-bridge'
import { KURA_HISTORY_KEY } from './query-keys'

/**
 * KURA'S SIDEBAR (the product sidebar in the shell; moved out of Kura's right column, plan/main/jawaf/jawaf-v1.md):
 * New chat, search, then the chat history grouped Today / Yesterday / Earlier (Nepal days, so the server and the
 * browser group alike). Rename in a popover, delete via ConfirmPopover.
 *
 * Rows are links to /kura/<id>; on the Kura page a plain click opens the chat in place (kura-bridge.ts). Seeded by the
 * promise the (main) layout started (never awaited there), under the SAME key every rename / delete / reply
 * invalidates.
 *
 * Collapsed (the sidebar as a 64px icon rail, Sarvam-style), `KuraCompact` replaces it: New chat and a search icon whose
 * popover holds the search and the history; no history list in the rail itself.
 */

/** What the (main) layout starts: the rows and when they were read (0 = the read failed). */
export interface KuraHistorySeed {
    rows: ConversationRow[]
    at: number
}

async function fetchHistory(): Promise<ConversationRow[]> {
    const res = await listConversations()
    if (!res.success) throw new Error(res.error ?? 'History could not be loaded.')
    return res.data
}

function groups(rows: ConversationRow[]) {
    const today = nepalDayStart(0).getTime()
    const yesterday = nepalDayStart(1).getTime()
    const out: { label: string; rows: ConversationRow[] }[] = [
        { label: 'Today', rows: [] },
        { label: 'Yesterday', rows: [] },
        { label: 'Earlier', rows: [] },
    ]
    for (const r of rows) {
        const t = new Date(r.updatedAt).getTime()
        out[t >= today ? 0 : t >= yesterday ? 1 : 2]!.rows.push(r)
    }
    return out.filter((g) => g.rows.length)
}

/** The chat open in Kura, read from the URL (Kura writes /kura/<id> as a chat opens). */
function useCurrentChatId(): string | null {
    const pathname = usePathname() ?? ''
    const m = pathname.match(/^\/kura\/([^/]+)$/)
    return m ? decodeURIComponent(m[1]!) : null
}

const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

export function KuraSidebar({ historyPromise }: { historyPromise: Promise<KuraHistorySeed> }) {
    const [q, setQ] = useState('')
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-col gap-2 px-3 pb-2">
                <Button asChild variant="outline" size="sm" className="w-full cursor-pointer justify-start gap-2">
                    <AppLink
                        href={ROUTES.kura}
                        onClick={(e) => { if (plainClick(e) && kuraNewInPlace()) e.preventDefault() }}
                    >
                        <Plus className="h-3.5 w-3.5" /> New chat
                    </AppLink>
                </Button>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') } }}
                        placeholder="Search chats"
                        aria-label="Search chats"
                        className="h-8 pl-8 text-sm"
                    />
                </div>
            </div>
            <Suspense fallback={<KuraHistorySkeleton />}>
                <HistoryFromPromise promise={historyPromise} q={q} onClear={() => setQ('')} />
            </Suspense>
        </div>
    )
}

function HistoryFromPromise({ promise, q, onClear }: { promise: Promise<KuraHistorySeed>; q: string; onClear: () => void }) {
    const seed = use(promise)
    return <HistoryList seed={seed} q={q} onClear={onClear} />
}

function HistoryList({ seed, q, onClear }: { seed: KuraHistorySeed; q: string; onClear: () => void }) {
    const queryClient = useQueryClient()
    const currentId = useCurrentChatId()
    const { data, isError, refetch } = useQuery({
        queryKey: KURA_HISTORY_KEY,
        queryFn: fetchHistory,
        initialData: seed.rows,
        // The layout read it once, at hard load: older than staleTime, the query refetches on mount.
        initialDataUpdatedAt: seed.at,
    })
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return needle ? data.filter((r) => r.title.toLowerCase().includes(needle)) : data
    }, [data, q])

    const remove = async (id: string) => {
        const res = await deleteConversation(id)
        if (res.success) {
            await queryClient.invalidateQueries({ queryKey: KURA_HISTORY_KEY })
            // The open chat was deleted: start a new one (in place on Kura).
            if (id === currentId && !kuraNewInPlace()) window.history.replaceState(window.history.state, '', ROUTES.kura)
        }
    }

    return (
        <>
            {isError && (
                <p className="shrink-0 px-4 pb-2 text-xs text-neutral-700 dark:text-neutral-300">
                    History could not be refreshed. <Button variant="link" size="sm" className="h-auto cursor-pointer p-0 text-xs" onClick={() => { refetch().catch(() => undefined) }}>Try again</Button>
                </p>
            )}
            <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                <div className="flex min-w-0 flex-col gap-3 px-3 pb-4 pt-1">
                    {filtered.length === 0 && (q.trim() ? (
                        <BoliEmpty
                            kind="search"
                            compact
                            title={`No chats match "${q.trim()}"`}
                            description="Try a shorter word - search looks at chat titles."
                            action={<Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onClear}>Clear search</Button>}
                        />
                    ) : (
                        <BoliEmpty kind="conversations" compact title="No chats yet" description="Ask Kura anything - in Nepali, English or both. Your chats show here." />
                    ))}
                    {groups(filtered).map((g) => (
                        <div key={g.label} className="min-w-0">
                            <p className="px-2.5 pb-1 text-xs font-medium text-neutral-500">{g.label}</p>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                {g.rows.map((r) => <HistoryRow key={r.id} row={r} current={r.id === currentId} onRemove={remove} />)}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </>
    )
}

function HistoryRow({ row, current, onRemove }: { row: ConversationRow; current: boolean; onRemove: (id: string) => Promise<void> }) {
    const queryClient = useQueryClient()
    const [name, setName] = useState(row.title)
    const [renaming, setRenaming] = useState(false)
    const save = async () => {
        const res = await renameConversation(row.id, name)
        if (res.success) {
            setRenaming(false)
            await queryClient.invalidateQueries({ queryKey: KURA_HISTORY_KEY })
        }
    }
    return (
        <div
            className={cn(
                'group flex h-9 min-w-0 items-center gap-0.5 rounded-lg pr-1 transition-colors',
                current ? 'bg-neutral-950/[0.05] dark:bg-white/[0.07]' : 'hover:bg-neutral-950/[0.03] dark:hover:bg-white/[0.04]',
            )}
        >
            <AppLink
                href={ROUTES.kuraConversation(row.id)}
                aria-current={current ? 'page' : undefined}
                onClick={(e) => { if (plainClick(e) && kuraOpenInPlace(row.id)) e.preventDefault() }}
                className={cn(
                    'flex h-full min-w-0 flex-1 cursor-pointer items-center truncate rounded-lg px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                    current ? 'font-medium text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300',
                )}
            >
                <span className="min-w-0 truncate">{row.title || 'Untitled chat'}</span>
            </AppLink>
            <div className="flex shrink-0 items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                <Popover open={renaming} onOpenChange={(o) => { setRenaming(o); if (o) setName(row.title) }}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Rename chat" title="Rename" className="h-7 w-7 cursor-pointer rounded-lg">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="right" className="w-72 space-y-2 p-3">
                        <p className="text-sm font-medium">Rename chat</p>
                        <Input value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save().catch(() => undefined) } }} />
                        <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="ghost" className="cursor-pointer" onClick={() => setRenaming(false)}>Cancel</Button>
                            <Button type="button" size="sm" className="cursor-pointer" disabled={!name.trim()} onClick={() => { save().catch(() => undefined) }}>Save name</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <ConfirmPopover title="Delete this chat?" description="It is removed for good." confirmLabel="Delete chat" onConfirm={() => onRemove(row.id)}>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete chat" title="Delete" className="h-7 w-7 cursor-pointer rounded-lg">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </ConfirmPopover>
            </div>
        </div>
    )
}

/** The history's loading shape: group labels and rows (the New chat + search above it are real at once). */
export function KuraHistorySkeleton() {
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 pt-1">
            <Skeleton className="mx-2.5 mb-1 h-3 w-12 rounded" />
            {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" delay={i * 0.05} />)}
        </div>
    )
}

/**
 * Kura in the COLLAPSED sidebar (the 64px icon rail): New chat, and a search icon that opens the chat history with its
 * search in a popover on the right. Choosing a chat closes the popover (in place on Kura, as the full sidebar).
 */
export function KuraCompact({ historyPromise }: { historyPromise: Promise<KuraHistorySeed> }) {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState('')
    return (
        <>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <AppLink
                        href={ROUTES.kura}
                        aria-label="New chat"
                        className={compactRailItemClass()}
                        onClick={(e) => { if (plainClick(e) && kuraNewInPlace()) e.preventDefault() }}
                    >
                        <Plus />
                    </AppLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">New chat</TooltipContent>
            </Tooltip>
            <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ('') }}>
                <PopoverTrigger asChild>
                    <CompactRailButton icon={<Search />} label="Search chats" />
                </PopoverTrigger>
                <PopoverContent side="right" align="start" sideOffset={8} className="flex w-80 flex-col gap-2 p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                        <Input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') } }}
                            placeholder="Search chats"
                            aria-label="Search chats"
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                    <Suspense fallback={<CompactHistorySkeleton />}>
                        <CompactHistory promise={historyPromise} q={q} onClear={() => setQ('')} onPick={() => setOpen(false)} />
                    </Suspense>
                </PopoverContent>
            </Popover>
        </>
    )
}

function CompactHistory({ promise, q, onClear, onPick }: { promise: Promise<KuraHistorySeed>; q: string; onClear: () => void; onPick: () => void }) {
    const seed = use(promise)
    const currentId = useCurrentChatId()
    const { data, isError, refetch } = useQuery({
        queryKey: KURA_HISTORY_KEY,
        queryFn: fetchHistory,
        initialData: seed.rows,
        initialDataUpdatedAt: seed.at,
    })
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return needle ? data.filter((r) => r.title.toLowerCase().includes(needle)) : data
    }, [data, q])
    return (
        <>
            {isError && (
                <p className="px-2 text-xs text-neutral-700 dark:text-neutral-300">
                    History could not be refreshed. <Button variant="link" size="sm" className="h-auto cursor-pointer p-0 text-xs" onClick={() => { refetch().catch(() => undefined) }}>Try again</Button>
                </p>
            )}
            <ScrollArea orientation="vertical" viewportClassName="max-h-[22rem]">
                <div className="flex min-w-0 flex-col gap-3 pb-1">
                    {filtered.length === 0 && (q.trim() ? (
                        <BoliEmpty
                            kind="search"
                            compact
                            title={`No chats match "${q.trim()}"`}
                            description="Try a shorter word - search looks at chat titles."
                            action={<Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onClear}>Clear search</Button>}
                        />
                    ) : (
                        <BoliEmpty kind="conversations" compact title="No chats yet" description="Ask Kura anything - in Nepali, English or both. Your chats show here." />
                    ))}
                    {groups(filtered).map((g) => (
                        <div key={g.label} className="min-w-0">
                            <p className="px-2.5 pb-1 text-xs font-medium text-neutral-500">{g.label}</p>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                {g.rows.map((r) => {
                                    const current = r.id === currentId
                                    return (
                                        <AppLink
                                            key={r.id}
                                            href={ROUTES.kuraConversation(r.id)}
                                            aria-current={current ? 'page' : undefined}
                                            onClick={(e) => {
                                                if (plainClick(e) && kuraOpenInPlace(r.id)) e.preventDefault()
                                                onPick()
                                            }}
                                            className={cn(
                                                'flex h-9 min-w-0 cursor-pointer items-center rounded-lg px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400',
                                                current
                                                    ? 'bg-neutral-950/[0.05] font-medium text-neutral-900 dark:bg-white/[0.07] dark:text-white'
                                                    : 'text-neutral-700 hover:bg-neutral-950/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.04]',
                                            )}
                                        >
                                            <span className="min-w-0 truncate">{r.title || 'Untitled chat'}</span>
                                        </AppLink>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </>
    )
}

function CompactHistorySkeleton() {
    return (
        <div className="flex flex-col gap-1.5">
            <Skeleton className="mx-2.5 mb-1 h-3 w-12 rounded" />
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" delay={i * 0.05} />)}
        </div>
    )
}
