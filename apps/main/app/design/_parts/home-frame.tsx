"use client"

import { ArrowUpRight, BookOpen, Check, Coins, Home, KeyRound, LayoutGrid, MessageSquare, MoreHorizontal, PanelLeft, Plus, Sigma, Wallet, X, Zap } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { SITE } from "@repo/core/site"
import { BOLI_CHAT, MAX_API_KEYS } from "@/lib/boli"
import { buildSamples } from "@/lib/code-samples"
import { CodeTag } from "../_components/board"
import { R2Head } from "./r2-head"
import { useSky, type Sky } from "./sky"
import { MONO, sans, serif } from "./t1"
import { CRIMSON, CRIMSON_ON_DARK, ThreadMark } from "./thread-marks"
import { DARK, LIGHT, type Tone } from "./tones"

const SPEND = [0.4, 0.9, 0.2, 0, 1.4, 2.1, 0.8, 0.6, 1.9, 2.6, 0.3, 0, 0, 1.1, 2.8, 3.4, 1.2, 0.9, 2.2, 3.9, 2.4, 0.7, 0, 1.6, 2.9, 4.1, 3.3, 1.8, 2.5, 3.7]

const RECENT = [
    { kind: "Kura", title: "Exam pachi k garne", meta: "12 replies", cost: "0.04", when: "2m" },
    { kind: "API", title: "production key", meta: "stream - 1,204 tokens", cost: "0.01", when: "14m" },
    { kind: "API", title: "production key", meta: "failed - 429", cost: "0.00", when: "15m", failed: true },
    { kind: "Kura", title: "Meeting cancel message", meta: "4 replies", cost: "0.02", when: "1h" },
    { kind: "API", title: "staging key", meta: "1,880 tokens", cost: "0.01", when: "3h" },
]

const CHECKLIST = [
    { title: "Create an API key", line: "Keep it in your .env as BOLI_API_KEY.", done: true },
    { title: "Make your first API call", line: "Paste the quickstart below and run it.", done: false },
    { title: "Try Kura", line: "Ask something in Romanized Nepali.", done: false },
]

type LauncherId = "kura" | "keys" | "models" | "docs" | "speech"
const LAUNCHERS: { id: LauncherId; title: string; line: string; next?: boolean }[] = [
    { id: "kura", title: "Kura", line: "Chat in Nepali, English or both" },
    { id: "keys", title: "API keys", line: "Create and revoke keys" },
    { id: "models", title: "Models", line: "Prices per 1M tokens" },
    { id: "docs", title: "Docs", line: "Quickstart in 5 languages" },
    { id: "speech", title: "Speech", line: "Speech to text", next: true },
]

/** The small product moment inside each launcher, drawn per tone. */
function LauncherArt({ id, t, sky }: { id: LauncherId; t: Tone; sky: Sky }) {
    const card = { background: t.surface, boxShadow: t.dark ? `inset 0 0 0 1px ${t.line}` : "0 1px 2px rgba(20,20,20,0.06)" }
    const accent = t.dark ? sky.dark : sky.text
    if (id === "kura")
        return (
            <div className="grid w-full gap-1.5 text-xs">
                <span className="ml-auto max-w-[85%] truncate rounded-xl rounded-br-sm px-2.5 py-1.5" style={{ ...card, color: t.ink }}>
                    k cha, sanchai?
                </span>
                <span className="flex items-center gap-1.5">
                    <ThreadMark code="R2" px={14} className="shrink-0" style={{ color: t.ink }} accent={t.dark ? CRIMSON_ON_DARK : CRIMSON} />
                    <span className="truncate" style={{ color: t.ink }}>
                        Sanchai cha! Tapai lai?
                    </span>
                </span>
            </div>
        )
    if (id === "keys")
        return (
            <div className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs" style={{ ...card, fontFamily: MONO, color: t.ink }}>
                <span className="truncate">boli_sk_3f9a****</span>
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
            </div>
        )
    if (id === "models")
        return (
            <div className="w-full rounded-lg px-2.5 py-2 text-xs" style={card}>
                <p className="truncate" style={{ fontFamily: MONO, color: t.ink }}>
                    {BOLI_CHAT.id}
                </p>
                <p className="mt-0.5 truncate" style={{ color: t.muted }}>
                    Rs {BOLI_CHAT.pricePerMillion.input} in / Rs {BOLI_CHAT.pricePerMillion.output} out
                </p>
            </div>
        )
    if (id === "docs")
        return (
            <div className="w-full rounded-lg px-2.5 py-2 text-xs leading-5" style={{ ...card, fontFamily: MONO }}>
                <p className="truncate" style={{ color: t.muted }}>
                    client = <span style={{ color: accent }}>OpenAI</span>(
                </p>
                <p className="truncate pl-3" style={{ color: t.ink }}>
                    base_url=".../v1")
                </p>
            </div>
        )
    return (
        <div className="flex h-8 w-full items-center gap-[3px] rounded-lg px-2.5" style={card} aria-hidden>
            {Array.from({ length: 22 }, (_, i) => (
                <span key={i} className="w-[2px] shrink-0 rounded-full" style={{ height: 4 + Math.round(Math.abs(Math.sin(i * 0.8)) * 16), background: t.muted, opacity: 0.6 }} />
            ))}
        </div>
    )
}

function Card({ t, children, className }: { t: Tone; children: ReactNode; className?: string }) {
    return (
        <section className={cn("min-w-0 rounded-2xl", className)} style={{ background: t.surface, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
            {children}
        </section>
    )
}

function SectionTitle({ t, title, hint, right }: { t: Tone; title: string; hint?: string; right?: ReactNode }) {
    return (
        <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="truncate text-base" style={{ ...serif(460, 24, "-0.01em"), color: t.ink }}>
                    {title}
                </h3>
                {hint ? (
                    <p className="truncate text-xs" style={{ color: t.muted }}>
                        {hint}
                    </p>
                ) : null}
            </div>
            {right}
        </div>
    )
}

function HomeBody({ t, phone }: { t: Tone; phone: boolean }) {
    const sky = useSky()
    const accent = t.dark ? sky.dark : sky.text
    const max = Math.max(...SPEND)
    const done = CHECKLIST.filter((c) => c.done).length
    const python = buildSamples({ baseUrl: SITE.url }).python
    const stats = [
        { icon: Coins, label: "Credits left", value: "87.42", hint: "1 credit = Rs 1" },
        { icon: Zap, label: "Requests today", value: "38", hint: "0.21 credits" },
        { icon: Sigma, label: "Tokens this week", value: "41.2K", hint: "last 7 days, in + out" },
        { icon: KeyRound, label: "Active API keys", value: "2", hint: `of ${MAX_API_KEYS}` },
    ]
    return (
        <div className={cn("grid min-w-0 gap-4", phone ? "px-4 pb-6" : "px-6 pb-8")}>
            {/* Page header: title left, the primary action right. */}
            <div className="flex min-w-0 items-center justify-between gap-3 pt-3">
                <div className="min-w-0">
                    <h2 className="truncate text-xl" style={{ ...serif(450, 24, "-0.012em"), color: t.ink }}>
                        Home
                    </h2>
                    <p className="truncate text-xs" style={{ color: t.muted }}>
                        Your credits, usage and recent activity at a glance.
                    </p>
                </div>
                <span className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px]" style={{ ...sans(450), background: t.ink, color: t.dark ? "#141414" : "#ffffff" }}>
                    <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5" /> Open Kura
                </span>
            </div>

            {/* Launchers: product-moment cards, Speech marked Next. One row on desktop, a swipe row on a phone. */}
            <div className={cn("grid gap-3", phone ? "auto-cols-[44%] grid-flow-col overflow-hidden" : "grid-cols-5")}>
                {LAUNCHERS.map((l) => (
                    <div key={l.id} className="group/l min-w-0 cursor-pointer rounded-2xl p-1.5 transition-shadow" style={{ background: t.surface, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                        <div className={cn("flex h-[76px] items-center rounded-xl px-2.5", l.next && "opacity-70")} style={{ background: l.next ? t.raised : t.dark ? sky.darkSoft : sky.soft }}>
                            <LauncherArt id={l.id} t={t} sky={sky} />
                        </div>
                        <div className="flex items-center justify-between gap-1 px-1.5 pb-1 pt-2">
                            <p className="truncate text-sm" style={{ ...sans(500), color: t.ink }}>
                                {l.title}
                            </p>
                            {l.next ? (
                                <span className="shrink-0 rounded-full px-1.5 text-xs" style={{ color: t.muted, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                                    Next
                                </span>
                            ) : (
                                <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" style={{ color: t.muted }} />
                            )}
                        </div>
                        <p className="truncate px-1.5 pb-1 text-xs" style={{ color: t.muted }}>
                            {l.line}
                        </p>
                    </div>
                ))}
            </div>

            {/* Get started: three steps, hides itself when all are done. */}
            <Card t={t} className="p-4">
                <SectionTitle
                    t={t}
                    title="Get started"
                    hint={`${done} of ${CHECKLIST.length} done - this card hides when all three are`}
                    right={<X aria-label="Hide" strokeWidth={1.5} className="size-4 shrink-0 cursor-pointer" style={{ color: t.muted }} />}
                />
                <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: t.faint }}>
                    <div className="h-full rounded-full" style={{ width: `${(done / CHECKLIST.length) * 100}%`, background: t.dark ? sky.dark : sky.fill }} />
                </div>
                <ol className={cn("mt-3 grid gap-2", !phone && "grid-cols-3")}>
                    {CHECKLIST.map((c, i) => (
                        <li key={c.title} className="flex min-w-0 items-start gap-3 rounded-xl p-3" style={{ background: c.done ? "transparent" : t.dark ? t.raised : t.ground }}>
                            <span
                                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs"
                                style={c.done ? { background: t.ink, color: t.dark ? "#141414" : "#fff" } : { boxShadow: `inset 0 0 0 1px ${t.muted}`, color: t.muted }}
                            >
                                {c.done ? <Check aria-hidden strokeWidth={2.25} className="size-3" /> : i + 1}
                            </span>
                            <span className="min-w-0">
                                <span className={cn("block truncate text-sm", c.done && "line-through decoration-1")} style={{ ...sans(500), color: c.done ? t.muted : t.ink }}>
                                    {c.title}
                                </span>
                                <span className="block truncate text-xs" style={{ color: t.muted }}>
                                    {c.line}
                                </span>
                            </span>
                        </li>
                    ))}
                </ol>
            </Card>

            {/* StatBand: one band, four values. */}
            <Card t={t} className={cn("grid", phone ? "grid-cols-2" : "grid-cols-4")}>
                {stats.map((s, i) => (
                    <div
                        key={s.label}
                        className="min-w-0 px-4 py-3.5"
                        style={{ borderLeft: (phone ? i % 2 : i) ? `1px solid ${t.line}` : undefined, borderTop: phone && i >= 2 ? `1px solid ${t.line}` : undefined }}
                    >
                        <p className="flex items-center gap-1.5 truncate text-xs" style={{ color: t.muted }}>
                            <s.icon aria-hidden strokeWidth={1.5} className="size-3.5 shrink-0" />
                            {s.label}
                        </p>
                        <p className="mt-1 truncate text-xl tabular-nums" style={{ ...serif(420, 36, "-0.015em"), color: t.ink }}>
                            {s.value}
                        </p>
                        <p className="truncate text-xs" style={{ color: t.muted }}>
                            {s.hint}
                        </p>
                    </div>
                ))}
            </Card>

            <div className={cn("grid gap-4", !phone && "grid-cols-[1.5fr_1fr]")}>
                <Card t={t} className="p-4">
                    <SectionTitle t={t} title="Credits spent per day" hint="Last 30 days, Kura and API" />
                    <div role="img" aria-label="Credits spent per day, last 30 days" className="mt-4 flex h-36 items-end gap-[3px]">
                        {SPEND.map((v, i) => (
                            <div
                                key={i}
                                className="min-w-0 flex-1 rounded-[3px]"
                                style={{ height: v ? `${Math.max(4, (v / max) * 140)}px` : "2px", background: i === SPEND.length - 1 ? (t.dark ? sky.dark : sky.fill) : t.faint }}
                            />
                        ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs" style={{ color: t.muted }}>
                        <span>26 Oct</span>
                        <span>Today 3.70</span>
                    </div>
                </Card>
                <Card t={t} className="py-2">
                    <div className="px-4 pt-2">
                        <SectionTitle t={t} title="Recent activity" right={<span className="text-xs underline underline-offset-4" style={{ color: accent }}>Open usage</span>} />
                    </div>
                    <ul className="mt-2">
                        {RECENT.map((r, i) => (
                            <li key={i} className="flex min-w-0 items-center gap-3 px-4 py-2.5" style={{ borderTop: `1px solid ${t.line}` }}>
                                <span className="w-9 shrink-0 text-xs" style={{ color: t.muted }}>
                                    {r.kind}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm" style={{ color: t.ink }}>
                                        {r.title}
                                    </span>
                                    <span className="block truncate text-xs" style={{ color: r.failed ? (t.dark ? "#e4344d" : "#a50e26") : t.muted }}>
                                        {r.meta}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right text-xs tabular-nums" style={{ color: t.muted }}>
                                    {r.cost}
                                    <br />
                                    {r.when}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <Card t={t} className="p-4">
                <SectionTitle
                    t={t}
                    title="Start building"
                    hint="Create a key, put it in your .env as BOLI_API_KEY, then make your first call."
                    right={
                        phone ? null : (
                            <span className="flex shrink-0 gap-2" style={sans(450)}>
                                <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]" style={{ color: t.ink, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                                    <BookOpen aria-hidden strokeWidth={1.75} className="size-3.5" /> Docs
                                </span>
                                <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]" style={{ background: t.ink, color: t.dark ? "#141414" : "#fff" }}>
                                    <Plus aria-hidden strokeWidth={1.75} className="size-3.5" /> Create API key
                                </span>
                            </span>
                        )
                    }
                />
                <div className="mt-3 overflow-hidden rounded-xl" style={{ boxShadow: `inset 0 0 0 1px ${t.line}`, background: t.dark ? "#121314" : "#fbfaf8" }}>
                    <div className="flex items-center gap-4 overflow-hidden px-3 text-[13px]" style={{ borderBottom: `1px solid ${t.line}` }}>
                        {["cURL", "Python", "TypeScript", "JavaScript", "Go"].map((l) => (
                            <span key={l} className="inline-flex h-9 shrink-0 items-center gap-1.5" style={{ color: l === "Python" ? t.ink : t.muted }}>
                                <span aria-hidden className="size-1 rounded-full" style={{ background: l === "Python" ? t.ink : "transparent" }} />
                                {l}
                            </span>
                        ))}
                    </div>
                    <pre className="max-h-44 overflow-hidden px-4 py-3 text-xs leading-5" style={{ fontFamily: MONO, color: t.text }}>
                        {python}
                    </pre>
                </div>
            </Card>
        </div>
    )
}

const RAIL = [
    { icon: Home, label: "Home", active: true },
    { icon: MessageSquare, label: "Kura" },
    { icon: KeyRound, label: "API keys" },
    { icon: LayoutGrid, label: "Models" },
    { icon: Zap, label: "Usage" },
    { icon: Wallet, label: "Billing" },
]

/** Desktop: rail + page. The rail separates by a soft shadow, never a hairline. */
function HomeDesktop({ t }: { t: Tone }) {
    return (
        <div className="flex min-w-0 overflow-hidden rounded-2xl" style={{ background: t.ground, boxShadow: `inset 0 0 0 1px ${t.line}`, ...sans() }}>
            <aside className="hidden w-52 shrink-0 flex-col gap-0.5 p-2.5 md:flex" style={{ background: t.ground, boxShadow: t.dark ? "8px 0 24px -14px rgba(0,0,0,0.9)" : "8px 0 24px -16px rgba(20,20,20,0.18)" }}>
                <div className="mb-3 flex h-10 items-center justify-between px-1.5">
                    <span className="inline-flex items-center gap-2" style={{ color: t.ink }}>
                        <ThreadMark code="R2" px={20} accent={t.dark ? CRIMSON_ON_DARK : CRIMSON} />
                        <span className="text-[19px] leading-none" style={serif(440, 36, "-0.02em")}>
                            Boli
                        </span>
                    </span>
                    <PanelLeft aria-hidden strokeWidth={1.5} className="size-4" style={{ color: t.muted }} />
                </div>
                {RAIL.map((r) => (
                    <span key={r.label} className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px]" style={{ background: r.active ? (t.dark ? "rgba(255,255,255,0.06)" : t.surface) : undefined, color: r.active ? t.ink : t.muted, boxShadow: r.active && !t.dark ? "0 1px 2px rgba(20,20,20,0.06)" : undefined }}>
                        <r.icon aria-hidden strokeWidth={1.5} className="size-4" />
                        {r.label}
                    </span>
                ))}
            </aside>
            <div className="min-w-0 flex-1">
                <HomeBody t={t} phone={false} />
            </div>
        </div>
    )
}

/** 390px phone: no rail, bottom tab bar with four links and More. */
function HomePhone({ t }: { t: Tone }) {
    return (
        <div className="mx-auto w-[406px] max-w-full overflow-hidden rounded-[36px] p-2" style={{ background: "#141414" }}>
            <div className="relative h-[780px] overflow-hidden rounded-[28px]" style={{ background: t.ground, ...sans() }}>
                <div className="h-[716px] overflow-hidden">
                    <HomeBody t={t} phone />
                </div>
                <nav className="absolute inset-x-0 bottom-0 grid h-16 grid-cols-5 items-center" style={{ background: t.surface, boxShadow: `0 -1px 0 ${t.line}` }}>
                    {[
                        { icon: Home, label: "Home" },
                        { icon: MessageSquare, label: "Kura" },
                        { icon: KeyRound, label: "Keys" },
                        { icon: Zap, label: "Usage" },
                        { icon: MoreHorizontal, label: "More" },
                    ].map((x, i) => (
                        <span key={x.label} className="flex flex-col items-center gap-1 text-xs" style={{ color: i === 0 ? t.ink : t.muted }}>
                            <x.icon aria-hidden strokeWidth={1.5} className="size-5" />
                            {x.label}
                        </span>
                    ))}
                </nav>
            </div>
        </div>
    )
}

export function HomeFrame({ n = "02" }: { n?: string }) {
    return (
        <section id="r2-home" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="/home"
                line="Today's Home restyled in T1 and sky: launchers on top (product-moment style, Speech marked Next), a three-step Get started card that hides when done, then the StatBand, the spend chart, recent activity and Start building."
                codes="H1"
            />
            <div className="grid gap-3">
                <div className="flex items-center gap-2">
                    <CodeTag code="H1" />
                    <p className="text-sm text-boli-text">Desktop, light and dark</p>
                </div>
                <HomeDesktop t={LIGHT} />
                <HomeDesktop t={DARK} />
            </div>
            <div className="grid gap-3">
                <p className="text-sm text-boli-text">390px, light and dark</p>
                <div className="flex flex-wrap justify-center gap-6">
                    <HomePhone t={LIGHT} />
                    <HomePhone t={DARK} />
                </div>
            </div>
        </section>
    )
}
