"use client"

import { ArrowUp, ArrowUpRight, Brain, ChevronDown, Code2, PanelRight, Plus, SlidersHorizontal } from "lucide-react"
import { BOLI_CHAT, KURA, KURA_SUGGESTIONS } from "@repo/boli"
import { CodeTag } from "../_components/board"
import { KuraScene } from "../_art/kura/kura-scene"
import { DhakaStrip } from "./dhaka-strip"
import { R2Head } from "./r2-head"
import { useSky } from "./sky"
import { MONO, sans, serif } from "./t1"
import { CRIMSON, CRIMSON_ON_DARK, ThreadMark } from "./thread-marks"
import { DARK, LIGHT, type Tone } from "./tones"
import { KURA_A, KURA_Q } from "./slices"

/** Kura's avatar: the thread on a round tile, the dot in crimson. */
function Avatar({ t, size = 28 }: { t: Tone; size?: number }) {
    return (
        <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: t.surface, color: t.ink, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
            <ThreadMark code="R2" px={Math.round(size * 0.64)} accent={t.dark ? CRIMSON_ON_DARK : CRIMSON} />
        </span>
    )
}

function Header({ t }: { t: Tone }) {
    return (
        <div className="flex h-12 items-center justify-between gap-3 px-4" style={{ borderBottom: `1px solid ${t.line}` }}>
            <div className="flex min-w-0 items-center gap-2">
                <span className="text-[17px] leading-none" style={{ ...serif(440, 24, "-0.012em"), color: t.ink }}>
                    {KURA.name}
                </span>
                <ModelChip t={t} />
            </div>
            <div className="flex items-center gap-1" style={{ color: t.muted }}>
                {[Plus, Code2, SlidersHorizontal, PanelRight].map((Icon, i) => (
                    <span key={i} className="flex size-8 cursor-pointer items-center justify-center rounded-full">
                        <Icon aria-hidden strokeWidth={1.5} className="size-4" />
                    </span>
                ))}
            </div>
        </div>
    )
}

/** K1 v2 model chip: a live dot, the model id in mono, what it is in sans, a chevron - one quiet pill. */
function ModelChip({ t }: { t: Tone }) {
    return (
        <span
            className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-full pl-2.5 pr-2 text-xs transition-colors"
            style={{ background: t.surface, color: t.text, boxShadow: `inset 0 0 0 1px ${t.line}` }}
        >
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: t.dark ? "#4ade80" : "#16a34a" }} />
            <span style={{ fontFamily: MONO, color: t.ink }}>{BOLI_CHAT.id}</span>
            <span className="hidden sm:inline" style={{ color: t.muted }}>
                {BOLI_CHAT.label}
            </span>
            <ChevronDown aria-hidden strokeWidth={1.75} className="size-3.5" style={{ color: t.muted }} />
        </span>
    )
}

/** K1 v2 Think toggle: a pill with the brain, the word and a small switch that says on or off. */
function ThinkToggle({ t, on }: { t: Tone; on: boolean }) {
    const sky = useSky()
    const accent = t.dark ? sky.dark : sky.fill
    return (
        <span
            role="switch"
            aria-checked={on}
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full pl-2.5 pr-1.5 text-xs"
            style={{
                ...sans(450),
                color: on ? t.ink : t.muted,
                background: on ? (t.dark ? sky.darkSoft : sky.soft) : "transparent",
                boxShadow: `inset 0 0 0 1px ${on ? accent : t.line}`,
            }}
        >
            <Brain aria-hidden strokeWidth={1.5} className="size-3.5" style={{ color: on ? accent : t.muted }} />
            Think
            <span aria-hidden className="relative h-4 w-7 rounded-full transition-colors" style={{ background: on ? accent : t.dark ? "#2a2b2e" : "#e6e1db" }}>
                <span className="absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-[left]" style={{ left: on ? 14 : 2 }} />
            </span>
        </span>
    )
}

function Composer({ t, think = false }: { t: Tone; think?: boolean }) {
    const sky = useSky()
    return (
        <div className="mx-auto w-full max-w-2xl px-4 pb-4">
            <div className="rounded-3xl p-2 pl-4" style={{ background: t.surface, boxShadow: t.dark ? `inset 0 0 0 1px ${t.line}` : `inset 0 0 0 1px ${t.line}, 0 8px 24px -16px rgba(20,20,20,0.2)` }}>
                <p className="pb-6 pt-2 text-[15px]" style={{ color: t.muted }}>
                    Message Kura in English, Nepali or both
                </p>
                <div className="flex items-center justify-between">
                    <ThinkToggle t={t} on={think} />
                    <span className="flex size-9 items-center justify-center rounded-full" style={{ background: t.ink, color: t.dark ? "#141414" : "#fff", boxShadow: `0 0 0 3px ${t.dark ? sky.darkSoft : sky.soft}` }}>
                        <ArrowUp aria-hidden strokeWidth={2} className="size-4" />
                    </span>
                </div>
            </div>
            <p className="mt-2 text-center text-xs" style={{ color: t.muted }}>
                A small open model. Check anything important.
            </p>
        </div>
    )
}

/**
 * K1 v2 empty state: the pixel scene (two people in kura by the stupa; dusk in dark mode), the welcome, then four
 * suggestion cards in the PC3 style - a thin Dhaka edge, the language in the sky's text colour, the prompt, an arrow.
 */
function EmptyState({ t }: { t: Tone }) {
    const sky = useSky()
    return (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-6 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl" style={{ boxShadow: `inset 0 0 0 1px ${t.line}, 0 10px 30px -22px rgba(20,20,20,0.45)` }}>
                <KuraScene variant={t.dark ? "gold" : "day"} className="block aspect-[112/48] w-full" />
            </div>
            <div className="mt-6 flex items-center gap-2.5">
                <Avatar t={t} size={32} />
                <h3 className="text-[40px] leading-none" style={{ ...serif(360, 144, "-0.035em"), color: t.ink }}>
                    {KURA.name}
                </h3>
            </div>
            <p className="mt-2 text-xs" style={{ color: t.muted }}>
                कुरा - {KURA.meaning.toLowerCase()}
            </p>
            <p className="mt-3 text-[15px]" style={{ color: t.text }}>
                {KURA.subtitle}
            </p>
            <div className="mt-6 grid w-full grid-cols-2 gap-2.5 text-left">
                {KURA_SUGGESTIONS.map((s) => (
                    <span
                        key={s.label}
                        className="group/sg flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl transition-shadow"
                        style={{ background: t.surface, boxShadow: `inset 0 0 0 1px ${t.line}` }}
                    >
                        <DhakaStrip sky={sky} tone={t.dark ? "night" : "sky"} scale={1} />
                        <span className="flex min-w-0 items-start gap-2 px-3.5 pb-3 pt-2.5">
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs" style={{ ...sans(500), color: t.dark ? sky.dark : sky.text }}>
                                    {s.label}
                                </span>
                                <span className="mt-0.5 line-clamp-2 block text-sm leading-5" style={{ color: t.ink }}>
                                    {s.prompt}
                                </span>
                            </span>
                            <ArrowUpRight
                                aria-hidden
                                strokeWidth={1.75}
                                className="mt-0.5 size-3.5 shrink-0 transition-transform group-hover/sg:-translate-y-0.5 group-hover/sg:translate-x-0.5 motion-reduce:transition-none"
                                style={{ color: t.muted }}
                            />
                        </span>
                    </span>
                ))}
            </div>
        </div>
    )
}

function Conversation({ t }: { t: Tone }) {
    const sky = useSky()
    return (
        <div className="mx-auto grid w-full max-w-2xl flex-1 content-start gap-5 px-4 py-8 text-[15px] leading-7">
            <div className="flex justify-end">
                <p className="max-w-[80%] rounded-3xl rounded-br-lg px-4 py-2" style={{ background: t.dark ? t.raised : "#efebe6", color: t.ink }}>
                    {KURA_Q}
                </p>
            </div>
            <div className="flex items-start gap-3">
                <Avatar t={t} />
                <div className="min-w-0">
                    <p style={{ color: t.ink }}>{KURA_A}</p>
                    <p className="mt-2 text-xs" style={{ color: t.muted }}>
                        64 tokens - 0.0004 credits -{" "}
                        <span className="underline underline-offset-4" style={{ color: t.dark ? sky.dark : sky.text }}>
                            View code
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex justify-end">
                <p className="max-w-[80%] rounded-3xl rounded-br-lg px-4 py-2" style={{ background: t.dark ? t.raised : "#efebe6", color: t.ink }}>
                    coding kaha bata suru garne?
                </p>
            </div>
            <div className="flex items-start gap-3">
                <Avatar t={t} />
                <p className="min-w-0" style={{ color: t.ink }}>
                    Python bata suru gara - sajilo cha.
                    <span aria-hidden className="ml-1 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse motion-reduce:animate-none" style={{ background: t.dark ? sky.dark : sky.text }} />
                </p>
            </div>
        </div>
    )
}

function KuraWindow({ t, state }: { t: Tone; state: "empty" | "chat" }) {
    return (
        <div className="flex h-[720px] min-w-0 flex-col overflow-hidden rounded-2xl" style={{ background: t.ground, boxShadow: `inset 0 0 0 1px ${t.line}`, ...sans() }}>
            <Header t={t} />
            {state === "empty" ? <EmptyState t={t} /> : <Conversation t={t} />}
            <Composer t={t} think={state === "chat"} />
        </div>
    )
}

export function KuraFrame({ n = "03" }: { n?: string }) {
    return (
        <section id="screens-kura" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="Kura - K1 v2"
                line="The empty state gets the care it lacked: a real pixel scene of a conversation (kura) by the stupa, dusk in dark mode; suggestion cards in the PC3 style; a quieter model chip with a live dot; Think as a labelled switch. The conversation view is unchanged."
                codes="K1 v2"
            />
            <div className="flex items-center gap-2">
                <CodeTag code="K1 v2" />
                <p className="text-sm text-boli-text">Empty state and a conversation (Think on), light and dark</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <KuraWindow t={LIGHT} state="empty" />
                <KuraWindow t={LIGHT} state="chat" />
                <KuraWindow t={DARK} state="empty" />
                <KuraWindow t={DARK} state="chat" />
            </div>
        </section>
    )
}
