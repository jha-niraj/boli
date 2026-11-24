"use client"

import type { CSSProperties, ReactNode } from "react"
import { ADD_CREDIT_CHIPS } from "@/lib/boli"
import { FrameLabel } from "../_components/board"
import { DhakaFill } from "../_art/dhaka/pattern"
import { FooterF5 } from "../_art/footer/footer"
import { ComponentsSection } from "./components-section"
import { DhakaStrip, dhakaPalette, type DhakaTone } from "./dhaka-strip"
import { FaqV2 } from "./faq-v2"
import { LogoFinal } from "./logo-final"
import { Plans } from "./plans"
import { ProductCards } from "./product-cards"
import { R2Head } from "./r2-head"
import { C5 } from "./sky"
import { contrast, MONO, sans, serif, T1 } from "./t1"
import { CRIMSON, CRIMSON_ON_DARK } from "./thread-marks"

/*
 * The Final tab: everything the owner has decided, in one place - logo R2, T1, C5, the approved components, PC3,
 * plans, FAQ2, Dhaka and the F5 footer. Nothing here is an option.
 */

const JUMPS = [
    { id: "final-logo", label: "Logo R2" },
    { id: "final-type", label: "Type T1" },
    { id: "final-colour", label: "Colour C5" },
    { id: "final-components", label: "Components" },
    { id: "final-products", label: "Cards PC3" },
    { id: "r2-plans", label: "Plans" },
    { id: "r2-faq", label: "FAQ2" },
    { id: "final-dhaka", label: "Dhaka" },
    { id: "final-footer", label: "Footer F5" },
]

export function FinalSection() {
    return (
        <div className="art-root grid gap-0" style={sans()}>
            <header className="grid gap-5 pb-14">
                <p className="text-xs text-boli-muted">Final - the decided system, 24 Nov 2026</p>
                <h2 className="max-w-3xl text-[48px] leading-[1.02] text-boli-ink sm:text-[64px]" style={serif(340, 144, "-0.04em")}>
                    Boli, decided
                </h2>
                <p className="max-w-2xl text-[15px] leading-7 text-boli-text">
                    The thread R2, Fraunces Soft with Instrument Sans, the clear Himalayan sky, the approved components, PC3 cards, the credit packs, the sticky FAQ,
                    the Dhaka weave and the F5 footer. Art is on the next tab; whole screens on the one after.
                </p>
                <nav aria-label="Final sections" className="flex flex-wrap gap-2">
                    {JUMPS.map((j) => (
                        <a
                            key={j.id}
                            href={`#${j.id}`}
                            className="inline-flex h-8 cursor-pointer items-center rounded-full border border-boli-line bg-white px-3.5 text-[13px] text-boli-text transition-colors hover:border-[#d6d0c8] hover:text-boli-ink"
                            style={sans(450)}
                        >
                            {j.label}
                        </a>
                    ))}
                </nav>
            </header>
            <div className="grid gap-24">
                <LogoFinal n="01" />
                <TypeScale />
                <Palette />
                <ComponentsSection n="04" />
                <ProductCards n="05" />
                <Plans n="06" />
                <FaqV2 n="07" />
                <Dhaka />
                <section id="final-footer" className="grid scroll-mt-28 gap-8">
                    <R2Head n="09" title="Footer - F5" line="The serif word in Fraunces Soft, filled with the P1-V3 day valley (no bubbles in the letters), above the link columns." codes="F5" />
                    <div className="overflow-hidden rounded-3xl border border-boli-line">
                        <FooterF5 />
                    </div>
                </section>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------------------------------------------------------ */

const LADDER: readonly { name: string; style: CSSProperties; size: number; leading: number; spec: string; sample: string }[] = [
    { name: "Display", style: T1.display, size: 96, leading: 0.95, spec: "Fraunces Soft 360, opsz 144, -0.035em", sample: "Open AI for Nepal" },
    { name: "H2", style: T1.h2, size: 56, leading: 1.02, spec: "Fraunces Soft 380, opsz 96, -0.03em", sample: "Your OpenAI code, a new base URL" },
    { name: "H3", style: T1.h3, size: 36, leading: 1.05, spec: "Fraunces Soft 400, opsz 48, -0.02em", sample: "Kura - कुरा, conversation" },
    { name: "Card title", style: T1.card, size: 24, leading: 1.1, spec: "Fraunces Soft 420, opsz 36, -0.015em", sample: "Credits that never expire" },
    { name: "Number", style: T1.number, size: 44, leading: 1, spec: "Fraunces Soft 400, opsz 72, -0.02em", sample: "Rs 1,000" },
    { name: "Body", style: T1.body, size: 15, leading: 1.75, spec: "Instrument Sans 400, +0.01em", sample: "Ask the way you talk - English, Romanized Nepali or both." },
    { name: "Label", style: T1.label, size: 13, leading: 1.4, spec: "Instrument Sans 450, +0.01em", sample: "Start free - 100 credits" },
    { name: "Caption", style: sans(400), size: 12, leading: 1.5, spec: "Instrument Sans 400, 12px (the floor)", sample: "64 tokens - 0.0004 credits" },
    { name: "Code", style: { fontFamily: MONO }, size: 13, leading: 1.6, spec: "Geist Mono 400", sample: "POST /v1/chat/completions" },
]

function TypeScale() {
    return (
        <section id="final-type" className="grid scroll-mt-28 gap-8">
            <R2Head n="02" title="Type - T1" line="Fraunces with SOFT 100 (WONK off) for display, optical size set by hand; Instrument Sans for everything else. Weights stay light: nothing above 500." codes="T1" />
            <div className="overflow-hidden rounded-3xl border border-boli-line bg-white">
                {LADDER.map((row, i) => (
                    <div key={row.name} className="grid gap-2 px-6 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-6" style={{ borderTop: i ? "1px solid #e6e1db" : undefined }}>
                        <div className="grid gap-0.5">
                            <span className="text-sm text-boli-ink" style={sans(450)}>
                                {row.name}
                            </span>
                            <span className="text-xs text-boli-muted">
                                {row.size}px - {row.spec}
                            </span>
                        </div>
                        <p className="min-w-0 truncate text-boli-ink" style={{ ...row.style, fontSize: row.size, lineHeight: row.leading }}>
                            {row.sample}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------------------------------------------------------ */

const GROUND = "#f7f5f3"
const WHITE = "#ffffff"
const DARK_GROUND = "#121314"

type Swatch = { token: string; hex: string; use: string; on: readonly { label: string; bg: string; min: number }[] }

const ACCENT: readonly Swatch[] = [
    { token: "--boli-sky", hex: C5.fill, use: "Bars, focus rings, the hero wash. Not for text.", on: [{ label: "white", bg: WHITE, min: 3 }] },
    {
        token: "--boli-sky-text",
        hex: C5.text,
        use: "Links, kickers, small accents in text.",
        on: [
            { label: "ground", bg: GROUND, min: 4.5 },
            { label: "white", bg: WHITE, min: 4.5 },
            { label: "soft", bg: C5.soft, min: 4.5 },
        ],
    },
    { token: "--boli-sky-soft", hex: C5.soft, use: "Badges, panels, the composer ring.", on: [] },
    { token: "--boli-sky-wash", hex: C5.wash, use: "Gradients behind product slices.", on: [] },
    { token: "--boli-sky-dark", hex: C5.dark, use: "Text and bars in dark mode.", on: [{ label: "#121314", bg: DARK_GROUND, min: 4.5 }] },
    { token: "--boli-sky-dark-soft", hex: C5.darkSoft, use: "Tints in dark mode.", on: [] },
]

const NEUTRAL: readonly Swatch[] = [
    { token: "--boli-ink", hex: "#141414", use: "Headings, primary buttons.", on: [{ label: "ground", bg: GROUND, min: 4.5 }] },
    { token: "--boli-text", hex: "#3a3a3a", use: "Body text.", on: [{ label: "ground", bg: GROUND, min: 4.5 }] },
    { token: "--boli-muted", hex: "#6b6560", use: "Meta lines, captions.", on: [{ label: "ground", bg: GROUND, min: 4.5 }] },
    { token: "--boli-line", hex: "#e6e1db", use: "Hairlines and card borders.", on: [] },
    { token: "--boli-ground", hex: GROUND, use: "The warm off-white page.", on: [] },
    { token: "--boli-crimson", hex: CRIMSON, use: "The logo's dot only (and a failed state).", on: [{ label: "white", bg: WHITE, min: 4.5 }] },
    { token: "--boli-crimson-dark", hex: CRIMSON_ON_DARK, use: "The dot on near-black.", on: [{ label: "#121314", bg: DARK_GROUND, min: 3 }] },
]

function Ratio({ fg, bg, label, min }: { fg: string; bg: string; label: string; min: number }) {
    const r = contrast(fg, bg)
    const pass = r >= min
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-boli-text">
            <span aria-hidden className="size-3 rounded-full" style={{ background: bg, boxShadow: "inset 0 0 0 1px rgba(20,20,20,0.12)" }} />
            on {label} {r.toFixed(2)}:1
            <span className={pass ? "text-boli-ink" : "text-[#a50e26]"}>{pass ? `passes ${min}` : `below ${min}`}</span>
        </span>
    )
}

function SwatchRow({ s }: { s: Swatch }) {
    return (
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-[3.5rem_12rem_1fr] sm:items-center">
            <span aria-hidden className="h-10 w-14 rounded-xl" style={{ background: s.hex, boxShadow: "inset 0 0 0 1px rgba(20,20,20,0.08)" }} />
            <div className="grid gap-0.5">
                <span className="text-xs text-boli-ink" style={{ fontFamily: MONO }}>
                    {s.token}
                </span>
                <span className="text-xs text-boli-muted" style={{ fontFamily: MONO }}>
                    {s.hex}
                </span>
            </div>
            <div className="grid gap-1.5">
                <span className="text-sm text-boli-text">{s.use}</span>
                {s.on.length ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {s.on.map((o) => (
                            <Ratio key={o.label} fg={s.hex} bg={o.bg} label={o.label} min={o.min} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function Palette() {
    return (
        <section id="final-colour" className="grid scroll-mt-28 gap-8">
            <R2Head n="03" title="Colour - C5, clear Himalayan sky" line={`${C5.note} Crimson stays in the logo's dot. Every ratio below is computed on the page.`} codes="C5" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Accent">
                    {ACCENT.map((s) => (
                        <SwatchRow key={s.token} s={s} />
                    ))}
                </Panel>
                <Panel title="Ink, ground and the one red">
                    {NEUTRAL.map((s) => (
                        <SwatchRow key={s.token} s={s} />
                    ))}
                </Panel>
            </div>
        </section>
    )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-3xl border border-boli-line bg-white">
            <p className="border-b border-boli-line px-5 py-3 text-sm text-boli-ink" style={sans(450)}>
                {title}
            </p>
            <div className="divide-y divide-boli-line">{children}</div>
        </div>
    )
}

/* ------------------------------------------------------------------------------------------------------------------ */

const TONES: readonly { tone: DhakaTone; label: string; note: string }[] = [
    { tone: "sky", label: "Sky", note: "Ink stripes, C5 in the triangles, sand as the second thread. Pack cards, PC3 edges, Kura suggestions." },
    { tone: "tonal", label: "Tonal", note: "Ink and sand only. Quiet pages, the 'Next' product, dividers in docs." },
    { tone: "night", label: "Night", note: "For dark surfaces: Kura in dark mode, the dark Billing page." },
]

function Dhaka() {
    return (
        <section id="final-dhaka" className="grid scroll-mt-28 gap-8">
            <R2Head
                n="08"
                title="Dhaka"
                line="The weave of the topi as a pixel tile: a slim band for edges and a full tile for fills, tinted by C5. DhakaStrip (tone, scale) and DhakaFill (palette, scale) are the two pieces."
            />
            <div className="grid gap-3 md:grid-cols-3">
                {TONES.map((t) => (
                    <div key={t.tone} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white">
                        <DhakaStrip sky={C5} tone={t.tone} scale={2} />
                        <div className="grid gap-1 p-5">
                            <p className="text-[22px] leading-tight text-boli-ink" style={T1.card}>
                                {t.label}
                            </p>
                            <p className="text-sm leading-6 text-boli-text">{t.note}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
                <div className="grid content-start gap-2">
                    <FrameLabel>Full tile, sky tone, as a fill</FrameLabel>
                    <div className="h-56 overflow-hidden rounded-3xl border border-boli-line">
                        <DhakaFill palette={dhakaPalette(C5, "sky")} scale={4} />
                    </div>
                </div>
                <div className="grid content-start gap-2">
                    <FrameLabel>On pack cards</FrameLabel>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {ADD_CREDIT_CHIPS.slice(0, 3).map((amount) => (
                            <div key={amount} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-boli-line bg-white">
                                <DhakaStrip sky={C5} tone="sky" scale={2} tile="full" />
                                <div className="grid gap-1 p-5">
                                    <p className="text-3xl text-boli-ink" style={T1.number}>
                                        Rs {amount.toLocaleString("en-US")}
                                    </p>
                                    <p className="text-sm text-boli-text">{amount.toLocaleString("en-US")} credits</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
