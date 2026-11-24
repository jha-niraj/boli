'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { KURA_HEADER_H } from './query-keys'
import { SHELL_SHADOW_RIGHT, SHELL_SURFACE } from '@repo/ui/lib/surfaces'
import { cn } from '@repo/ui/lib/utils'

/**
 * THE RIGHT COLUMN of Kura (wide screens): the tabs Settings | Code | Needs you (History moved to the product sidebar,
 * kura-sidebar.tsx). On a phone the same tabs
 * open in a sheet (kura-page.tsx). The column is square, on the page's own ground (SHELL_SURFACE), separated from the
 * chat by the shell's soft SHADOW, not a hairline.
 * Width: automatic clamp(320, viewport - 1024, 560) until dragged from the left edge; the dragged width is remembered
 * per browser and a double-click on the edge goes back to automatic.
 */

export type SideTab = 'settings' | 'code' | 'needs'

export const SIDE_TABS: { id: SideTab; label: string }[] = [
    { id: 'settings', label: 'Settings' },
    { id: 'code', label: 'Code' },
    { id: 'needs', label: 'Needs you' },
]

const asTab = (v: string): SideTab => SIDE_TABS.find((t) => t.id === v)?.id ?? 'settings'

export type SideBodies = Record<SideTab, ReactNode>

/** The tab strip. Shared by the column and the phone sheet. */
export function SideTabsStrip({ tab, onTab, className }: { tab: SideTab; onTab: (t: SideTab) => void; className?: string }) {
    return (
        <Tabs value={tab} onValueChange={(v) => onTab(asTab(v))} className={cn('min-w-0 flex-1', className)}>
            <TabsList fit size="sm">
                {SIDE_TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
        </Tabs>
    )
}

/** Each view keeps its own scroll and stays mounted, so History keeps its search and Settings its focus. */
export function SideBodiesView({ tab, bodies }: { tab: SideTab; bodies: SideBodies }) {
    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            {SIDE_TABS.map((t) => (
                <div key={t.id} className={cn('flex min-h-0 flex-1 flex-col', tab !== t.id && 'hidden')}>{bodies[t.id]}</div>
            ))}
        </div>
    )
}

const WIDTH_KEY = 'boli.kura.column-width'
const MIN = 320
const MAX = 640
/** The chat keeps at least this much, whatever the column is dragged to. */
const CHAT_MIN = 560

const autoWidth = (viewport: number) => Math.min(560, Math.max(MIN, viewport - 1024))
const fit = (width: number, viewport: number) => Math.round(Math.min(MAX, Math.max(MIN, Math.min(width, viewport - CHAT_MIN))))

function useSideColumnWidth() {
    const [viewport, setViewport] = useState(1440)
    const [dragged, setDragged] = useState<number | null>(null)
    useEffect(() => {
        try {
            const n = Number(window.localStorage.getItem(WIDTH_KEY) ?? NaN)
            if (Number.isFinite(n) && n > 0) setDragged(n)
        } catch { /* storage blocked: automatic width */ }
        const onResize = () => setViewport(window.innerWidth)
        onResize()
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])
    const set = useCallback((next: number | null) => {
        setDragged(next)
        try {
            if (next === null) window.localStorage.removeItem(WIDTH_KEY)
            else window.localStorage.setItem(WIDTH_KEY, String(Math.round(next)))
        } catch { /* not remembered */ }
    }, [])
    return { width: fit(dragged ?? autoWidth(viewport), viewport), viewport, setWidth: set }
}

export function SideColumn({
    open, tab, onTab, onClose, bodies, headerHeight,
}: {
    open: boolean
    tab: SideTab
    onTab: (tab: SideTab) => void
    onClose: () => void
    bodies: SideBodies
    /** The chat header's height, measured, so the column header ends on the same line. */
    headerHeight?: number
}) {
    const reduced = useReducedMotion()
    const { width, viewport, setWidth } = useSideColumnWidth()
    const [dragging, setDragging] = useState(false)
    const start = useRef<{ x: number; w: number } | null>(null)

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, w: width }
        setDragging(true)
    }
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!start.current) return
        // Only while the button is held: a lost pointerup must not leave the edge following the mouse.
        if ((e.buttons & 1) === 0) { start.current = null; setDragging(false); return }
        setWidth(fit(start.current.w + (start.current.x - e.clientX), viewport))
    }
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
        start.current = null
        setDragging(false)
    }
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setWidth(fit(width + 24, viewport)) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setWidth(fit(width - 24, viewport)) }
    }

    return (
        <AnimatePresence initial={false}>
            {open && (
                <motion.div
                    key="side-column"
                    // The shadow sits on THIS box: it clips its own children (the width animation), which would cut a
                    // shadow cast by the aside inside it - and on one shared ground the shadow is the only separation.
                    className={cn('relative z-10 flex h-full min-h-0 shrink-0 overflow-hidden', SHELL_SHADOW_RIGHT)}
                    initial={{ width: 0 }}
                    animate={{ width }}
                    exit={{ width: 0 }}
                    transition={dragging || reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 42 }}
                >
                    <aside
                        aria-label={SIDE_TABS.find((t) => t.id === tab)?.label ?? 'Side column'}
                        style={{ width }}
                        className={cn('relative flex h-full min-h-0 shrink-0 flex-col', SHELL_SURFACE)}
                        data-sheet-keep-open
                    >
                        <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize the side column"
                            aria-valuemin={MIN}
                            aria-valuemax={MAX}
                            aria-valuenow={width}
                            tabIndex={0}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onDoubleClick={() => { start.current = null; setDragging(false); setWidth(null) }}
                            onKeyDown={onKeyDown}
                            className="group absolute inset-y-0 left-0 z-20 w-2 cursor-col-resize outline-none"
                        >
                            <span className={cn('absolute inset-y-0 left-0 w-0.5 bg-transparent transition-colors group-hover:bg-neutral-300 group-focus-visible:bg-neutral-500 dark:group-hover:bg-neutral-700', dragging && 'bg-neutral-500 dark:bg-neutral-400')} />
                        </div>

                        <div
                            style={{ height: headerHeight ?? KURA_HEADER_H }}
                            className="flex shrink-0 items-center gap-1 border-b border-neutral-200 px-3 dark:border-neutral-800"
                        >
                            <SideTabsStrip tab={tab} onTab={onTab} />
                            <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close side column" title="Close side column" className="h-8 w-8 shrink-0 cursor-pointer text-neutral-600 dark:text-neutral-400">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <SideBodiesView tab={tab} bodies={bodies} />
                    </aside>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
