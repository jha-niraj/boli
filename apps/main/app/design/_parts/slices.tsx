"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"
import { API_PATHS, BOLI_CHAT, costMicro, MICRO_PER_CREDIT } from "@/lib/boli"
import type { Sky } from "./sky"
import { MONO, sans, serif } from "./t1"
import { CRIMSON, ThreadMark } from "./thread-marks"

/*
 * Tiny, real-looking slices of the product. Each sits on whatever panel the card gives it and fills its width; the
 * copy is real Boli copy (Romanized Nepali where a person would type it). Motion plays once on view and is skipped
 * under prefers-reduced-motion.
 */

export const KURA_Q = "mero exam sakiyo, aba k garne?"
export const KURA_A = "Badhai cha! Aaja ek din aaram gara. Result aauna aghi naya kura sikna suru garna sakchau - coding, driving, ki guitar?"

/** Kura: one question, one reply from the thread avatar. */
export function KuraSlice({ sky, compact = false }: { sky: Sky; compact?: boolean }) {
    const reduce = useReducedMotion()
    return (
        <div className="grid gap-2.5" style={sans()}>
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
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-boli-ink shadow-[0_1px_2px_rgba(20,20,20,0.08)]">
                    <ThreadMark code="R2" px={16} accent={CRIMSON} />
                </span>
                <p className={cn("min-w-0 text-[13px] leading-5 text-boli-ink", compact && "line-clamp-2")}>
                    {KURA_A}
                    <span aria-hidden className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse motion-reduce:animate-none" style={{ background: sky.text }} />
                </p>
            </motion.div>
        </div>
    )
}

const STREAM = ["Namaste! ", "K cha ", "khabar? ", "Ma Boli ho."]
const IN_TOK = 18
const OUT_TOK = 42

/** The API: a streaming response with its token count and real cost. */
export function ApiSlice({ sky }: { sky: Sky }) {
    const reduce = useReducedMotion()
    const micro = costMicro(BOLI_CHAT, IN_TOK, OUT_TOK)
    const rupees = (micro / MICRO_PER_CREDIT).toFixed(6)
    return (
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(20,20,20,0.06)]" style={{ fontFamily: MONO }}>
            <div className="flex items-center justify-between gap-2 border-b border-boli-line px-3 py-2 text-xs">
                <span className="truncate text-boli-ink">
                    <span style={{ color: sky.text }}>POST</span> {API_PATHS.chatCompletions}
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
export function ModelSlice({ sky }: { sky: Sky }) {
    const p = BOLI_CHAT.pricePerMillion
    return (
        <div className="rounded-xl bg-white p-3.5 shadow-[0_1px_2px_rgba(20,20,20,0.06)]" style={sans()}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm text-boli-ink" style={{ fontFamily: MONO }}>
                        {BOLI_CHAT.id}
                    </p>
                    <p className="truncate text-xs text-boli-muted">{BOLI_CHAT.label}</p>
                </div>
                <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs" style={{ background: sky.soft, color: sky.text }}>
                    <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" />
                    Live
                </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-boli-line">
                <div className="bg-white px-2.5 py-2">
                    <p className="text-xs text-boli-muted">Input</p>
                    <p className="text-[15px] leading-tight text-boli-ink" style={serif(420, 24, "-0.01em")}>
                        Rs {p.input} <span className="text-xs text-boli-muted" style={sans()}>/ 1M</span>
                    </p>
                </div>
                <div className="bg-white px-2.5 py-2">
                    <p className="text-xs text-boli-muted">Output</p>
                    <p className="text-[15px] leading-tight text-boli-ink" style={serif(420, 24, "-0.01em")}>
                        Rs {p.output} <span className="text-xs text-boli-muted" style={sans()}>/ 1M</span>
                    </p>
                </div>
            </div>
            <p className="mt-2.5 truncate text-xs text-boli-muted">
                {BOLI_CHAT.contextTokens.toLocaleString("en-US")} context - {BOLI_CHAT.licence}
            </p>
        </div>
    )
}

const WAVE = Array.from({ length: 30 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.31)))

/** Speech (next): a waveform resolving into Romanized text. */
export function SpeechSlice({ sky }: { sky: Sky }) {
    return (
        <div className="grid gap-3" style={sans()}>
            <div className="flex h-12 items-center gap-[3px] rounded-xl bg-white px-3 shadow-[0_1px_2px_rgba(20,20,20,0.06)]" aria-hidden>
                {WAVE.map((h, i) => (
                    <span
                        key={i}
                        className="w-[3px] shrink-0 rounded-full"
                        style={{ height: `${Math.round(h * 28)}px`, background: i < 18 ? sky.text : "#d6cfc5", opacity: i < 18 ? 1 - i * 0.03 : 1 }}
                    />
                ))}
            </div>
            <p className="text-[13px] leading-5 text-boli-ink">
                Bholi bihana saat baje <span className="text-boli-muted">bhetaun hai...</span>
            </p>
        </div>
    )
}
