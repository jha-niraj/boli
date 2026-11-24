"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"
import { BoliLogo } from "@/components/brand/boli-logo"
import { DISPLAY } from "@/components/brand/type"
import { API_PATHS, BOLI_CHAT, costMicro, MICRO_PER_CREDIT } from "@/lib/boli"
import { SKY_SOFT_BG, SKY_TEXT } from "./tokens"

/*
 * Tiny, real-looking slices of the product for the PC3 cards (approved 2026-11-24). Real Boli copy, Romanized Nepali
 * where a person would type it. Motion plays once on view and is skipped under prefers-reduced-motion.
 */

const KURA_Q = "mero exam sakiyo, aba k garne?"
const KURA_A = "Badhai cha! Aaja ek din aaram gara. Result aauna aghi naya kura sikna suru garna sakchau - coding, driving, ki guitar?"

/** Kura: one question, one reply from the Boli mark. */
export function KuraSlice({ compact = false }: { compact?: boolean }) {
    const reduce = useReducedMotion()
    return (
        <div className="grid gap-2.5 font-sans">
            <div className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-[13px] leading-5 text-boli-ink shadow-[0_1px_2px_rgba(20,20,20,0.06)]">{KURA_Q}</p>
            </div>
            <motion.div
                className="flex items-start gap-2"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(20,20,20,0.08)]">
                    <BoliLogo wordmark={false} size={11} />
                </span>
                <p className={cn("min-w-0 text-[13px] leading-5 text-boli-ink", compact && "line-clamp-2")}>
                    {KURA_A}
                    <span aria-hidden className={cn("ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-current motion-reduce:animate-none", SKY_TEXT)} />
                </p>
            </motion.div>
        </div>
    )
}

const STREAM = ["Namaste! ", "K cha ", "khabar? ", "Ma Boli ho."]
const IN_TOK = 18
const OUT_TOK = 42

/** The API: a streaming response with its token count and its real cost. */
export function ApiSlice() {
    const reduce = useReducedMotion()
    const micro = costMicro(BOLI_CHAT, IN_TOK, OUT_TOK)
    const rupees = (micro / MICRO_PER_CREDIT).toFixed(6)
    return (
        <div className="min-w-0 overflow-hidden rounded-xl bg-white font-mono shadow-[0_1px_2px_rgba(20,20,20,0.06)]">
            <div className="flex items-center justify-between gap-2 border-b border-boli-line px-3 py-2 text-xs">
                <span className="truncate text-boli-ink">
                    <span className={SKY_TEXT}>POST</span> {API_PATHS.chatCompletions}
                </span>
                <span className="shrink-0 text-boli-muted">stream</span>
            </div>
            <div className="grid gap-0.5 px-3 py-2.5 text-xs leading-5 text-boli-text">
                {STREAM.map((t, i) => (
                    <motion.p
                        key={t}
                        className="truncate"
                        initial={reduce ? false : { opacity: 0, x: -4 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.2 + i * 0.28 }}
                    >
                        <span className="text-boli-muted">data:</span> {`{"delta":"${t}"}`}
                    </motion.p>
                ))}
                <p className="text-boli-muted">data: [DONE]</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-boli-line px-3 py-2 text-xs">
                <span className="text-boli-muted">
                    {IN_TOK} in / {OUT_TOK} out
                </span>
                <span className="tabular-nums text-boli-ink" title={`${micro} micro-credits`}>
                    Rs {rupees}
                </span>
            </div>
        </div>
    )
}

/** Models: the one live model with its rupee prices. */
export function ModelSlice() {
    const p = BOLI_CHAT.pricePerMillion
    return (
        <div className="rounded-xl bg-white p-3.5 font-sans shadow-[0_1px_2px_rgba(20,20,20,0.06)]">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-boli-ink">{BOLI_CHAT.id}</p>
                    <p className="truncate text-xs text-boli-muted">{BOLI_CHAT.label}</p>
                </div>
                <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs", SKY_SOFT_BG, SKY_TEXT)}>
                    <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" />
                    Live
                </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-boli-line">
                {(
                    [
                        ["Input", p.input],
                        ["Output", p.output],
                    ] as const
                ).map(([label, price]) => (
                    <div key={label} className="bg-white px-2.5 py-2">
                        <p className="text-xs text-boli-muted">{label}</p>
                        <p className="text-[15px] leading-tight text-boli-ink" style={DISPLAY.card}>
                            Rs {price} <span className="font-sans text-xs tracking-normal text-boli-muted">/ 1M</span>
                        </p>
                    </div>
                ))}
            </div>
            <p className="mt-2.5 truncate text-xs text-boli-muted">
                {BOLI_CHAT.contextTokens.toLocaleString("en-US")} context - {BOLI_CHAT.licence}
            </p>
        </div>
    )
}

const WAVE = Array.from({ length: 30 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.31)))

/** Speech (next): a waveform resolving into Romanized text. */
export function SpeechSlice() {
    return (
        <div className="grid gap-3 font-sans">
            <div className={cn("flex h-12 items-center gap-[3px] overflow-hidden rounded-xl bg-white px-3 shadow-[0_1px_2px_rgba(20,20,20,0.06)]", SKY_TEXT)} aria-hidden>
                {WAVE.map((h, i) => (
                    <span
                        key={i}
                        className={cn("w-[3px] shrink-0 rounded-full", i < 18 ? "bg-current" : "bg-boli-line")}
                        style={{ height: `${Math.round(h * 28)}px`, opacity: i < 18 ? 1 - i * 0.03 : 1 }}
                    />
                ))}
            </div>
            <p className="text-[13px] leading-5 text-boli-ink">
                Bholi bihana saat baje <span className="text-boli-muted">bhetaun hai...</span>
            </p>
        </div>
    )
}
