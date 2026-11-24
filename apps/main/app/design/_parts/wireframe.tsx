"use client"

import { ArrowRight, Code2, GraduationCap, Rocket, Store } from "lucide-react"
import { useState, type ReactNode } from "react"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { SITE } from "@repo/core/site"
import { BRAND, WELCOME_CREDITS } from "@/lib/boli"
import { buildSamples, SAMPLE_LANGUAGES } from "@/lib/code-samples"
import { CodeFrame, type CodeSample } from "../_components/code-tab-header"
import { Segmented } from "../_components/segmented"
import { FaqList } from "./faq-v2"
import { LandingNav } from "./logo-final"
import { FooterF5 } from "../_art/footer/footer"
import { ExpandingPixelPanels } from "../_art/story/pixel-story"
import { VALLEY_DAY } from "../_art/valley/palette"
import { ValleyHero } from "../_art/valley/valley"
import { LandingPricing } from "./plans"
import { ProductBento } from "./product-cards"
import { R2Head } from "./r2-head"
import { useSky } from "./sky"
import { sans, serif } from "./t1"

const W = 1280
type Zoom = "40" | "60" | "100"

const SAMPLES: CodeSample[] = (() => {
    const all = buildSamples({ baseUrl: SITE.url })
    return SAMPLE_LANGUAGES.map((l) => ({ id: l.id, label: l.label, code: all[l.id] }))
})()

const WHO = [
    { icon: Code2, title: "Developers", line: "Swap the base URL in the OpenAI SDK and ship a Nepali feature today." },
    { icon: GraduationCap, title: "Students", line: `${WELCOME_CREDITS} free credits go a long way on a small open model.` },
    { icon: Rocket, title: "Startups", line: "Rupee pricing you can put in a budget, and no closed model underneath." },
    { icon: Store, title: "Shops and teams", line: "Answer customers in the language they wrote in - Romanized, Devanagari or mixed." },
]

/** One section of the mock, tagged with its name and vertical padding so the rhythm can be read off the page. */
function WfSection({ n, name, pad, children, tone = "ground" }: { n: string; name: string; pad: string; children: ReactNode; tone?: "ground" | "white" }) {
    return (
        <section className="relative" style={{ background: tone === "white" ? "#ffffff" : "#f7f5f3", borderTop: "1px solid #e6e1db" }}>
            <span className="absolute right-4 top-4 z-10 rounded-full bg-boli-ink px-2.5 py-1 font-mono text-xs text-white">
                {n} {name} - {pad}
            </span>
            {children}
        </section>
    )
}

function Kicker({ children }: { children: ReactNode }) {
    const sky = useSky()
    return (
        <p className="text-sm" style={{ ...sans(450), color: sky.text }}>
            {children}
        </p>
    )
}

function H2({ children }: { children: ReactNode }) {
    return (
        <h2 className="mt-3 max-w-3xl text-[56px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
            {children}
        </h2>
    )
}

function LandingMock() {
    const sky = useSky()
    return (
        <div className="bg-boli-ground text-boli-ink" style={{ width: W, ...sans() }}>
            {/* 01 Hero: one full screen (800px at 1280 wide). The valley (P1-V3 day) sits on the fold at its natural
                aspect; above it the hero ground is the valley's own top sky colour, so the two meet without a seam and the
                headline reads over the sky like a title screen. */}
            <section className="relative flex h-[800px] flex-col overflow-hidden" style={{ background: VALLEY_DAY.sky0 }}>
                <span className="absolute right-4 top-24 z-20 rounded-full bg-boli-ink px-2.5 py-1 font-mono text-xs text-white">01 Hero - 100vh, P1-V3 day</span>
                <ValleyHero variant="day" preserve="xMidYMax meet" className="absolute inset-x-0 bottom-0 block aspect-[160/84] w-full" />
                <div className="relative z-10 px-10 pt-5">
                    <LandingNav className="border-transparent bg-white/70 backdrop-blur" />
                </div>
                <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-14 text-center">
                    <p className="inline-flex h-7 items-center gap-2 rounded-full bg-white/80 px-3 text-xs text-boli-text">
                        <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" />
                        {BRAND.announcement}
                    </p>
                    <h1 className="mt-6 text-[96px] leading-[0.95] text-boli-ink" style={serif(340, 144, "-0.045em")}>
                        Open AI for Nepal
                    </h1>
                    <p className="mt-5 max-w-xl rounded-2xl bg-white/55 px-4 py-1.5 text-lg leading-8 text-boli-ink backdrop-blur-[2px]">
                        Ask the way you talk - English, Romanized Nepali or both. An OpenAI-compatible API, priced in rupees.
                    </p>
                    <div className="mt-7 flex gap-3" style={sans(450)}>
                        <span className="inline-flex h-12 items-center gap-2 rounded-full bg-boli-ink px-6 text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                            Start free - {WELCOME_CREDITS} credits <ArrowRight aria-hidden strokeWidth={1.75} className="size-4" />
                        </span>
                        <span className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] text-boli-ink">Read the docs</span>
                    </div>
                </div>
            </section>

            <WfSection n="02" name="How Boli works - PS2" pad="py-32">
                <div className="mx-auto max-w-6xl px-10 py-32">
                    <Kicker>Why Boli</Kicker>
                    <H2>AI that speaks Nepal's language - the way it is typed</H2>
                    <div className="mt-14 overflow-hidden rounded-3xl border border-boli-line">
                        <ExpandingPixelPanels />
                    </div>
                </div>
            </WfSection>

            <WfSection n="03" name="Products" pad="py-32" tone="white">
                <div className="mx-auto max-w-6xl px-10 py-32">
                    <Kicker>Products</Kicker>
                    <H2>One open model, four ways in</H2>
                    <ProductBento className="mt-14" />
                </div>
            </WfSection>

            <WfSection n="04" name="Code" pad="py-32">
                <div className="mx-auto grid max-w-6xl grid-cols-[1fr_1.35fr] items-center gap-14 px-10 py-32">
                    <div>
                        <Kicker>For developers</Kicker>
                        <H2>Your OpenAI code, a new base URL</H2>
                        <p className="mt-5 text-[15px] leading-7 text-boli-text">Keep the SDK you know. Point it at Boli's /v1, use your Boli key, and stream answers in Romanized Nepali.</p>
                    </div>
                    <CodeFrame samples={SAMPLES} meta="POST /v1/chat/completions" />
                </div>
            </WfSection>

            <WfSection n="05" name="Who it's for" pad="py-28" tone="white">
                <div className="mx-auto max-w-6xl px-10 py-28">
                    <Kicker>Who it's for</Kicker>
                    <H2>Built for people building in Nepal</H2>
                    <div className="mt-14 grid grid-cols-4 border-t border-boli-line">
                        {WHO.map((w, i) => (
                            <div key={w.title} className="grid content-start gap-3 py-8 pr-8" style={{ borderLeft: i ? "1px solid #e6e1db" : undefined, paddingLeft: i ? 32 : 0 }}>
                                <w.icon aria-hidden strokeWidth={1.5} className="size-5" style={{ color: sky.text }} />
                                <p className="text-[24px] leading-tight text-boli-ink" style={serif(400, 36, "-0.015em")}>
                                    {w.title}
                                </p>
                                <p className="text-sm leading-6 text-boli-text">{w.line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </WfSection>

            <WfSection n="06" name="Pricing" pad="py-32">
                <div className="mx-auto max-w-6xl px-10 py-32">
                    <LandingPricing />
                </div>
            </WfSection>

            <WfSection n="07" name="FAQ" pad="py-32" tone="white">
                <div className="mx-auto max-w-6xl px-10 py-32">
                    <FaqList stickyTop={24} />
                </div>
            </WfSection>

            <WfSection n="08" name="CTA band" pad="py-24">
                <div className="px-10 py-24">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-10 rounded-[32px] px-14 py-16" style={{ background: `linear-gradient(120deg, ${sky.wash}, ${sky.soft})` }}>
                        <div>
                            <h2 className="max-w-xl text-[52px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                                Start with {WELCOME_CREDITS} free credits
                            </h2>
                            <p className="mt-4 text-[15px] text-boli-text">No card. Verify your email and make your first call in a minute.</p>
                        </div>
                        <div className="flex shrink-0 gap-3" style={sans(450)}>
                            <span className="inline-flex h-12 items-center rounded-full bg-boli-ink px-6 text-[15px] text-white">Start free</span>
                            <span className="inline-flex h-12 items-center rounded-full border border-boli-line bg-white px-6 text-[15px] text-boli-ink">Talk to us</span>
                        </div>
                    </div>
                </div>
            </WfSection>

            <WfSection n="09" name="Footer F5" pad="pt-10">
                <FooterF5 />
            </WfSection>
        </div>
    )
}

export function LandingWireframe({ n = "01" }: { n?: string }) {
    const [zoom, setZoom] = useState<Zoom>("60")
    const z = Number(zoom) / 100
    return (
        <section id="screens-landing" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="Landing - WF1"
                line="The approved story order as a live page at 1280px, scaled down, now with the real art: the P1-V3 day valley on the fold, the PS2 story panels, PC3 product cards and the F5 footer. Each section carries its name and vertical padding."
                codes="WF1"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-boli-text">Hero, How Boli works, Products, Code, Who it's for, Pricing, FAQ, CTA band, Footer F5</p>
                <Segmented label="Zoom" size="sm" value={zoom} onValueChange={setZoom} options={[{ value: "40", label: "40%" }, { value: "60", label: "60%" }, { value: "100", label: "100%" }]} />
            </div>
            <div className="overflow-hidden rounded-3xl border border-boli-line bg-white shadow-[0_24px_60px_-40px_rgba(20,20,20,0.35)]">
                <div className="flex h-9 items-center gap-1.5 border-b border-boli-line bg-[#efebe6] px-4">
                    {[0, 1, 2].map((i) => (
                        <span key={i} aria-hidden className="size-2.5 rounded-full bg-[#d6cfc5]" />
                    ))}
                    <span className="ml-3 truncate rounded-full bg-white px-3 text-xs leading-6 text-boli-muted">bolihq.com</span>
                </div>
                <ScrollArea orientation="horizontal">
                    <div style={{ zoom: z, width: W }}>
                        <LandingMock />
                    </div>
                </ScrollArea>
            </div>
        </section>
    )
}
