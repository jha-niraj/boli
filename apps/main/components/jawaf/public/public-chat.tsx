"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ExternalLink, FileText, Info, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import type { JawafAnswerSource } from "@/types/jawaf"
import type { JawafPublicBot, JawafPublicFrame, JawafPublicMessage, JawafPublicRestore } from "@/types/jawaf-public"
import { AnswerText } from "./answer-text"
import { JawafComposer } from "./composer"
import { ContactCard, ReachUsCard } from "./contact-card"
import { BusinessLogo } from "./logo"

/**
 * The chat on /j/<slug> (left) and the business card (right; a phone folds it into the About sheet). Questions go to
 * /j/<slug>/api/ask as NDJSON; the reply arrives whole (`final`) - drafts are not shown to visitors (the guards may
 * still remove a sentence). Not-found replies get the contact card, "credits" the reach-us card (the word credits is
 * never shown), answered replies their source chips (when the owner shows them) and thumbs up / down.
 *
 * The visitor's conversation comes back on return (HttpOnly cookie, 30 days, this business only); Start over clears it.
 */

type Pending = { question: string } | null

async function readFrames(body: ReadableStream<Uint8Array>, onFrame: (f: JawafPublicFrame) => void): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buf = ""
    const flush = (line: string) => {
        const t = line.trim()
        if (!t) return
        try {
            const f = JSON.parse(t) as JawafPublicFrame
            if (f && typeof f === "object" && "t" in f) onFrame(f)
        } catch { /* a broken line is skipped */ }
    }
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let nl = buf.indexOf("\n")
        while (nl !== -1) {
            flush(buf.slice(0, nl))
            buf = buf.slice(nl + 1)
            nl = buf.indexOf("\n")
        }
    }
    flush(buf + decoder.decode())
}

function SourceChips({ sources }: { sources: JawafAnswerSource[] }) {
    if (!sources.length) return null
    return (
        <div className="flex min-w-0 flex-wrap gap-1.5">
            {sources.map((s) => {
                const label = s.url ? s.title || s.url.replace(/^https?:\/\/(www\.)?/, "") : s.title || s.fileName || "Business facts"
                const inner = (
                    <>
                        <span className="font-mono text-neutral-500">{s.n}</span>
                        <span className="min-w-0 truncate">{label}</span>
                        {s.url ? <ExternalLink aria-hidden className="size-3 shrink-0 text-neutral-500" /> : <FileText aria-hidden className="size-3 shrink-0 text-neutral-500" />}
                    </>
                )
                const cls = "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                return s.url ? (
                    <a key={s.n} href={s.url} target="_blank" rel="noopener noreferrer nofollow" title={s.snippet || s.title} className={cn(cls, "max-w-[16rem] cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700")}>
                        {inner}
                    </a>
                ) : (
                    <span key={s.n} title={s.snippet || s.title} className={cn(cls, "max-w-[16rem]")}>
                        {inner}
                    </span>
                )
            })}
        </div>
    )
}

function Typing({ name }: { name: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400" aria-live="polite">
            <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
            </span>
            Looking through {name}&apos;s information...
        </div>
    )
}

function BotRow({ bot, children }: { bot: JawafPublicBot; children: ReactNode }) {
    return (
        <div className="flex min-w-0 items-start gap-2.5">
            <BusinessLogo bot={bot} size={28} className="mt-0.5 !rounded-full" />
            <div className="flex min-w-0 max-w-[min(36rem,100%)] flex-1 flex-col gap-2">{children}</div>
        </div>
    )
}

const BUBBLE = "w-fit max-w-full rounded-2xl rounded-tl-md border border-neutral-200 bg-white px-3.5 py-2.5 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"

export function PublicChat({ bot, restore, src, card }: { bot: JawafPublicBot; restore: JawafPublicRestore; src: "link" | "qr"; card: ReactNode }) {
    const base = `/j/${bot.slug}/api`
    const [messages, setMessages] = useState<JawafPublicMessage[]>(restore.messages)
    const [conversationId, setConversationId] = useState<string | null>(restore.conversationId)
    const [contactSaved, setContactSaved] = useState(restore.contactSaved)
    const [pending, setPending] = useState<Pending>(null)
    const [draft, setDraft] = useState("")
    const [about, setAbout] = useState(false)
    const viewport = useRef<HTMLDivElement | null>(null)
    const end = useRef<HTMLDivElement | null>(null)
    const composer = useRef<HTMLTextAreaElement | null>(null)
    const first = useRef(true)

    // Returning visitor: open at the latest message inside the chat box (desktop), without moving the page.
    useEffect(() => {
        const v = viewport.current
        if (v && v.scrollHeight > v.clientHeight) v.scrollTop = v.scrollHeight
    }, [])
    useEffect(() => {
        if (first.current) {
            first.current = false
            return
        }
        end.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    }, [messages.length, pending])

    const send = async (raw: string) => {
        const question = raw.trim()
        if (!question || pending) return
        const userMsg: JawafPublicMessage = { id: `local-${Date.now()}`, role: "user", text: question, sources: [], kind: null, script: null, rating: null, createdAt: new Date().toISOString() }
        setMessages((m) => [...m, userMsg])
        setDraft("")
        setPending({ question })
        const fail = (text: string) => {
            setMessages((m) => [...m, { id: `local-e-${Date.now()}`, role: "assistant", text, sources: [], kind: "error", script: null, rating: null, createdAt: new Date().toISOString() }])
        }
        try {
            const res = await fetch(`${base}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, message: question, src }),
            })
            if (!res.ok || !res.body) {
                const json = (await res.json().catch(() => null)) as { error?: string } | null
                fail(json?.error || "We could not answer just now. Try again in a moment.")
                return
            }
            let got = false
            await readFrames(res.body, (f) => {
                if (f.t === "meta") setConversationId(f.conversationId)
                else if (f.t === "final") {
                    got = true
                    if (f.conversationId) setConversationId(f.conversationId)
                    setMessages((m) => [...m, f.message])
                } else if (f.t === "error") {
                    got = true
                    fail(f.message)
                }
            })
            if (!got) fail("We could not answer just now. Try again in a moment.")
        } catch {
            fail("The connection dropped. Check your internet and try again.")
        } finally {
            setPending(null)
        }
    }

    const rate = async (m: JawafPublicMessage, value: 1 | -1) => {
        const next = m.rating === value ? 0 : value
        const before = m.rating
        setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, rating: next === 0 ? null : next } : x)))
        try {
            const res = await fetch(`${base}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id, rating: next }) })
            if (!res.ok) throw new Error()
        } catch {
            setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, rating: before } : x)))
            toast.error("Your rating could not be saved. Try again.")
        }
    }

    const startOver = async () => {
        try {
            await fetch(`${base}/reset`, { method: "POST" })
        } catch { /* the cookie expires on its own; the screen still clears */ }
        setMessages([])
        setConversationId(null)
        setContactSaved(false)
        setDraft("")
        composer.current?.focus()
    }

    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
    const questionBefore = (id: string) => {
        const i = messages.findIndex((m) => m.id === id)
        return [...messages.slice(0, i)].reverse().find((m) => m.role === "user")?.text ?? ""
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.text ?? ""

    const renderAssistant = (m: JawafPublicMessage) => {
        const isLatest = lastAssistant?.id === m.id
        if (m.kind === "credits") {
            return (
                <BotRow key={m.id} bot={bot}>
                    <ReachUsCard business={bot.name} card={bot.card} title="Please contact us directly" line={`We cannot answer here right now - ${bot.name} will be glad to help you directly.`} />
                </BotRow>
            )
        }
        if (m.kind === "offline" || m.kind === "error") {
            return (
                <BotRow key={m.id} bot={bot}>
                    <div className={BUBBLE}>
                        <p className="text-sm leading-6">{m.kind === "offline" ? "We could not answer just now. Try again in a moment." : m.text || "We could not answer just now. Try again in a moment."}</p>
                    </div>
                    {isLatest && !pending ? (
                        <Button type="button" variant="outline" size="sm" className="w-fit cursor-pointer gap-1.5" onClick={() => void send(questionBefore(m.id) || lastUser)}>
                            <RotateCcw aria-hidden className="size-3.5" /> Try again
                        </Button>
                    ) : null}
                </BotRow>
            )
        }
        return (
            <BotRow key={m.id} bot={bot}>
                <div className={BUBBLE}>
                    <AnswerText text={m.text} sources={m.sources} />
                </div>
                {m.kind === "answered" ? (
                    <>
                        <SourceChips sources={m.sources} />
                        {m.id.startsWith("local-") ? null : (
                            <div className="flex items-center gap-0.5">
                                <Button type="button" variant="ghost" size="icon-sm" aria-label="Helpful" aria-pressed={m.rating === 1} onClick={() => void rate(m, 1)} className={cn("cursor-pointer rounded-full text-neutral-500", m.rating === 1 && "text-neutral-900 dark:text-neutral-100")}>
                                    <ThumbsUp aria-hidden className={cn("size-3.5", m.rating === 1 && "fill-current")} />
                                </Button>
                                <Button type="button" variant="ghost" size="icon-sm" aria-label="Not helpful" aria-pressed={m.rating === -1} onClick={() => void rate(m, -1)} className={cn("cursor-pointer rounded-full text-neutral-500", m.rating === -1 && "text-neutral-900 dark:text-neutral-100")}>
                                    <ThumbsDown aria-hidden className={cn("size-3.5", m.rating === -1 && "fill-current")} />
                                </Button>
                                {m.rating === -1 ? <span className="pl-1 text-xs text-neutral-600 dark:text-neutral-400">Thanks - we will let {bot.name} know.</span> : null}
                            </div>
                        )}
                    </>
                ) : null}
                {m.kind === "not_found" && isLatest ? (
                    <ContactCard
                        fields={bot.contactFields}
                        business={bot.name}
                        endpoint={`${base}/contact`}
                        conversationId={conversationId}
                        src={src}
                        interest={questionBefore(m.id)}
                        saved={contactSaved}
                        onSaved={() => setContactSaved(true)}
                    />
                ) : null}
            </BotRow>
        )
    }

    return (
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pb-4 pt-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:pb-8">
            <section aria-label={`Ask ${bot.name}`} className="flex min-w-0 flex-col rounded-3xl border border-neutral-200 bg-boli-ground/60 lg:sticky lg:top-4 lg:h-[min(48rem,calc(100dvh-2rem))] lg:bg-white/70 dark:border-neutral-800 dark:bg-neutral-950/40">
                <div className="flex min-w-0 items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">Ask {bot.name} anything</h2>
                        <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">In Nepali, Romanized Nepali or English</p>
                    </div>
                    {messages.length ? (
                        <ConfirmPopover title="Start a new conversation?" description="This clears the chat on this device." confirmLabel="Start over" destructive={false} onConfirm={startOver}>
                            <Button type="button" variant="ghost" size="sm" className="shrink-0 cursor-pointer gap-1.5 text-neutral-700 dark:text-neutral-300">
                                <RotateCcw aria-hidden className="size-3.5" /> Start over
                            </Button>
                        </ConfirmPopover>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" className="shrink-0 cursor-pointer gap-1.5 lg:hidden" onClick={() => setAbout(true)} data-sheet-keep-open>
                        <Info aria-hidden className="size-3.5" /> About
                    </Button>
                </div>

                <ScrollArea orientation="vertical" viewportRef={viewport} className="lg:min-h-0 lg:flex-1">
                    <div className="flex min-w-0 flex-col gap-4 px-4 py-4">
                        <BotRow bot={bot}>
                            <div className={BUBBLE}>
                                <p className="text-sm leading-6">{bot.greeting}</p>
                            </div>
                            {!messages.length && bot.suggested.length ? (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {bot.suggested.map((q) => (
                                        <Button
                                            key={q}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void send(q)}
                                            disabled={!!pending}
                                            className="h-auto min-h-9 max-w-full cursor-pointer whitespace-normal border-neutral-200 bg-white py-1.5 text-left text-sm font-normal text-neutral-800 hover:border-neutral-300 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                                        >
                                            {q}
                                        </Button>
                                    ))}
                                </div>
                            ) : null}
                        </BotRow>
                        {messages.map((m) =>
                            m.role === "user" ? (
                                <div key={m.id} className="flex justify-end">
                                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-[var(--jawaf-accent)] px-3.5 py-2.5 text-sm leading-6 text-[var(--jawaf-accent-ink)]">{m.text}</p>
                                </div>
                            ) : (
                                renderAssistant(m)
                            ),
                        )}
                        {pending ? (
                            <BotRow bot={bot}>
                                <div className={BUBBLE}>
                                    <Typing name={bot.name} />
                                </div>
                            </BotRow>
                        ) : null}
                        <div ref={end} className="h-px" />
                    </div>
                </ScrollArea>

                <div className="sticky bottom-0 z-10 rounded-b-3xl bg-boli-ground/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:static lg:bg-transparent lg:pb-3 lg:backdrop-blur-none dark:bg-[#121314]/95 lg:dark:bg-transparent">
                    <JawafComposer ref={composer} value={draft} onChange={setDraft} onSend={() => void send(draft)} busy={!!pending} speechEndpoint={`${base}/speech`} />
                </div>
            </section>

            <aside aria-label={`About ${bot.name}`} className="hidden min-w-0 lg:block">
                {card}
            </aside>

            <Sheet open={about} onOpenChange={setAbout}>
                <SheetContent side="right" className="flex w-full flex-col gap-3 bg-boli-ground p-4 dark:bg-[#121314]" resizable={false}>
                    <SheetHeader className="pr-8 text-left">
                        <SheetTitle>About {bot.name}</SheetTitle>
                        <SheetDescription>Contact, hours and where to find us</SheetDescription>
                    </SheetHeader>
                    <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                        {card}
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    )
}
