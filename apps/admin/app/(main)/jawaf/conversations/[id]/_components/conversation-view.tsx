"use client"

import { ArrowLeft, MessagesSquare, ThumbsDown, ThumbsUp } from "lucide-react"
import { JAWAF_CHANNEL_LABELS, JAWAF_SCRIPT_LABELS, type JawafScript } from "@repo/boli/jawaf"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { StatusView } from "@repo/ui/components/ui/status-view"
import { cn } from "@repo/ui/lib/utils"
import { ROUTES } from "@/lib/navigation"
import type { ConversationTranscript } from "@/types/jawaf"
import { Field, fmtDate, SectionTitle } from "../../../_components/jawaf-bits"
import { CONVERSATION_TITLE } from "./conversation-skeleton"

const CARD = "min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
const scriptLabel = (s: string | null) => (s && s in JAWAF_SCRIPT_LABELS ? JAWAF_SCRIPT_LABELS[s as JawafScript] : s ?? "-")
const STATUS_WORD: Record<string, string> = { answered: "Answered", not_found: "Not found - contact card shown", credits: "Out of credits", offline: "Model offline", error: "Error" }

export function ConversationView({ t }: { t: ConversationTranscript }) {
    const back = t.prospectId ? { href: `${ROUTES.jawafDemos}?prospect=${encodeURIComponent(t.prospectId)}`, label: t.prospectBusiness ?? "Demo" } : { href: ROUTES.jawafDemos, label: "Demos" }
    const questions = t.messages.filter((m) => m.role === "user").length
    return (
        <Page title={CONVERSATION_TITLE} description={`${t.bot.name} - ${JAWAF_CHANNEL_LABELS[t.channel]} - ${fmtDate(t.startedAt, true)}`} icon={<MessagesSquare />} back={back}>
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <ol className="flex min-w-0 flex-col gap-3">
                    {t.messages.map((m) => (
                        <li key={m.id} className={cn("flex min-w-0 flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                            <div className={cn(
                                "min-w-0 max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm",
                                m.role === "user" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
                            )}>
                                {m.text || <span className="text-neutral-500">(empty)</span>}
                            </div>
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                <span>{fmtDate(m.createdAt, true)}</span>
                                {m.script ? <span>{scriptLabel(m.script)}</span> : null}
                                {m.role === "assistant" && m.status ? <span>{STATUS_WORD[m.status] ?? m.status}</span> : null}
                                {m.latencyMs ? <span>{(m.latencyMs / 1000).toFixed(1)} s</span> : null}
                                {m.rating === 1 ? <span className="inline-flex items-center gap-1"><ThumbsUp className="size-3" /> Helpful</span> : null}
                                {m.rating === -1 ? <span className="inline-flex items-center gap-1"><ThumbsDown className="size-3" /> Not helpful{m.ratingReason ? `: ${m.ratingReason}` : ""}</span> : null}
                            </p>
                            {m.sources.length ? (
                                <ul className="flex min-w-0 max-w-[90%] flex-col gap-1">
                                    {m.sources.map((s) => (
                                        <li key={s.n} className="min-w-0 rounded-xl bg-neutral-50 px-3 py-1.5 text-xs dark:bg-neutral-800/50">
                                            <span className="font-medium text-neutral-800 dark:text-neutral-200">[{s.n}] </span>
                                            {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-boli-sky-ink hover:underline">{s.title}</a> : <span className="text-neutral-800 dark:text-neutral-200">{s.title}</span>}
                                            <span className="text-neutral-500 dark:text-neutral-400"> - {s.kind}</span>
                                            {s.snippet ? <span className="mt-0.5 block line-clamp-2 text-neutral-600 dark:text-neutral-400">{s.snippet}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </li>
                    ))}
                </ol>
                <aside className="flex min-w-0 flex-col gap-3">
                    <section className={CARD}>
                        <SectionTitle>Who we are talking to</SectionTitle>
                        {t.contacts.length ? t.contacts.map((c, i) => (
                            <dl key={i} className="mt-2 flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                                {c.fields.map((f) => <Field key={f.label} label={f.label}>{f.value}</Field>)}
                                <Field label="Left at">{fmtDate(c.createdAt, true)}</Field>
                                {c.notes ? <Field label="Notes">{c.notes}</Field> : null}
                            </dl>
                        )) : <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">The visitor did not leave contact details.</p>}
                    </section>
                    <section className={CARD}>
                        <SectionTitle>Details</SectionTitle>
                        <dl className="mt-2 flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                            <Field label="Bot">{t.bot.name}</Field>
                            <Field label="Channel">{JAWAF_CHANNEL_LABELS[t.channel]}</Field>
                            {t.pageUrl ? <Field label="On page"><span className="break-all">{t.pageUrl}</span></Field> : null}
                            <Field label="Script">{scriptLabel(t.script)}</Field>
                            <Field label="Questions">{questions}</Field>
                            <Field label="Started">{fmtDate(t.startedAt, true)}</Field>
                            <Field label="Last message">{fmtDate(t.lastAt, true)}</Field>
                        </dl>
                    </section>
                </aside>
            </div>
        </Page>
    )
}

/** A customer bot's conversation: the 403, never the text. */
export function PrivateConversation() {
    return (
        <StatusView
            kind="forbidden"
            fullScreen={false}
            title="This conversation is private"
            description="It belongs to a customer's bot. Admins see customer bots as numbers only - never what visitors asked."
            actions={(
                <Button asChild variant="outline" className="cursor-pointer gap-2 rounded-xl">
                    <AppLink href={ROUTES.jawafBots}><ArrowLeft className="h-4 w-4" /> All bots</AppLink>
                </Button>
            )}
        />
    )
}
