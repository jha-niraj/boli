'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { History, PanelRight, SlidersHorizontal, SquarePen } from 'lucide-react'
import { Page, type PageAction } from '@repo/ui/components/ui/page'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@repo/ui/components/ui/sheet'
import { cn } from '@repo/ui/lib/utils'
import { KURA } from '@/lib/boli'
import { ROUTES } from '@/lib/navigation'
import type { ConversationRow, ConversationView, NeedsYouList } from '@/lib/ai/types'
import { useKuraChat } from '@/stores/kura-chat.store'
import { ChatFrame } from './chat-frame'
import { KuraWelcome } from './kura-welcome'
import { ChatMessage } from './chat-message'
import { ChatComposer } from './chat-composer'
import { KuraNote } from './kura-states'
import { SettingsPanel } from './settings-panel'
import { CodePanel } from './code-panel'
import { SideBodiesView, SideColumn, SideTabsStrip, type SideBodies, type SideTab } from './side-column'
import { HistoryFromPromise, HistorySkeleton } from './history-panel'
import { NeedsYouFromPromise, NeedsYouSkeleton } from './needs-you'
import { TranscriptSkeleton } from './kura-skeleton'
import { CHAT_COLUMN, CHAT_COLUMN_STYLE, READING_MEASURE } from './query-keys'
import { useKuraSend } from './use-kura-send'
import { useKuraSettings } from './use-kura-settings'

/**
 * KURA - Boli's chat on our own open model, the landing after sign-in. One screen:
 *
 *   wide (lg+):  [ chat column: header, frame, welcome | transcript, note, composer ][ right column ]
 *   below lg:    the chat alone; the right column's tabs open in a sheet
 *
 * The right column holds the tabs Settings | Code | History | Needs you. Every message goes through the ONE `send`
 * (use-kura-chat.ts) with the conversation's current settings; the Think pill in the composer is `settings.think`.
 */

const COLUMN_OPEN_KEY = 'boli.kura.column-open'

function useIsWide(): boolean {
    const [wide, setWide] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const on = () => setWide(mq.matches)
        on()
        mq.addEventListener('change', on)
        return () => mq.removeEventListener('change', on)
    }, [])
    return wide
}

export function KuraPage({
    initialConversation,
    historyPromise,
    needsYouPromise,
}: {
    initialConversation: ConversationView | null
    historyPromise: Promise<ConversationRow[]>
    needsYouPromise: Promise<NeedsYouList>
}) {
    const isWide = useIsWide()
    const { send, stop, newChat, openConversation } = useKuraSend()
    const { settings, update } = useKuraSettings()

    // ── Store, seeded once per arrival (the page component is the only writer of the initial state). ──
    const [ready, setReady] = useState(false)
    useEffect(() => {
        const st = useKuraChat.getState()
        if (initialConversation) st.load(initialConversation)
        else {
            st.reset()
            // A chat URL whose chat is gone (deleted, or another account's) becomes a new chat at /kura.
            if (window.location.pathname !== ROUTES.kura) window.history.replaceState(window.history.state, '', ROUTES.kura)
        }
        setReady(true)
        // Only on arrival: later changes come from this page itself.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const storeMessages = useKuraChat((s) => s.messages)
    const storeConversationId = useKuraChat((s) => s.conversationId)
    const storeTitle = useKuraChat((s) => s.title)
    const status = useKuraChat((s) => s.status)
    const note = useKuraChat((s) => s.note)
    const loadingConversation = useKuraChat((s) => s.loadingConversation)
    const messages = ready ? storeMessages : initialConversation?.messages ?? []
    const conversationId = ready ? storeConversationId : initialConversation?.id ?? null
    const title = (ready ? storeTitle : initialConversation?.title) || KURA.name
    const think = ready ? settings.think : initialConversation?.settings.think ?? false
    const streaming = status === 'streaming'
    const showWelcome = !loadingConversation && messages.length === 0 && !conversationId

    // ── Composer ──
    const [draft, setDraft] = useState('')
    const composerRef = useRef<HTMLTextAreaElement | null>(null)
    /** Send, and put the text back in the box if it got no answer (out of credits, model offline). */
    const sendText = useCallback((text: string) => {
        send(text)
            .then((ok) => {
                if (!ok && useKuraChat.getState().note?.retry === text) setDraft((d) => d || text)
            })
            .catch(() => undefined)
    }, [send])
    const submit = useCallback(() => {
        const text = draft.trim()
        if (!text || useKuraChat.getState().status === 'streaming') return
        setDraft('')
        sendText(text)
    }, [draft, sendText])
    const seed = useCallback((text: string) => {
        setDraft(text)
        requestAnimationFrame(() => {
            const el = composerRef.current
            if (el) { el.focus(); el.setSelectionRange(text.length, text.length) }
        })
    }, [])
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); composerRef.current?.focus() }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])
    const retry = useCallback(() => {
        const text = useKuraChat.getState().note?.retry
        if (!text) return
        useKuraChat.getState().setNote(null)
        setDraft((d) => (d.trim() === text.trim() ? '' : d))
        sendText(text)
    }, [sendText])

    // ── Transcript scroll: follow the reply while the reader is near the bottom. ──
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const nearBottom = useRef(true)
    useEffect(() => {
        const el = viewportRef.current
        if (!el) return
        const onScroll = () => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120 }
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [])
    useEffect(() => {
        const el = viewportRef.current
        if (el && nearBottom.current) el.scrollTo({ top: el.scrollHeight })
    }, [messages])

    // ── Right column (wide only - a remembered "open" must never throw a sheet over a phone). ──
    const [columnOpen, setColumnOpen] = useState(true)
    const [tab, setTab] = useState<SideTab>('settings')
    useEffect(() => {
        if (!isWide) return
        try { if (window.localStorage.getItem(COLUMN_OPEN_KEY) === '0') setColumnOpen(false) } catch { /* default open */ }
    }, [isWide])
    const setColumn = useCallback((open: boolean) => {
        setColumnOpen(open)
        try { window.localStorage.setItem(COLUMN_OPEN_KEY, open ? '1' : '0') } catch { /* not remembered */ }
    }, [])

    // ── Header height, measured, so the column's header rule meets the chat's frame rule. ──
    const rowRef = useRef<HTMLDivElement | null>(null)
    const bodyRef = useRef<HTMLDivElement | null>(null)
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined)
    useLayoutEffect(() => {
        const row = rowRef.current
        const body = bodyRef.current
        if (!row || !body) return
        const measure = () => setHeaderHeight(body.getBoundingClientRect().top - row.getBoundingClientRect().top)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(row)
        ro.observe(body)
        return () => ro.disconnect()
    }, [isWide])

    // ── Phone: the same tabs in one sheet. ──
    const [sheetOpen, setSheetOpen] = useState(false)
    const showTab = useCallback((t: SideTab) => {
        setTab(t)
        if (isWide) setColumn(true)
        else setSheetOpen(true)
    }, [isWide, setColumn])

    const selectConversation = useCallback((id: string) => {
        setSheetOpen(false)
        openConversation(id).catch(() => undefined)
    }, [openConversation])
    const onDeleted = useCallback((id: string) => {
        if (useKuraChat.getState().conversationId === id) newChat()
    }, [newChat])
    const startNew = useCallback(() => {
        newChat()
        setDraft('')
        requestAnimationFrame(() => composerRef.current?.focus())
    }, [newChat])

    const actions: PageAction[] = isWide
        ? [
            { key: 'side', label: columnOpen ? 'Hide side panel' : 'Show side panel', icon: <PanelRight className="h-4 w-4" />, variant: 'ghost', onClick: () => setColumn(!columnOpen) },
            { key: 'history', label: 'History', icon: <History className="h-4 w-4" />, variant: 'ghost', onClick: () => showTab('history') },
            { key: 'new', label: 'New chat', icon: <SquarePen className="h-4 w-4" />, primary: true, variant: 'outline', onClick: startNew },
        ]
        : [
            { key: 'settings', label: 'Settings and code', icon: <SlidersHorizontal className="h-4 w-4" />, variant: 'ghost', onClick: () => showTab('settings') },
            { key: 'history', label: 'History', icon: <History className="h-4 w-4" />, variant: 'ghost', onClick: () => showTab('history') },
            { key: 'new', label: 'New chat', icon: <SquarePen className="h-4 w-4" />, primary: true, variant: 'outline', onClick: startNew },
        ]

    const bodies: SideBodies = {
        settings: <SettingsPanel />,
        code: <CodePanel draft={draft} />,
        history: (
            <Suspense fallback={<HistorySkeleton />}>
                <HistoryFromPromise promise={historyPromise} currentId={conversationId} onSelect={selectConversation} onDeleted={onDeleted} />
            </Suspense>
        ),
        needs: (
            <Suspense fallback={<NeedsYouSkeleton />}>
                <NeedsYouFromPromise promise={needsYouPromise} />
            </Suspense>
        ),
    }

    return (
        <>
            <div ref={rowRef} className="flex h-[var(--app-page-h)] min-h-0 w-full min-w-0 overflow-hidden">
                <div className={cn(CHAT_COLUMN, 'relative')} style={CHAT_COLUMN_STYLE}>
                    {isWide && <ChatFrame ruleTop={headerHeight} />}
                    <Page title={title} actions={actions} bleed body="fill" bodyClassName="gap-0" className="[&>[data-page-header]]:px-4">
                        <div ref={bodyRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                            <ScrollArea orientation="vertical" className="min-h-0 min-w-0 flex-1" viewportRef={viewportRef}>
                                {showWelcome ? (
                                    <KuraWelcome busy={streaming} onPrompt={sendText} onSeed={seed} />
                                ) : loadingConversation ? (
                                    <TranscriptSkeleton />
                                ) : (
                                    <div className={cn('mx-auto flex w-full min-w-0 flex-col gap-5 px-3 py-6 sm:px-6', READING_MEASURE)}>
                                        {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
                                    </div>
                                )}
                            </ScrollArea>
                            {note && <KuraNote note={note} onRetry={note.retry ? retry : undefined} onDismiss={() => useKuraChat.getState().setNote(null)} />}
                            <ChatComposer
                                ref={composerRef}
                                value={draft}
                                onChange={setDraft}
                                onSend={submit}
                                onStop={stop}
                                streaming={streaming}
                                think={think}
                                onThink={(on) => update({ think: on })}
                            />
                        </div>
                    </Page>
                </div>

                {isWide && (
                    <SideColumn
                        open={columnOpen}
                        tab={tab}
                        onTab={setTab}
                        onClose={() => setColumn(false)}
                        bodies={bodies}
                        headerHeight={headerHeight}
                    />
                )}
            </div>

            {!isWide && (
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetContent side="right" resizable={false} className="flex h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-md">
                        <SheetTitle className="sr-only">Kura side panel</SheetTitle>
                        <SheetDescription className="sr-only">Settings, code, history and what needs you</SheetDescription>
                        <div className="flex min-h-12 shrink-0 items-center border-b border-neutral-200 px-3 pr-12 dark:border-neutral-800">
                            <SideTabsStrip tab={tab} onTab={setTab} />
                        </div>
                        <SideBodiesView tab={tab} bodies={bodies} />
                    </SheetContent>
                </Sheet>
            )}
        </>
    )
}
