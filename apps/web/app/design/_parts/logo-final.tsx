import { PanelLeft, Plus, X } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { CodeTag, FrameLabel } from "../_components/board"
import { R2Head } from "./r2-head"
import { sans, serif } from "./t1"
import { CRIMSON, CRIMSON_ON_DARK, LOCKUP, THREAD, ThreadMark, type ThreadCode } from "./thread-marks"

const DARK = "#121314"
const SIZES = [16, 24, 32, 64, 128] as const

/** "Boli" set beside the thread, tuned per refinement. `size` is the font size in px. */
export function ThreadLockup({ code = "R2", size, tone = "light" }: { code?: ThreadCode; size: number; tone?: "light" | "dark" }) {
    const l = LOCKUP[code]
    const mark = Math.round(size * l.markEm)
    return (
        <span className={cn("inline-flex items-center", tone === "light" ? "text-boli-ink" : "text-[#f5f3f0]")} style={{ gap: size * l.gapEm }}>
            <ThreadMark code={code} px={mark} accent={tone === "light" ? CRIMSON : CRIMSON_ON_DARK} />
            <span className="leading-none" style={{ ...serif(l.weight, l.opsz, l.tracking), fontSize: size }}>
                Boli
            </span>
        </span>
    )
}

/** The chosen mark, R2 "Bo-li": every size, both grounds, lockups, app icons, favicon, rail and nav. */
export function LogoFinal({ n = "01" }: { n?: string }) {
    return (
        <section id="final-logo" className="grid scroll-mt-28 gap-8">
            <R2Head n={n} title="Logo - R2, Bo-li" line={THREAD.R2.line} codes="R2" />
            <RefinementCard code="R2" />
        </section>
    )
}

function RefinementCard({ code }: { code: ThreadCode }) {
    const t = THREAD[code]
    return (
        <article className=" overflow-hidden rounded-3xl border border-boli-line bg-white">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-boli-line px-6 py-5">
                <CodeTag code={code} />
                <h4 className="text-[22px] leading-none text-boli-ink" style={serif(420, 36, "-0.015em")}>
                    {t.name}
                </h4>
                <p className="w-full text-sm leading-6 text-boli-text">{t.line}</p>
            </header>

            {/* Sizes on light and on near-black. 16 and 24 are the small cut. */}
            <div className="grid gap-px bg-boli-line md:grid-cols-2">
                {(["light", "dark"] as const).map((tone) => (
                    <div key={tone} className="grid gap-4 p-6" style={{ background: tone === "light" ? "#f7f5f3" : DARK }}>
                        <p className="text-xs" style={{ color: tone === "light" ? "#6b6560" : "#8f8a85" }}>
                            {tone === "light" ? "Light" : "Near-black"} - 16, 24 (small cut), 32, 64, 128px
                        </p>
                        <div className="flex flex-wrap items-end gap-5">
                            {SIZES.map((s) => (
                                <div key={s} className="flex flex-col items-center gap-2">
                                    <ThreadMark
                                        code={code}
                                        px={s}
                                        className={tone === "light" ? "text-boli-ink" : "text-[#f5f3f0]"}
                                        accent={tone === "light" ? CRIMSON : CRIMSON_ON_DARK}
                                        title={`${code} at ${s}px`}
                                    />
                                    <span className="font-mono text-xs leading-none" style={{ color: tone === "light" ? "#6b6560" : "#8f8a85" }}>
                                        {s}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 border-t border-boli-line p-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="grid content-start gap-2">
                    <FrameLabel>Lockup - {LOCKUP[code].note}</FrameLabel>
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-boli-line bg-boli-line sm:grid-cols-2">
                        <div className="flex h-32 items-center justify-center bg-boli-ground px-4">
                            <ThreadLockup code={code} size={44} />
                        </div>
                        <div className="flex h-32 items-center justify-center px-4" style={{ background: DARK }}>
                            <ThreadLockup code={code} size={44} tone="dark" />
                        </div>
                    </div>
                </div>
                <div className="grid content-start gap-2">
                    <FrameLabel>App icon - ink tile, white tile</FrameLabel>
                    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-boli-line bg-boli-ground p-4">
                        {[96, 56].map((s) => (
                            <AppTile key={`ink-${s}`} code={code} size={s} tone="ink" />
                        ))}
                        {[96, 56].map((s) => (
                            <AppTile key={`white-${s}`} code={code} size={s} tone="white" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 border-t border-boli-line p-6 md:grid-cols-2">
                <div className="grid content-start gap-2">
                    <FrameLabel>Favicon in a browser tab</FrameLabel>
                    <BrowserTab code={code} tone="light" />
                    <BrowserTab code={code} tone="dark" />
                </div>
                <div className="grid content-start gap-2">
                    <FrameLabel>Rail header, 40px</FrameLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <RailHeader code={code} tone="light" />
                        <RailHeader code={code} tone="dark" />
                    </div>
                </div>
            </div>

            <div className="grid gap-2 border-t border-boli-line p-6">
                <FrameLabel>On the landing nav</FrameLabel>
                <LandingNav code={code} />
            </div>
        </article>
    )
}

/** An app icon: a squircle-ish tile (22% radius) with the thread at 58% of the tile. */
function AppTile({ code, size, tone }: { code: ThreadCode; size: number; tone: "ink" | "white" }) {
    return (
        <div
            className={cn("flex items-center justify-center", tone === "white" ? "text-boli-ink" : "text-white")}
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.225,
                background: tone === "ink" ? "#141414" : "#ffffff",
                boxShadow: tone === "ink" ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(20,20,20,0.18)" : "inset 0 0 0 1px #e6e1db, 0 1px 2px rgba(20,20,20,0.06)",
            }}
        >
            <ThreadMark code={code} px={Math.round(size * 0.58)} accent={tone === "ink" ? CRIMSON_ON_DARK : CRIMSON} title={`${code} app icon`} />
        </div>
    )
}

function BrowserTab({ code, tone }: { code: ThreadCode; tone: "light" | "dark" }) {
    const dark = tone === "dark"
    return (
        <div className={cn("overflow-hidden rounded-xl border", dark ? "border-[#2a2b2e] bg-[#202124]" : "border-boli-line bg-[#e8e5e1]")}>
            <div className="flex items-end gap-1 px-2 pt-2">
                <div className={cn("flex h-8 min-w-0 flex-1 items-center gap-2 rounded-t-lg px-3", dark ? "bg-[#35363a] text-[#e8eaed]" : "bg-white text-boli-ink")}>
                    <ThreadMark code={code} px={16} className="shrink-0" accent={dark ? CRIMSON_ON_DARK : CRIMSON} />
                    <span className="min-w-0 flex-1 truncate text-xs" style={sans(400, "0")}>
                        Boli - Open AI for Nepal
                    </span>
                    <X aria-hidden strokeWidth={1.75} className="size-3 shrink-0 opacity-60" />
                </div>
                <div className={cn("flex h-8 w-24 items-center gap-2 rounded-t-lg px-3 opacity-70", dark ? "text-[#9aa0a6]" : "text-boli-muted")}>
                    <span className={cn("size-3.5 shrink-0 rounded-full", dark ? "bg-[#5f6368]" : "bg-[#c9c4be]")} />
                    <span className="truncate text-xs">Docs</span>
                </div>
                <Plus aria-hidden strokeWidth={1.75} className={cn("mb-2 size-3.5 shrink-0", dark ? "text-[#9aa0a6]" : "text-boli-muted")} />
            </div>
            <div className={cn("flex h-9 items-center px-3", dark ? "bg-[#35363a]" : "bg-white")}>
                <span className={cn("h-6 flex-1 truncate rounded-full px-3 text-xs leading-6", dark ? "bg-[#202124] text-[#9aa0a6]" : "bg-boli-ground text-boli-muted")}>bolihq.com/kura</span>
            </div>
        </div>
    )
}

function RailHeader({ code, tone }: { code: ThreadCode; tone: "light" | "dark" }) {
    const dark = tone === "dark"
    return (
        <div className={cn("overflow-hidden rounded-xl border", dark ? "border-[#2a2b2e]" : "border-boli-line bg-white")} style={dark ? { background: DARK } : undefined}>
            <div className="flex h-10 items-center justify-between px-3">
                <ThreadLockup code={code} size={19} tone={tone} />
                <PanelLeft aria-hidden strokeWidth={1.5} className={cn("size-4", dark ? "text-[#8f8a85]" : "text-boli-muted")} />
            </div>
            <div className="grid gap-0.5 px-2 pb-2" style={sans(400, "0.005em")}>
                {["Kura", "API keys", "Usage", "Billing"].map((item, i) => (
                    <div
                        key={item}
                        className={cn(
                            "flex h-8 items-center rounded-lg px-2.5 text-[13px]",
                            i === 0 ? (dark ? "bg-white/[0.06] text-white" : "bg-boli-ground text-boli-ink") : dark ? "text-[#8f8a85]" : "text-boli-muted",
                        )}
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    )
}

/** The public nav bar: lockup left, four links, sign in and the near-black pill on the right. */
export function LandingNav({ code = "R2", className }: { code?: ThreadCode; className?: string }) {
    return (
        <div className={cn("flex h-16 min-w-0 items-center justify-between gap-6 rounded-2xl border border-boli-line bg-boli-ground/80 px-5", className)} style={sans()}>
            <div className="flex min-w-0 items-center gap-8">
                <ThreadLockup code={code} size={24} />
                <nav className="hidden items-center gap-6 text-sm text-boli-text md:flex">
                    {["Kura", "API", "Docs", "Pricing", "About"].map((l) => (
                        <span key={l} className="cursor-pointer transition-colors hover:text-boli-ink">
                            {l}
                        </span>
                    ))}
                </nav>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <span className="hidden h-9 cursor-pointer items-center px-3 text-sm text-boli-ink sm:inline-flex">Sign in</span>
                <span className="inline-flex h-9 cursor-pointer items-center rounded-full bg-boli-ink px-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" style={sans(450)}>
                    Start free
                </span>
            </div>
        </div>
    )
}
