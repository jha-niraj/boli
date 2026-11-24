"use client"

import type { ReactNode } from "react"
import { BoliAvatar, THREAD, threadPath } from "@/components/brand/boli-mark"
import { BoliLogo } from "@/components/brand/boli-logo"
import { serif, sans } from "../_parts/t1"
import { BubbleArt, FlagsArt, SunriseArt, WeaveArt } from "./art"
import { Duo, INK, LOADER_LINES, OptionHead, RotatingLine, WindowFrame, type Mode } from "./kit"

/*
 * F1-F6: what fills the screen while a whole route loads (the AppLoader slot). Each is about the product - the thread,
 * the flags, the weave, Kura speaking, the valley at sunrise - with one line of copy that changes every ~2s.
 * Plus the route-change top bar (NavProgress) in the sky.
 */

const FULL = threadPath(THREAD.full)

/** The centred stage every full-page loader shares: art, then the rotating line, then an optional quiet foot. */
function Stage({ mode, art, lines, foot }: { mode: Mode; art: ReactNode; lines: readonly string[]; foot?: ReactNode }) {
    const t = INK[mode]
    return (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-[3.2cqw] px-6 text-center">
            {art}
            <div className="grid justify-items-center gap-1.5">
                <RotatingLine lines={lines} className="text-[clamp(17px,3.1cqw,28px)] leading-tight" style={{ ...serif(400, 48, "-0.02em"), color: t.ink }} />
                {foot ? (
                    <p className="text-xs" style={{ ...sans(), color: t.muted }}>
                        {foot}
                    </p>
                ) : null}
            </div>
        </div>
    )
}

/** F1 - the R2 thread draws itself, then the crimson dot pops with a ring. */
function F1({ mode }: { mode: Mode }) {
    const dot = THREAD.full.dot
    return (
        <Stage
            mode={mode}
            lines={LOADER_LINES}
            foot="boli-chat - Gemma 4 E4B, 4-bit"
            art={
                <svg viewBox="0 0 48 48" className="w-[13cqw] min-w-14 max-w-28 overflow-visible" fill="none" aria-hidden style={{ color: INK[mode].ink }}>
                    <path d={FULL} pathLength={1} className="ld-f1-path" stroke="currentColor" strokeWidth={THREAD.full.stroke} strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={dot.cx} cy={dot.cy} r={dot.r} className="ld-f1-ring stroke-boli-crimson dark:stroke-boli-crimson-lift" strokeWidth={0.8} />
                    <circle cx={dot.cx} cy={dot.cy} r={dot.r} className="ld-f1-dot fill-boli-crimson dark:fill-boli-crimson-lift" />
                </svg>
            }
        />
    )
}

function Vignette({ mode, children, className }: { mode: Mode; children: ReactNode; className?: string }) {
    return (
        <div className={`overflow-hidden rounded-[1.25rem] border ${className ?? ""}`} style={{ borderColor: INK[mode].line }}>
            {children}
        </div>
    )
}

/** F2 - prayer flags on a string, a lift running down it flag by flag. */
function F2({ mode }: { mode: Mode }) {
    return (
        <Stage
            mode={mode}
            lines={["Hanging the flags...", "Waking the model...", "Ghanti bajdai cha...", "Almost there..."]}
            art={
                <Vignette mode={mode} className="w-[46cqw] max-w-[26rem]">
                    <FlagsArt mode={mode} className="aspect-[96/40] w-full" />
                </Vignette>
            }
        />
    )
}

/** F3 - the Dhaka weave building row by row, like cloth coming off the loom. */
function F3({ mode }: { mode: Mode }) {
    return (
        <Stage
            mode={mode}
            lines={["Weaving your page...", "Counting your credits...", "Ghanti bajdai cha...", "Almost there..."]}
            art={<WeaveArt mode={mode} ground={INK[mode].ground} className="aspect-[72/35] w-[34cqw] max-w-[19rem]" />}
        />
    )
}

/** F4 - Kura's bubble types three dots, then says namaste; the Boli avatar under its tail. */
function F4({ mode }: { mode: Mode }) {
    return (
        <Stage
            mode={mode}
            lines={["Kura is waking up...", "Brewing your answer...", "Finding the right words...", "Almost there..."]}
            art={
                <div className="flex flex-col items-start gap-[0.6cqw]">
                    <BubbleArt mode={mode} className="w-[24cqw] min-w-32 max-w-[13rem]" />
                    <BoliAvatar size={30} className="ml-[1.2cqw]" />
                </div>
            }
        />
    )
}

/** F5 - the valley strip with the sun climbing across; the bar under it fills with the sun. */
function F5({ mode }: { mode: Mode }) {
    const t = INK[mode]
    return (
        <Stage
            mode={mode}
            lines={["Sunrise over the valley...", "Waking the model...", "Warming up boli-chat...", "Almost there..."]}
            art={
                <div className="grid w-[50cqw] max-w-[28rem] gap-2.5">
                    <Vignette mode={mode}>
                        <SunriseArt mode={mode} className="aspect-[120/36] w-full" />
                    </Vignette>
                    <div className="h-[3px] overflow-hidden rounded-full" style={{ background: t.track }}>
                        <div className="ld-sunbar h-full rounded-full bg-boli-sky dark:bg-boli-sky-dark" />
                    </div>
                </div>
            }
        />
    )
}

/** F6 - minimal: the logo and a thin sky sliver running along a track. */
function F6({ mode }: { mode: Mode }) {
    const t = INK[mode]
    return (
        <Stage
            mode={mode}
            lines={LOADER_LINES}
            art={
                <div className="grid justify-items-center gap-[2.4cqw]">
                    <BoliLogo size={34} />
                    <div className="h-[2px] w-[18cqw] min-w-28 max-w-44 overflow-hidden rounded-full" style={{ background: t.track }}>
                        <div className="ld-sliver h-full w-2/5 rounded-full bg-boli-sky dark:bg-boli-sky-dark" />
                    </div>
                </div>
            }
        />
    )
}

const FULL_PAGE: readonly { code: string; name: string; line: string; C: (p: { mode: Mode }) => ReactNode; path: string; pick?: string }[] = [
    { code: "F1", name: "The thread draws itself", line: "The R2 mark draws in one stroke, the crimson dot pops with a soft ring, it rests, and again. The brand, nothing else.", C: F1, path: "boli.app/kura", pick: "Pick for app routes" },
    { code: "F2", name: "Prayer flags", line: "A string of pixel flags over the hills; a lift runs down the string flag by flag. Warm, very Nepal.", C: F2, path: "boli.app/home" },
    { code: "F3", name: "Dhaka on the loom", line: "The weave appears a row at a time as the cover lifts, a sky thread riding the edge. Calm and patterned.", C: F3, path: "boli.app/billing" },
    { code: "F4", name: "Kura says namaste", line: "Kura's pixel bubble types three dots, then says namaste, over the Boli avatar. Made for opening Kura.", C: F4, path: "boli.app/kura", pick: "Pick for Kura" },
    { code: "F5", name: "Sunrise is the progress", line: "The sun climbs across a strip of the valley a pixel at a time; the sky bar fills with it. Good for the long first wake.", C: F5, path: "boli.app/kura" },
    { code: "F6", name: "Logo and a sliver", line: "The lockup over a thin sky sliver. The fastest to read; the least about the product.", C: F6, path: "boli.app/keys" },
]

export function FullPageBoard() {
    return (
        <div className="grid gap-16">
            {FULL_PAGE.map((f) => (
                <article key={f.code} className="grid min-w-0 gap-5">
                    <OptionHead code={f.code} name={f.name} line={f.line} pick={f.pick} />
                    <Duo>
                        {(mode) => (
                            <WindowFrame mode={mode} path={f.path}>
                                <f.C mode={mode} />
                            </WindowFrame>
                        )}
                    </Duo>
                </article>
            ))}
            <NavProgressSample />
        </div>
    )
}

/* ------------------------------------------------------------------------------------------------ NavProgress */

/** A quiet page under the bar so it reads in place: the rail, a header, a stat band and rows (all at rest). */
function MiniPage({ mode }: { mode: Mode }) {
    const t = INK[mode]
    const block = mode === "dark" ? "#232426" : "#efebe6"
    return (
        <div className="absolute inset-0 flex">
            <div className="flex w-[22%] flex-col gap-2 p-3" style={{ background: mode === "dark" ? "#161718" : "#fbfaf8", boxShadow: "1px 0 12px rgba(0,0,0,0.06)" }}>
                <BoliLogo size={15} className="mb-2" />
                {["Home", "Kura", "API keys", "Usage", "Billing"].map((l, i) => (
                    <span key={l} className="truncate rounded-lg px-2 py-1 text-xs" style={{ ...sans(i === 3 ? 500 : 400), color: i === 3 ? t.ink : t.muted, background: i === 3 ? block : undefined }}>
                        {l}
                    </span>
                ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                <p className="text-base font-semibold" style={{ color: t.ink }}>
                    Usage
                </p>
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border" style={{ borderColor: t.line, background: t.line }}>
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="grid gap-1.5 p-3" style={{ background: t.card }}>
                            <span className="h-2 w-1/2 rounded-full" style={{ background: block }} />
                            <span className="h-3.5 w-3/4 rounded-full" style={{ background: block }} />
                        </div>
                    ))}
                </div>
                <div className="grid gap-2 rounded-xl border p-3" style={{ borderColor: t.line, background: t.card }}>
                    {[0.8, 0.6, 0.7, 0.5].map((w, i) => (
                        <span key={i} className="h-2.5 rounded-full" style={{ width: `${w * 100}%`, background: block }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function NavProgressSample() {
    return (
        <article className="grid min-w-0 gap-5">
            <OptionHead
                code="N1"
                name="Route bar in the sky"
                line="NavProgress restyled: a 2px sky bar with a soft glow at its tip, easing to about 80% and waiting, then finishing and fading. No track, no spinner beside it."
            />
            <Duo>
                {(mode) => (
                    <WindowFrame mode={mode} path="boli.app/usage" aspect="900 / 380">
                        <MiniPage mode={mode} />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px]">
                            <div
                                className="ld-nav h-full w-full bg-boli-sky dark:bg-boli-sky-dark"
                                style={{ boxShadow: mode === "dark" ? "0 0 10px rgba(108,178,239,0.7)" : "0 0 8px rgba(61,143,214,0.55)" }}
                            />
                        </div>
                    </WindowFrame>
                )}
            </Duo>
        </article>
    )
}
