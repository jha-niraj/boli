"use client"

import * as React from "react"
import { AlertCircle, ExternalLink, Languages, PenLine, Phone } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu"
import { Input } from "@repo/ui/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { BoliAvatar } from "@repo/brand/boli-mark"
import { SpinnerDots } from "@repo/brand/loaders/spinners"
import { JAWAF_SCRIPT_LABELS } from "@repo/boli/jawaf"
import { StateBadge } from "@/components/jawaf/state-badge"
import type { JawafAnswerSource, JawafBot, JawafOriginKind, JawafVisitorScript } from "@/types/jawaf"
import type { PlaygroundMsg } from "./use-playground"

const KIND_LABEL: Record<JawafOriginKind, string> = { page: "Web page", file: "File", qa: "Q&A", note: "Note", fact: "Your facts" }
const BUILTIN_LABEL: Record<string, string> = { name: "Your name", phone: "Phone number", email: "Email", preferredTime: "Best time to call" }

/** One [n] citation: a small sky chip; pressing it shows where the answer came from. */
function SourceChip({ source }: { source: JawafAnswerSource }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Source ${source.n}: ${source.title}`}
                    className="mx-0.5 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full bg-boli-sky-soft px-1.5 align-baseline text-xs font-medium text-boli-sky-ink hover:bg-boli-sky-soft hover:brightness-95"
                >
                    {source.n}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
                <SourceDetail source={source} />
            </PopoverContent>
        </Popover>
    )
}

function SourceDetail({ source }: { source: JawafAnswerSource }) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{KIND_LABEL[source.kind]}</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{source.title || source.fileName || "Source"}</p>
            {source.snippet ? <p className="line-clamp-6 text-xs leading-5 text-neutral-700 dark:text-neutral-300">{source.snippet}</p> : null}
            {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 text-xs text-boli-sky-ink underline-offset-4 hover:underline">
                    <span className="truncate">{source.url}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
            ) : null}
        </div>
    )
}

/** The reply text with each [n] turned into a chip that maps to a real source; anything else stays as typed. */
function CitedText({ text, sources }: { text: string; sources: JawafAnswerSource[] }) {
    const parts = text.split(/(\[\d+\])/g)
    return (
        <p className="whitespace-pre-wrap break-words leading-relaxed">
            {parts.map((p, i) => {
                const m = /^\[(\d+)\]$/.exec(p)
                const src = m ? sources.find((s) => s.n === Number(m[1])) : undefined
                return src ? <SourceChip key={i} source={src} /> : <React.Fragment key={i}>{p}</React.Fragment>
            })}
        </p>
    )
}

/** What a visitor sees under a not-found reply: the contact card with the fields this bot asks for. A preview only. */
function ContactCardPreview({ bot }: { bot: JawafBot }) {
    const fields = [
        ...Object.entries(bot.contactFields.builtIn).filter(([k, f]) => f.enabled && k !== "interest").map(([k, f]) => ({ id: k, label: BUILTIN_LABEL[k] ?? k, required: f.required })),
        ...bot.contactFields.custom.map((c) => ({ id: c.id, label: c.label, required: c.required })),
    ]
    return (
        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white"><Phone className="h-3.5 w-3.5" /> Leave your details - {bot.name} will call you</p>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                    <Input key={f.id} disabled placeholder={`${f.label}${f.required ? "" : " (optional)"}`} aria-label={f.label} className="h-9 text-sm" />
                ))}
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">This is what visitors see. Change the fields in Settings - Contact fields.</p>
        </div>
    )
}

/**
 * One assistant reply in the playground: the cited text, the script it answered in, the sources (always shown here),
 * the contact card when nothing was found, and the two owner tools - Fix this answer and Try as visitor.
 */
export function AnswerBubble({ msg, bot, canFix, onFix, onTryAs, converting }: {
    msg: PlaygroundMsg
    bot: JawafBot
    canFix: boolean
    onFix: (msg: PlaygroundMsg) => void
    onTryAs: (msg: PlaygroundMsg, to: JawafVisitorScript) => void
    converting: boolean
}) {
    const a = msg.answer
    const notFound = a?.status === "not_found"
    return (
        <div className="flex w-full min-w-0 items-start gap-3">
            <BoliAvatar size={28} className="mt-[-2px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-neutral-900 dark:text-neutral-100">
                {msg.pending && !msg.text ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400"><SpinnerDots size={16} /> Looking it up</div>
                ) : null}
                {msg.text ? (a ? <CitedText text={a.text} sources={a.sources} /> : <p className="whitespace-pre-wrap break-words leading-relaxed text-neutral-700 dark:text-neutral-300">{msg.text}</p>) : null}
                {msg.error ? (
                    <p className="flex items-start gap-1.5 text-xs text-neutral-700 dark:text-neutral-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" /> {msg.error}</p>
                ) : null}
                {a && (a.status === "offline" || a.status === "error") ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Boli&apos;s model did not answer this time. Try again in a moment.</p>
                ) : null}
                {notFound ? <ContactCardPreview bot={bot} /> : null}
                {a && a.sources.length ? (
                    <ul className="flex min-w-0 flex-wrap gap-1.5">
                        {a.sources.map((s) => (
                            <li key={s.n} className="min-w-0 max-w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" className="h-7 max-w-full cursor-pointer gap-1.5 px-2.5 text-xs font-normal">
                                            <span className="font-medium text-boli-sky-ink">{s.n}</span>
                                            <span className="min-w-0 truncate">{s.title || s.fileName || KIND_LABEL[s.kind]}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-80"><SourceDetail source={s} /></PopoverContent>
                                </Popover>
                            </li>
                        ))}
                    </ul>
                ) : null}
                {a && !msg.pending ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <StateBadge dot={a.answered ? "sky" : "amber"}>{a.answered ? "Answered" : notFound ? "Not found" : "No answer"}</StateBadge>
                        <StateBadge>{JAWAF_SCRIPT_LABELS[a.script]}</StateBadge>
                        <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{(a.latencyMs / 1000).toFixed(1)}s</span>
                        <span className="flex-1" />
                        {canFix ? (
                            <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer gap-1.5 text-xs" data-sheet-keep-open onClick={() => onFix(msg)}>
                                <PenLine className="h-3.5 w-3.5" /> Fix this answer
                            </Button>
                        ) : null}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer gap-1.5 text-xs" disabled={converting}>
                                    {converting ? <SpinnerDots size={14} /> : <Languages className="h-3.5 w-3.5" />} Try as visitor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-xs font-normal text-neutral-600 dark:text-neutral-400">Ask the same question in</DropdownMenuLabel>
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => onTryAs(msg, "romanized")}>Romanized Nepali</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => onTryAs(msg, "devanagari")}>Nepali (Devanagari)</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => onTryAs(msg, "english")}>English</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
