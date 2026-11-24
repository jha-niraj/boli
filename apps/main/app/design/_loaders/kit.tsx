"use client"

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { CodeTag } from "../_components/board"
import { serif, sans } from "../_parts/t1"

/*
 * Shared pieces for the Loaders tab: the light / dark pair, the option card, the rotating copy and the reduced-motion
 * preview. Review samples only - nothing here is production.
 */

export type Mode = "light" | "dark"

/** Raw values for SVG fills and inline styles, per mode (C5 + the warm neutrals). */
export const INK = {
    light: { ground: "#f7f5f3", card: "#ffffff", sand: "#efebe6", line: "#e6e1db", ink: "#141414", text: "#3a3a3a", muted: "#6b6560", sky: "#3d8fd6", skyInk: "#1d64a3", skySoft: "#e4f0fb", track: "rgba(20,20,20,0.12)" },
    dark: { ground: "#121314", card: "#1a1b1d", sand: "#232220", line: "#2a2a2c", ink: "#f5f3f0", text: "#d4d0cb", muted: "#a39d96", sky: "#6cb2ef", skyInk: "#6cb2ef", skySoft: "#152533", track: "rgba(245,243,240,0.14)" },
} as const

/* ------------------------------------------------------------------------------------------------ reduced motion */

const StillContext = createContext(false)

/** True when motion should stop: the OS asks for less motion, or the tab's "Preview reduced motion" is on. */
export function useStill(): boolean {
    const forced = useContext(StillContext)
    const [os, setOs] = useState(false)
    useEffect(() => {
        const q = window.matchMedia("(prefers-reduced-motion: reduce)")
        setOs(q.matches)
        const on = () => setOs(q.matches)
        q.addEventListener("change", on)
        return () => q.removeEventListener("change", on)
    }, [])
    return forced || os
}

export function StillProvider({ still, children }: { still: boolean; children: ReactNode }) {
    return (
        <StillContext.Provider value={still}>
            <div className={still ? "ld-still" : undefined}>{children}</div>
        </StillContext.Provider>
    )
}

/** Cycles through `lines` every `ms`. Under reduced motion it holds the first line. */
export function useCycle(count: number, ms = 2000): number {
    const still = useStill()
    const [i, setI] = useState(0)
    useEffect(() => {
        if (still || count < 2) {
            setI(0)
            return
        }
        const t = window.setInterval(() => setI((n) => (n + 1) % count), ms)
        return () => window.clearInterval(t)
    }, [still, count, ms])
    return i
}

/** One line of loader copy that changes every ~2s, fading up; `aria-live` so a screen reader hears progress. */
export function RotatingLine({ lines, className, style }: { lines: readonly string[]; className?: string; style?: CSSProperties }) {
    const i = useCycle(lines.length)
    const line = lines[i] ?? ""
    return (
        <p aria-live="polite" className={cn("min-h-[1.5em]", className)} style={style}>
            <span key={line} className="ld-line inline-block">
                {line}
            </span>
        </p>
    )
}

export const LOADER_LINES = ["Waking the model...", "Brewing your answer...", "Ghanti bajdai cha...", "Warming up boli-chat...", "Almost there..."] as const

/* ------------------------------------------------------------------------------------------------ frames */

/** A surface in one mode: the `.dark` class switches every `dark:` utility and Boli's sky tokens inside it. */
export function ModeSurface({ mode, className, children }: { mode: Mode; className?: string; children: ReactNode }) {
    return (
        <div
            className={cn(mode === "dark" && "dark", "min-w-0")}
            style={{ background: INK[mode].ground, color: INK[mode].ink, colorScheme: mode }}
        >
            <div className={className}>{children}</div>
        </div>
    )
}

/** Light beside dark (stacked under lg). `children` is called once per mode. */
export function Duo({ children, className, stack = false }: { children: (mode: Mode) => ReactNode; className?: string; stack?: boolean }) {
    return (
        <div className={cn("grid min-w-0 gap-3", !stack && "lg:grid-cols-2", className)}>
            {(["light", "dark"] as const).map((m) => (
                <div key={m} className="grid min-w-0 gap-1.5">
                    <p className="text-xs text-boli-muted">{m === "light" ? "Light" : "Dark"}</p>
                    {children(m)}
                </div>
            ))}
        </div>
    )
}

/** The option header: code tag, name, one line, and an optional pick note. */
export function OptionHead({ code, name, line, pick }: { code: string; name: string; line: string; pick?: string }) {
    return (
        <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1.5">
            <CodeTag code={code} />
            <div className="min-w-0 flex-1">
                <h3 className="text-[22px] leading-tight text-boli-ink" style={serif(420, 36, "-0.015em")}>
                    {name}
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-boli-text">{line}</p>
            </div>
            {pick ? (
                <span className="inline-flex h-6 items-center rounded-full bg-boli-sky-soft px-2.5 text-xs text-boli-sky-ink" style={sans(450)}>
                    {pick}
                </span>
            ) : null}
        </div>
    )
}

/**
 * A browser-window mock at a fixed aspect (default 900 x 560): a slim chrome bar with the address, then the page.
 * `@container` so what is inside lays out by the frame's width, not the screen's.
 */
export function WindowFrame({ mode, path = "boli.app/kura", aspect = "900 / 560", children, className }: { mode: Mode; path?: string; aspect?: string; children: ReactNode; className?: string }) {
    const t = INK[mode]
    return (
        <div className={cn("overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(20,20,20,0.04),0_12px_32px_-16px_rgba(20,20,20,0.18)]", mode === "dark" && "dark", className)} style={{ borderColor: t.line, background: t.ground, color: t.ink, colorScheme: mode }}>
            <div className="flex h-8 items-center gap-3 border-b px-3" style={{ borderColor: t.line, background: mode === "dark" ? "#18191b" : "#fbfaf8" }}>
                <div className="flex gap-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="size-2.5 rounded-full" style={{ background: t.line }} />
                    ))}
                </div>
                <div className="mx-auto flex h-5 min-w-0 max-w-[60%] items-center justify-center truncate rounded-full px-3 font-mono text-xs" style={{ background: mode === "dark" ? "#232426" : "#efebe6", color: t.muted }}>
                    {path}
                </div>
                <div className="w-10" aria-hidden />
            </div>
            <div className="@container relative min-w-0" style={{ aspectRatio: aspect }}>
                {children}
            </div>
        </div>
    )
}

/** A phone at 390 x 760 (scaled to fit its column), for the 390px check. */
export function PhoneFrame({ mode, children, label }: { mode: Mode; children: ReactNode; label?: string }) {
    const t = INK[mode]
    return (
        <div className="grid justify-items-center gap-2">
            <div className={cn("relative w-full max-w-[390px] overflow-hidden rounded-[2.25rem] border-[6px]", mode === "dark" && "dark")} style={{ borderColor: mode === "dark" ? "#2a2a2c" : "#1d1d1f", background: t.ground, color: t.ink, colorScheme: mode }}>
                <div className="flex h-7 items-center justify-between px-6 text-[11px]" style={{ color: t.muted }} aria-hidden>
                    <span style={sans(500)}>9:41</span>
                    <span className="h-4 w-20 rounded-full" style={{ background: mode === "dark" ? "#000" : "#1d1d1f" }} />
                    <span style={sans(500)}>5G</span>
                </div>
                <div className="@container relative" style={{ aspectRatio: "390 / 732" }}>
                    {children}
                </div>
            </div>
            {label ? <p className="text-xs text-boli-muted">{label}</p> : null}
        </div>
    )
}

/** A dashboard card shell like the app's (white / neutral-900, hairline, rounded-2xl), with a header row. */
export function DashCard({ title, meta, children, className }: { title: string; meta?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <header className="flex min-w-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h4 className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h4>
                {meta}
            </header>
            {children}
        </section>
    )
}

/** Section opener inside the tab (number, serif title, one line, the codes to answer with). */
export function GroupHead({ id, n, title, line, codes }: { id: string; n: string; title: string; line: string; codes: string }) {
    return (
        <header id={id} className="grid scroll-mt-28 gap-3 border-b border-boli-line pb-6 sm:grid-cols-[3rem_1fr_auto] sm:items-end sm:gap-x-4">
            <span className="font-mono text-xs text-boli-muted sm:pb-2">{n}</span>
            <div className="min-w-0">
                <h2 className="text-[34px] leading-[1.05] text-boli-ink sm:text-[40px]" style={serif(380, 96, "-0.028em")}>
                    {title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-boli-text">{line}</p>
            </div>
            <p className="text-xs text-boli-muted sm:pb-2">Answer with: {codes}</p>
        </header>
    )
}
