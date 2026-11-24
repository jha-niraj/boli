"use client"

import type { CSSProperties } from "react"
import { cn } from "@repo/ui/lib/utils"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { ModeSurface, OptionHead, type Mode } from "./kit"

/*
 * K1: one dashboard card (Balance: a label, a big figure, a hint, three rows) skeletoned three ways so the owner can
 * pick the tone. K1a is today's shared Skeleton, untouched; K1b and K1c are Boli-warm.
 */

type Bar = { w: string; h: string; round?: "full" | "lg" }

const LAYOUT: { head: Bar[]; figure: Bar; hint: Bar; rows: [Bar, Bar][] } = {
    head: [{ w: "34%", h: "0.75rem" }],
    figure: { w: "52%", h: "2rem", round: "lg" },
    hint: { w: "40%", h: "0.625rem" },
    rows: [
        [{ w: "46%", h: "0.75rem" }, { w: "16%", h: "0.75rem" }],
        [{ w: "38%", h: "0.75rem" }, { w: "14%", h: "0.75rem" }],
        [{ w: "52%", h: "0.75rem" }, { w: "18%", h: "0.75rem" }],
    ],
}

type Kind = "current" | "shimmer" | "breathe"

/** A warm block: sand on light, a warm charcoal on dark; pill-round for text lines, rounded-lg for the figure. */
function WarmBlock({ bar, mode, kind, delay }: { bar: Bar; mode: Mode; kind: Exclude<Kind, "current">; delay: number }) {
    const style: CSSProperties & Record<"--ld-delay" | "--ld-shine", string> = {
        width: bar.w,
        height: bar.h,
        background: mode === "dark" ? "#262422" : "#eeeae4",
        "--ld-delay": `${delay}s`,
        "--ld-shine": mode === "dark" ? "rgba(255,248,240,0.06)" : "rgba(255,255,255,0.75)",
    }
    return <div aria-hidden className={cn(kind === "shimmer" ? "ld-shimmer" : "ld-breathe", bar.round === "lg" ? "rounded-lg" : "rounded-full")} style={style} />
}

function Block({ bar, mode, kind, delay }: { bar: Bar; mode: Mode; kind: Kind; delay: number }) {
    if (kind === "current") return <Skeleton delay={delay} className={bar.round === "lg" ? "rounded-lg" : undefined} style={{ width: bar.w, height: bar.h }} />
    return <WarmBlock bar={bar} mode={mode} kind={kind} delay={delay} />
}

function CardSkeleton({ mode, kind }: { mode: Mode; kind: Kind }) {
    const warm = kind !== "current"
    return (
        <section
            aria-busy
            aria-label="Loading balance"
            className={cn(
                "flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white dark:bg-neutral-900",
                warm ? "border-[#ece7e0] dark:border-[#2a2826]" : "border-neutral-200 dark:border-neutral-800",
            )}
        >
            <header className={cn("flex items-center justify-between border-b px-4 py-3", warm ? "border-[#ece7e0] dark:border-[#2a2826]" : "border-neutral-200 dark:border-neutral-800")}>
                <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Balance</span>
                <Block bar={{ w: "4.5rem", h: "1.75rem" }} mode={mode} kind={kind} delay={0} />
            </header>
            <div className="grid gap-3 p-4">
                <Block bar={LAYOUT.head[0] ?? { w: "30%", h: "0.75rem" }} mode={mode} kind={kind} delay={0.05} />
                <Block bar={LAYOUT.figure} mode={mode} kind={kind} delay={0.1} />
                <Block bar={LAYOUT.hint} mode={mode} kind={kind} delay={0.15} />
                <div className={cn("mt-1 grid divide-y", warm ? "divide-[#f1ede7] dark:divide-[#242220]" : "divide-neutral-100 dark:divide-neutral-800")}>
                    {LAYOUT.rows.map(([a, b], i) => (
                        <div key={i} className="flex items-center justify-between py-2.5">
                            <Block bar={a} mode={mode} kind={kind} delay={0.2 + i * 0.08} />
                            <Block bar={b} mode={mode} kind={kind} delay={0.24 + i * 0.08} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

const KINDS: readonly { code: string; kind: Kind; name: string; line: string; pick?: string }[] = [
    { code: "K1a", kind: "current", name: "Current", line: "Today's shared Skeleton: cool neutral-200 blocks, small radius, the gk-shimmer sweep. Reads slightly grey on the warm ground." },
    { code: "K1b", kind: "shimmer", name: "Boli warm, shimmer", line: "Warm sand blocks (#eeeae4 / #262422), pill-round lines like the controls, a soft slow sweep that ripples down the card. No blue.", pick: "Recommended" },
    { code: "K1c", kind: "breathe", name: "Boli warm, breathing", line: "The same warm blocks breathing in opacity, rippled - no sweep at all. The quietest; it can read as stalled on a long wait." },
]

export function SkeletonBoard() {
    return (
        <div className="grid gap-8 lg:grid-cols-3">
            {KINDS.map((k) => (
                <article key={k.code} className="grid min-w-0 content-start gap-4">
                    <OptionHead code={k.code} name={k.name} line={k.line} pick={k.pick} />
                    <div className="grid overflow-hidden rounded-3xl border border-boli-line">
                        {(["light", "dark"] as const).map((m) => (
                            <ModeSurface key={m} mode={m} className="p-4">
                                <CardSkeleton mode={m} kind={k.kind} />
                            </ModeSurface>
                        ))}
                    </div>
                </article>
            ))}
        </div>
    )
}
