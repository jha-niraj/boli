"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUp, Inbox, MessageSquarePlus, Square, ThumbsDown } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { JAWAF_CHANNEL_LABELS, JAWAF_LIMITS } from "@repo/boli/jawaf"
import { updateJawafBot } from "@/actions/jawaf/bots.action"
import { convertJawafQuestion, listJawafUnanswered } from "@/actions/jawaf/playground.action"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { QaSheet, type QaTarget } from "@/components/jawaf/qa-sheet"
import type { JawafCan } from "@/lib/jawaf/current-bot"
import { formatDateTime } from "@/lib/platform-display"
import type { JawafBot, JawafUnanswered, JawafVisitorScript } from "@/types/jawaf"
import { JAWAF_PAGES } from "../../_components/jawaf-pages"
import { AnswerBubble } from "./answer-bubble"
import { usePlayground, type PlaygroundMsg } from "./use-playground"

/** The two columns' height: the page body (fill) less nothing - both columns end at the same bottom. */
const COLUMN = "flex min-h-0 min-w-0 flex-col"

/**
 * The playground: chat on the left (streamed from POST /api/jawaf/ask, channel playground - always free), the
 * Unanswered and thumbs-down list on the right (a sheet on a phone). "Fix this answer" and "Answer this" open the same
 * right sheet; saving makes a Q&A the bot uses at once.
 */
export function PlaygroundView({ bot, initialUnanswered, can }: { bot: JawafBot; initialUnanswered: JawafUnanswered[]; can: JawafCan }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const markedTry = React.useRef(false)
    const { messages, streaming, send, stop, reset } = usePlayground(bot.id, {
        onAnswered: (a) => {
            queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.unanswered(bot.id) })
            // The setup checklist's "Test in playground" step is done after the first real answer.
            if (a.answered && !markedTry.current && can.edit && ["review", "try"].includes(bot.setupStep)) {
                markedTry.current = true
                updateJawafBot({ botId: bot.id, setupStep: "share" }).then((r) => { if (r.success) router.refresh() }).catch(() => undefined)
            }
        },
    })
    const unanswered = useQuery({
        queryKey: JAWAF_KEYS.unanswered(bot.id),
        queryFn: async () => unwrap(await listJawafUnanswered(bot.id)),
        initialData: initialUnanswered,
    })

    const [draft, setDraft] = React.useState("")
    const [target, setTarget] = React.useState<QaTarget | null>(null)
    const [sheetOpen, setSheetOpen] = React.useState(false)
    const [listOpen, setListOpen] = React.useState(false)
    const [converting, setConverting] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLTextAreaElement>(null)
    const endRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }) }, [messages])

    const submit = async (text = draft) => {
        if (!text.trim() || streaming) return
        if (text === draft) setDraft("")
        await send(text)
        inputRef.current?.focus()
    }

    const openFix = (msg: PlaygroundMsg) => {
        setListOpen(false)
        setTarget({ mode: "fix", question: msg.question ?? "", answer: msg.answer?.answered ? msg.answer.text.replace(/\s*\[\d+\]/g, "") : "", messageId: msg.answer?.messageId ?? null })
        setSheetOpen(true)
    }
    const openAnswer = (u: JawafUnanswered) => {
        setListOpen(false)
        setTarget({ mode: "fix", question: u.question, answer: "", messageId: u.messageId })
        setSheetOpen(true)
    }
    const tryAs = async (msg: PlaygroundMsg, to: JawafVisitorScript) => {
        if (!msg.question || streaming) return
        setConverting(msg.id)
        const r = await convertJawafQuestion({ botId: bot.id, text: msg.question, to })
        setConverting(null)
        if (!r.success) { toast.error(r.error ?? "That question could not be rewritten."); return }
        await send(r.data.text)
    }

    const wide = useWide()
    const list = unanswered.data ?? []
    const copy = JAWAF_PAGES.playground
    const suggestions = bot.suggestedQuestions.slice(0, 4)

    return (
        <Page
            title={copy.title}
            description={copy.description}
            width="full"
            body="fill"
            actions={[
                { key: "new", label: "New chat", icon: <MessageSquarePlus className="h-3.5 w-3.5" />, onClick: () => { reset(); setDraft(""); inputRef.current?.focus() }, variant: "outline", disabled: !messages.length },
                // Below lg the list has no column: it opens in a sheet from here.
                ...(wide ? [] : [{ key: "needs", label: `Needs fixing${list.length ? ` (${list.length})` : ""}`, icon: <Inbox className="h-3.5 w-3.5" />, onClick: () => setListOpen(true), variant: "outline" as const, keepSheetOpen: true }]),
            ]}
        >
            <div className="grid min-h-0 min-w-0 flex-1 gap-3 pb-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
                {/* Chat */}
                <section className={cn(JAWAF_CARD, COLUMN, "overflow-hidden")}>
                    <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                        <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5 px-4 py-5">
                            {!messages.length ? (
                                <div className="flex flex-col items-center gap-3 py-10 text-center">
                                    <p className="text-base font-semibold text-neutral-900 dark:text-white">Ask {bot.name} what your customers ask</p>
                                    <p className="max-w-[48ch] text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                                        Type in Romanized Nepali, Devanagari or English - it answers in the same script. Every reply shows its sources here. Playground answers are free.
                                    </p>
                                    <div className="flex max-w-xl flex-wrap justify-center gap-2 pt-1">
                                        {suggestions.map((s) => (
                                            <Button key={s} type="button" variant="outline" size="sm" className="h-8 max-w-full cursor-pointer text-xs font-normal" onClick={() => submit(s)}>
                                                <span className="truncate">{s}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : messages.map((m) => m.role === "user" ? (
                                <div key={m.id} className="flex w-full min-w-0 justify-end">
                                    <div className="max-w-[85%] min-w-0 whitespace-pre-wrap break-words rounded-2xl bg-neutral-100 px-3.5 py-2 text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">{m.text}</div>
                                </div>
                            ) : (
                                <AnswerBubble key={m.id} msg={m} bot={bot} canFix={can.answer} onFix={openFix} onTryAs={tryAs} converting={converting === m.id} />
                            ))}
                            <div ref={endRef} />
                        </div>
                    </ScrollArea>
                    <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
                        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-3xl border border-neutral-200 bg-white py-1.5 pl-1 pr-1.5 transition-colors focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-600">
                            <Textarea
                                data-no-pill
                                ref={inputRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
                                }}
                                rows={1}
                                maxLength={JAWAF_LIMITS.questionChars}
                                placeholder="Ask like a visitor would - fee kati ho?"
                                aria-label="Question"
                                className="max-h-40 min-h-9 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2 text-sm shadow-none [field-sizing:content] hover:bg-transparent focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                            />
                            {streaming ? (
                                <Button type="button" size="icon-sm" variant="outline" onClick={stop} aria-label="Stop" className="shrink-0 cursor-pointer rounded-full"><Square className="h-3.5 w-3.5" /></Button>
                            ) : (
                                <Button type="button" size="icon-sm" onClick={() => submit()} disabled={!draft.trim()} aria-label="Send" className="shrink-0 cursor-pointer rounded-full"><ArrowUp className="h-4 w-4" /></Button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Unanswered and thumbs-down */}
                <aside className={cn(JAWAF_CARD, COLUMN, "hidden overflow-hidden lg:flex")}>
                    <UnansweredHeader count={list.length} />
                    <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                        <UnansweredList list={list} canFix={can.answer} onAnswer={openAnswer} selectedId={sheetOpen && target?.mode === "fix" ? target.messageId : null} />
                    </ScrollArea>
                </aside>
            </div>

            <Sheet open={listOpen} onOpenChange={setListOpen}>
                <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Needs fixing</SheetTitle>
                        <SheetDescription>Questions it could not answer, and answers visitors marked down.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <UnansweredList list={list} canFix={can.answer} onAnswer={openAnswer} selectedId={null} />
                    </ScrollArea>
                </SheetContent>
            </Sheet>
            <QaSheet botId={bot.id} target={target} open={sheetOpen} onOpenChange={setSheetOpen} onExitComplete={() => setTarget(null)} canEdit={can.answer} />
        </Page>
    )
}

/** True from the lg breakpoint (the right column shows). False on the server and the first client frame. */
function useWide(): boolean {
    return React.useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia("(min-width: 1024px)")
            mq.addEventListener("change", cb)
            return () => mq.removeEventListener("change", cb)
        },
        () => window.matchMedia("(min-width: 1024px)").matches,
        () => false,
    )
}

function UnansweredHeader({ count }: { count: number }) {
    return (
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Needs fixing{count ? ` (${count})` : ""}</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Unanswered questions and thumbs-down answers.</p>
        </div>
    )
}

function UnansweredList({ list, canFix, onAnswer, selectedId }: { list: JawafUnanswered[]; canFix: boolean; onAnswer: (u: JawafUnanswered) => void; selectedId: string | null }) {
    if (!list.length) {
        return <p className="px-4 py-8 text-center text-xs leading-5 text-neutral-600 dark:text-neutral-400">Nothing waiting. Questions your bot could not answer, here or from visitors, land here.</p>
    }
    return (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {list.map((u) => (
                <li key={u.messageId} data-sheet-keep-open className={cn("flex min-w-0 flex-col gap-1.5 px-4 py-3", selectedId === u.messageId && "bg-neutral-50 dark:bg-neutral-800/40")}>
                    <p className="line-clamp-2 text-sm text-neutral-900 dark:text-white">{u.question}</p>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                            {u.disliked ? <ThumbsDown aria-label="Thumbs down" className="mr-1 inline h-3 w-3 align-[-1px]" /> : null}
                            {JAWAF_CHANNEL_LABELS[u.channel]} - {formatDateTime(u.askedAt)}
                        </span>
                        {canFix ? (
                            <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 cursor-pointer text-xs" data-sheet-keep-open onClick={() => onAnswer(u)}>Answer this</Button>
                        ) : null}
                    </div>
                </li>
            ))}
        </ul>
    )
}
