"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { FlagsScene, NamasteBubble } from "../art/status/scenes"
import { BoliAvatar, THREAD, threadPath } from "../boli-mark"
import { serif } from "../type"

/*
 * Boli's WHOLE-PAGE loaders (owner picks, 2026-11-24, /design Loaders F1 / F2 / F4) - the AppLoader tier in this app.
 * A region with a shape still gets its skeleton (AGENTS.md section 10); these fill the screen only where the app shows
 * a whole-page loader: the (main) group's fallback route loader, the hand-off after sign-in.
 *
 *   F1  BoliAppLoader  the R2 thread draws itself, the crimson dot pops with a ring    app routes, signing in
 *   F4  KuraLoader     Kura's pixel bubble types three dots, then says "namaste"       opening Kura
 *   F2  HomeLoader     prayer flags lifting one after another down the string         Home
 *
 * Each has one line of copy that changes every ~2s (aria-live). Under reduced motion the art rests on a frame that
 * reads and the line holds still.
 */

/** True when the person asked for less motion (the OS setting). The in-app setting is CSS (appearance-style.tsx). */
function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        const q = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReduced(q.matches)
        const on = () => setReduced(q.matches)
        q.addEventListener("change", on)
        return () => q.removeEventListener("change", on)
    }, [])
    return reduced
}

/** One line of loader copy that changes every `ms`, fading up; holds the first line under reduced motion. */
function RotatingLine({ lines, ms = 2000 }: { lines: readonly string[]; ms?: number }) {
    const reduced = useReducedMotion()
    const [i, setI] = useState(0)
    useEffect(() => {
        if (reduced || lines.length < 2) {
            setI(0)
            return
        }
        const t = window.setInterval(() => setI((n) => (n + 1) % lines.length), ms)
        return () => window.clearInterval(t)
    }, [reduced, lines.length, ms])
    const line = lines[i] ?? ""
    return (
        <p aria-live="polite" className="min-h-[1.5em] text-[clamp(1.125rem,2.4vw,1.75rem)] leading-tight text-neutral-900 dark:text-neutral-100" style={serif(400, 48, "-0.02em")}>
            <span key={line} className="bl-line inline-block">
                {line}
            </span>
        </p>
    )
}

export type FullPageLoaderProps = {
    /** Cover the viewport (default). False fills its parent (inside the shell, beside the rail). */
    fullScreen?: boolean
    /** The rotating copy; each kind has its own. */
    lines?: readonly string[]
    /** A quiet line under the copy. */
    foot?: ReactNode
    className?: string
}

/** The centred stage every full-page loader shares: art, then the rotating line, then an optional quiet foot. */
function Stage({ art, lines, foot, fullScreen = true, className }: FullPageLoaderProps & { art: ReactNode; lines: readonly string[] }) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn(
                "bl-enter flex w-full flex-col items-center justify-center gap-6 bg-background px-6 text-center text-neutral-900 dark:text-neutral-100",
                fullScreen ? "fixed inset-0 z-[100]" : "min-h-[var(--app-page-h,60dvh)]",
                className,
            )}
        >
            {art}
            <div className="grid justify-items-center gap-1.5">
                <RotatingLine lines={lines} />
                {foot ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{foot}</p> : null}
            </div>
        </div>
    )
}

const FULL = threadPath(THREAD.full)

export const APP_LOADER_LINES = ["Opening your page...", "Ghanti bajdai cha...", "Counting your credits...", "Almost there..."] as const

/** F1 - the R2 thread draws itself in one stroke, the crimson dot pops with a soft ring, it rests, and again. */
export function BoliAppLoader({ lines = APP_LOADER_LINES, ...props }: FullPageLoaderProps) {
    const dot = THREAD.full.dot
    return (
        <Stage
            {...props}
            lines={lines}
            art={
                <svg viewBox="0 0 48 48" className="size-20 overflow-visible sm:size-24" fill="none" aria-hidden>
                    <path d={FULL} pathLength={1} className="bl-f1-path" stroke="currentColor" strokeWidth={THREAD.full.stroke} strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={dot.cx} cy={dot.cy} r={dot.r} className="bl-f1-ring stroke-boli-crimson dark:stroke-boli-crimson-lift" strokeWidth={0.8} />
                    <circle cx={dot.cx} cy={dot.cy} r={dot.r} className="bl-f1-dot fill-boli-crimson dark:fill-boli-crimson-lift" />
                </svg>
            }
        />
    )
}

export const KURA_LOADER_LINES = ["Kura is waking up...", "Finding the right words...", "Ghanti bajdai cha...", "Almost there..."] as const

/** F4 - Kura's bubble types three dots, then says namaste, over the Boli avatar. */
export function KuraLoader({ lines = KURA_LOADER_LINES, ...props }: FullPageLoaderProps) {
    return (
        <Stage
            {...props}
            lines={lines}
            art={
                <div className="flex flex-col items-start gap-1.5">
                    <NamasteBubble className="w-40 sm:w-52" />
                    <BoliAvatar size={30} className="ml-3" />
                </div>
            }
        />
    )
}

export const HOME_LOADER_LINES = ["Hanging the flags...", "Counting your credits...", "Ghanti bajdai cha...", "Almost there..."] as const

/** F2 - a string of pixel prayer flags over the hills; a lift runs down the string flag by flag. */
export function HomeLoader({ lines = HOME_LOADER_LINES, ...props }: FullPageLoaderProps) {
    return (
        <Stage
            {...props}
            lines={lines}
            art={<FlagsScene className="w-full max-w-[26rem] overflow-hidden rounded-[1.25rem] border border-neutral-200 dark:border-neutral-800" />}
        />
    )
}
