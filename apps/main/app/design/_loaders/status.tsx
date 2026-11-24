"use client"

import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { BoliLogo } from "@/components/brand/boli-logo"
import { serif, sans } from "../_parts/t1"
import { ElderArt, ForkArt, PasalArt, RestingArt, RoomArt } from "./art"
import { Duo, INK, OptionHead, PhoneFrame, WindowFrame, type Mode } from "./kit"

/*
 * St1a-St4: the status screens (StatusView's slot) - 404, 500, 403 and the model resting. Each: a pixel scene, the
 * code, a Fraunces title, one line, the asked-for path, a primary and a secondary action. Laid out with container
 * queries, so the same screen is checked in a desktop window and in a 390px phone.
 */

type Status = {
    code: string
    name: string
    note: string
    eyebrow: string
    title: string
    line: string
    path: string
    primary: string
    secondary: string
    layout: "centred" | "split"
    art: (mode: Mode) => ReactNode
    /** A true error: the eyebrow carries the crimson dot. */
    error?: boolean
    extra?: (mode: Mode) => ReactNode
    pick?: string
}

function Pill({ mode, primary, children }: { mode: Mode; primary?: boolean; children: ReactNode }) {
    const t = INK[mode]
    return (
        <span
            aria-disabled
            className="inline-flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-5 text-sm"
            style={
                primary
                    ? { ...sans(450), background: mode === "dark" ? "#ffffff" : "#141414", color: mode === "dark" ? "#141414" : "#ffffff" }
                    : { ...sans(450), border: `1px solid ${t.line}`, background: t.card, color: t.ink }
            }
        >
            {children}
        </span>
    )
}

function Words({ s, mode, align }: { s: Status; mode: Mode; align: "center" | "start" }) {
    const t = INK[mode]
    return (
        <div className={cn("grid min-w-0 gap-3", align === "center" ? "justify-items-center text-center" : "justify-items-start text-left")}>
            <p className="flex items-center gap-2 font-mono text-xs" style={{ color: t.muted }}>
                {s.error ? <span className="size-1.5 rounded-full bg-boli-crimson dark:bg-boli-crimson-lift" aria-hidden /> : null}
                {s.eyebrow}
            </p>
            <h3 className="max-w-[22ch] text-[clamp(24px,4.4cqw,38px)] leading-[1.05]" style={{ ...serif(390, 72, "-0.025em"), color: t.ink }}>
                {s.title}
            </h3>
            <p className="max-w-[46ch] text-sm leading-6" style={{ ...sans(), color: t.text }}>
                {s.line}
            </p>
            <p className="flex max-w-full min-w-0 items-center gap-1.5 text-xs" style={{ color: t.muted }}>
                <span className="shrink-0">You asked for</span>
                <code className="min-w-0 truncate rounded-full px-2.5 py-1 font-mono" style={{ background: mode === "dark" ? "#232426" : "#efebe6", color: t.text }}>
                    {s.path}
                </code>
            </p>
            {s.extra ? s.extra(mode) : null}
            <div className={cn("mt-1 flex w-full flex-col gap-2 @sm:w-auto @sm:flex-row", align === "center" ? "@sm:justify-center" : "")}>
                <Pill mode={mode} primary>
                    {s.primary}
                </Pill>
                <Pill mode={mode}>{s.secondary}</Pill>
            </div>
        </div>
    )
}

/** One status screen, as it would fill the page. */
function Screen({ s, mode }: { s: Status; mode: Mode }) {
    const t = INK[mode]
    const head = (
        <div className="absolute left-0 right-0 top-0 flex h-12 items-center px-[4cqw]">
            <BoliLogo size={15} />
        </div>
    )
    if (s.layout === "split") {
        return (
            <div className="absolute inset-0 flex flex-col">
                {head}
                <div className="grid min-h-0 flex-1 content-center gap-6 px-[6cqw] pb-6 pt-14 @lg:grid-cols-[1fr_1fr] @lg:items-center @lg:gap-[5cqw]">
                    <div className="order-2 @lg:order-1">
                        <Words s={s} mode={mode} align="start" />
                    </div>
                    <div className="order-1 overflow-hidden rounded-2xl border @lg:order-2" style={{ borderColor: t.line }}>
                        {s.art(mode)}
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div className="absolute inset-0 flex flex-col">
            {head}
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3.5cqw] px-[6cqw] pb-6 pt-14">
                <div className="w-full max-w-[22rem] overflow-hidden rounded-2xl border @lg:w-[40cqw]" style={{ borderColor: t.line }}>
                    {s.art(mode)}
                </div>
                <Words s={s} mode={mode} align="center" />
            </div>
        </div>
    )
}

const STATUSES: readonly Status[] = [
    {
        code: "St1a",
        name: "404 - the porter at the fork (centred)",
        note: "The scene above the words. A porter with his doko stops at a signpost - 404 one way, home the other - and glances between them.",
        eyebrow: "404 - Page not found",
        title: "This page wandered off",
        line: "Nothing lives at this address. It may have moved, or the link has a typo in it.",
        path: "/kura/c/7f3a2b9e",
        primary: "Go home",
        secondary: "Contact us",
        layout: "centred",
        art: (mode) => <ForkArt mode={mode} className="aspect-[120/64] w-full" />,
        pick: "Pick for 404",
    },
    {
        code: "St1b",
        name: "404 - the elder with a map (split)",
        note: "Words on the left, the scene on the right; it stacks on a phone. The elder turns a map that does not match the trail: \"hmm?\"",
        eyebrow: "404 - Page not found",
        title: "This page wandered off",
        line: "Nothing lives at this address. It may have moved, or the link has a typo in it.",
        path: "/docs/quickstart-old",
        primary: "Go home",
        secondary: "Contact us",
        layout: "split",
        art: (mode) => <ElderArt mode={mode} className="aspect-[80/72] w-full" />,
    },
    {
        code: "St2",
        name: "500 - the hot laptop",
        note: "The story's laptop overheating between two fans (scene 02, reused). The crimson dot marks a true error; a reference to quote when writing in.",
        eyebrow: "500 - Server error",
        title: "Something broke on our side",
        line: "Our server tripped while loading this. It was not something you did - try again in a moment.",
        path: "/billing",
        primary: "Try again",
        secondary: "Go home",
        layout: "centred",
        error: true,
        art: (mode) => <RoomArt mode={mode} className="block aspect-[96/60] w-full" />,
        extra: (mode) => (
            <p className="font-mono text-xs" style={{ color: INK[mode].muted }}>
                Ref 8f2c-41d0
            </p>
        ),
    },
    {
        code: "St3",
        name: "403 - the pasal shutter",
        note: "A pasal with its shutter down and padlocked, a \"banda\" note taped on, a pigeon pecking in front. Not angry - just closed to you.",
        eyebrow: "403 - No access",
        title: "Not your door",
        line: "This belongs to another account, or your role cannot open it. Ask the owner for access, or switch accounts.",
        path: "/admin/users",
        primary: "Go home",
        secondary: "Switch account",
        layout: "centred",
        art: (mode) => <PasalArt mode={mode} className="aspect-[120/64] w-full" />,
    },
    {
        code: "St4",
        name: "Model resting / offline",
        note: "The Boli house asleep under a crescent moon - lights off, one amber standby light, a slow \"z z\". Same frame for \"You're offline\" with its own line.",
        eyebrow: "boli-chat - Unavailable",
        title: "The model is resting",
        line: "boli-chat is offline for a moment - usually a restart, back within a few minutes. Your conversations are safe.",
        path: "/kura",
        primary: "Try again",
        secondary: "Check status",
        layout: "centred",
        art: () => <RestingArt className="aspect-[120/64] w-full" />,
        extra: (mode) => (
            <p className="flex items-center gap-2 text-xs" style={{ color: INK[mode].muted }}>
                <span className="size-1.5 rounded-full bg-[#f2b53c]" aria-hidden />
                Last answered 2 minutes ago
            </p>
        ),
    },
]

export function StatusBoard() {
    return (
        <div className="grid gap-16">
            {STATUSES.map((s) => (
                <article key={s.code} className="grid min-w-0 gap-5">
                    <OptionHead code={s.code} name={s.name} line={s.note} pick={s.pick} />
                    <Duo>
                        {(mode) => (
                            <WindowFrame mode={mode} path={`boli.app${s.path}`} aspect="900 / 760">
                                <Screen s={s} mode={mode} />
                            </WindowFrame>
                        )}
                    </Duo>
                </article>
            ))}
            <article className="grid min-w-0 gap-5">
                <OptionHead code="390" name="At phone width" line="The same screens at 390px: the scene on top, words under it, the two actions stacked full width so they are easy to tap." />
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {STATUSES.map((s, i) => {
                        const mode: Mode = i % 2 === 0 ? "light" : "dark"
                        return (
                            <PhoneFrame key={s.code} mode={mode} label={`${s.code} - ${mode}`}>
                                <Screen s={s} mode={mode} />
                            </PhoneFrame>
                        )
                    })}
                </div>
            </article>
        </div>
    )
}
