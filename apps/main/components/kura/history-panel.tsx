'use client'

import { use, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover'
import { ConfirmPopover } from '@repo/ui/components/ui/confirm-popover'
import { cn } from '@repo/ui/lib/utils'
import { deleteConversation, listConversations, renameConversation } from '@/actions/ai/kura.action'
import type { ConversationRow } from '@/lib/ai/types'
import { KURA_HISTORY_KEY } from './query-keys'

/**
 * History: search, sections (Today / Previous 7 days / Older), rename in a popover, delete via ConfirmPopover.
 * Seeded from the server (the promise page.tsx started) under the SAME key the client refetches with.
 */

async function fetchHistory(): Promise<ConversationRow[]> {
    const res = await listConversations()
    if (!res.success) throw new Error(res.error ?? 'History could not be loaded.')
    return res.data
}

function sections(rows: ConversationRow[]) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const week = today - 6 * 24 * 60 * 60 * 1000
    const out: { label: string; rows: ConversationRow[] }[] = [
        { label: 'Today', rows: [] },
        { label: 'Previous 7 days', rows: [] },
        { label: 'Older', rows: [] },
    ]
    for (const r of rows) {
        const t = new Date(r.updatedAt).getTime()
        out[t >= today ? 0 : t >= week ? 1 : 2]!.rows.push(r)
    }
    return out.filter((s) => s.rows.length)
}

export function HistoryFromPromise(props: { promise: Promise<ConversationRow[]>; currentId: string | null; onSelect: (id: string) => void; onDeleted: (id: string) => void }) {
    const initial = use(props.promise)
    return <HistoryPanel initial={initial} currentId={props.currentId} onSelect={props.onSelect} onDeleted={props.onDeleted} />
}

export function HistoryPanel({ initial, currentId, onSelect, onDeleted }: { initial: ConversationRow[]; currentId: string | null; onSelect: (id: string) => void; onDeleted: (id: string) => void }) {
    const queryClient = useQueryClient()
    const { data, isError, refetch } = useQuery({ queryKey: KURA_HISTORY_KEY, queryFn: fetchHistory, initialData: initial })
    const [q, setQ] = useState('')
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return needle ? data.filter((r) => r.title.toLowerCase().includes(needle)) : data
    }, [data, q])

    const remove = async (id: string) => {
        const res = await deleteConversation(id)
        if (res.success) {
            await queryClient.invalidateQueries({ queryKey: KURA_HISTORY_KEY })
            onDeleted(id)
        }
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 p-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') } }}
                        placeholder="Search chats"
                        aria-label="Search chats"
                        className="rounded-xl pl-9"
                    />
                </div>
            </div>
            {isError && (
                <p className="shrink-0 px-3 pb-2 text-xs text-neutral-700 dark:text-neutral-300">
                    History could not be refreshed. <Button variant="link" size="sm" className="h-auto cursor-pointer p-0 text-xs" onClick={() => { refetch().catch(() => undefined) }}>Try again</Button>
                </p>
            )}
            <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                <div className="flex min-w-0 flex-col gap-4 px-3 pb-4">
                    {filtered.length === 0 && (
                        <p className="px-1 text-sm text-neutral-600 dark:text-neutral-400">{q ? 'No chat matches that.' : 'Your chats will show here.'}</p>
                    )}
                    {sections(filtered).map((s) => (
                        <div key={s.label} className="min-w-0">
                            <p className="mb-1 px-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">{s.label}</p>
                            <div className="flex min-w-0 flex-col">
                                {s.rows.map((r) => (
                                    <HistoryRow key={r.id} row={r} current={r.id === currentId} onSelect={onSelect} onRemove={remove} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

function HistoryRow({ row, current, onSelect, onRemove }: { row: ConversationRow; current: boolean; onSelect: (id: string) => void; onRemove: (id: string) => Promise<void> }) {
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
    const time = new Date(row.updatedAt)
    return (
        <div className={cn('group flex min-w-0 items-center gap-1 rounded-lg pr-1 hover:bg-neutral-100 dark:hover:bg-neutral-900', current && 'bg-neutral-100 dark:bg-neutral-900')}>
            <Button
                type="button"
                variant="ghost"
                onClick={() => onSelect(row.id)}
                aria-current={current ? 'true' : undefined}
                className="h-auto min-w-0 flex-1 cursor-pointer justify-start gap-2 px-2 py-2 text-left font-normal hover:bg-transparent"
            >
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{row.title}</span>
                <span suppressHydrationWarning className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400">
                    {time.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </span>
            </Button>
            <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <Popover open={renaming} onOpenChange={(o) => { setRenaming(o); if (o) setName(row.title) }}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Rename" title="Rename" className="h-7 w-7 cursor-pointer rounded-lg">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 space-y-2 p-3">
                        <p className="text-sm font-medium">Rename chat</p>
                        <Input value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save().catch(() => undefined) } }} className="rounded-xl" />
                        <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="ghost" className="cursor-pointer rounded-xl" onClick={() => setRenaming(false)}>Cancel</Button>
                            <Button type="button" size="sm" className="cursor-pointer rounded-xl" disabled={!name.trim()} onClick={() => { save().catch(() => undefined) }}>Save name</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <ConfirmPopover title="Delete this chat?" description="It is removed for good." confirmLabel="Delete chat" onConfirm={() => onRemove(row.id)}>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete" title="Delete" className="h-7 w-7 cursor-pointer rounded-lg">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </ConfirmPopover>
            </div>
        </div>
    )
}

export function HistorySkeleton() {
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-3 w-16 rounded" />
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" delay={i * 0.05} />)}
        </div>
    )
}
