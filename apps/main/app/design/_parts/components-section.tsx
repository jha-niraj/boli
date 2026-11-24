"use client"

import { ArrowRight, Plus } from "lucide-react"
import { useState, type ReactNode } from "react"
import { BOLI_CHAT } from "@/lib/boli"
import { FrameLabel } from "../_components/board"
import { CodeFrame } from "../_components/code-tab-header"
import { DESIGN_CODE, DESIGN_FAQ } from "../_components/content"
import { EditorialFaq } from "../_components/editorial-faq"
import { PillButton } from "../_components/pill-button"
import { QuietBadge } from "../_components/quiet-badge"
import { QuietInput } from "../_components/quiet-input"
import { QuietSelect } from "../_components/quiet-select"
import { QuietTabPanel, QuietTabs } from "../_components/quiet-tabs"
import { Segmented } from "../_components/segmented"
import { R2Head } from "./r2-head"
import { serif } from "./t1"

const KEY_OPTIONS = [
    { value: "laptop", label: "My laptop", hint: "boli_sk_4f2a... - used 2 hours ago" },
    { value: "server", label: "Production server", hint: "boli_sk_91cd... - used today" },
    { value: "class", label: "Class project", hint: "boli_sk_0b7e... - never used" },
]
const LANGUAGE_OPTIONS = [
    { value: "auto", label: "Reply in my script" },
    { value: "roman", label: "Romanized Nepali" },
    { value: "dev", label: "Nepali (Devanagari)" },
    { value: "en", label: "English" },
]
type Range = "7d" | "30d" | "month" | "all"
const RANGES: { value: Range; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "month", label: "This month" },
    { value: "all", label: "All time" },
]
type Source = "all" | "api" | "kura"
const SOURCES: { value: Source; label: string }[] = [
    { value: "all", label: "All" },
    { value: "api", label: "API" },
    { value: "kura", label: "Kura" },
]

export function ComponentsSection({ n = "04" }: { n?: string }) {
    const [apiKey, setApiKey] = useState("laptop")
    const [language, setLanguage] = useState("auto")
    const [tab, setTab] = useState("overview")
    const [range, setRange] = useState<Range>("7d")
    const [source, setSource] = useState<Source>("all")

    return (
        <section id="final-components" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="Components"
                line="Approved as-is: Boli's own controls - quiet, editorial, hairlines instead of boxes - now set in T1. They live in app/design/_components until they move to components/brand or @repo/ui."
            />

            {/* FAQ - the editorial list. */}
            <section className="overflow-hidden rounded-3xl border border-boli-line bg-white">
                <div className="border-b border-boli-line px-6 py-4">
                    <h3 className="text-[15px] text-boli-ink">FAQ - editorial list</h3>
                    <p className="text-xs text-boli-muted">Numbered rows on hairlines, serif questions, a plus that turns into a minus. Tab and Enter work.</p>
                </div>
                <div className="grid gap-10 bg-boli-ground px-6 py-12 sm:px-10 lg:grid-cols-[1fr_2.2fr] lg:py-16">
                    <div>
                        <p className="text-xs text-boli-muted">FAQ</p>
                        <h4 style={serif(360, 144, "-0.035em")} className="mt-3 text-[40px] leading-[1.05] text-boli-ink">
                            Questions, answered
                        </h4>
                        <p className="mt-4 max-w-xs text-sm leading-6 text-boli-text">Anything else, write to us from the About page - a person reads every message.</p>
                    </div>
                    <EditorialFaq items={DESIGN_FAQ} questionStyle={serif(400, 36, "-0.015em")} defaultOpen="01" />
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Buttons" note="Near-black primary, white secondary, ghost. Pills, label weight 450, a 2% press.">
                    <div className="grid gap-5">
                        {(["lg", "md", "sm"] as const).map((size) => (
                            <div key={size} className="flex flex-wrap items-center gap-3">
                                <span className="w-6 font-mono text-xs text-boli-muted">{size}</span>
                                <PillButton size={size} type="button">
                                    Sign up free <ArrowRight strokeWidth={1.75} aria-hidden />
                                </PillButton>
                                <PillButton size={size} variant="secondary" type="button">
                                    Read the docs
                                </PillButton>
                                <PillButton size={size} variant="ghost" type="button">
                                    <Plus strokeWidth={1.75} aria-hidden /> New chat
                                </PillButton>
                            </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="w-6 font-mono text-xs text-boli-muted">off</span>
                            <PillButton size="md" type="button" disabled>
                                Out of credits
                            </PillButton>
                            <PillButton size="md" variant="secondary" type="button" disabled>
                                Disabled
                            </PillButton>
                        </div>
                    </div>
                </Panel>

                <Panel title="Select" note="A pill with its label inside. The list is a soft white panel; a hint under each option.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <QuietSelect label="Key" value={apiKey} onValueChange={setApiKey} options={KEY_OPTIONS} className="w-full" />
                        <QuietSelect label="Reply" value={language} onValueChange={setLanguage} options={LANGUAGE_OPTIONS} className="w-full" />
                    </div>
                </Panel>

                <Panel title="Tabs" note="Text on a hairline; the active one in ink with a rule that slides. For sections, not filters.">
                    <QuietTabs
                        value={tab}
                        onValueChange={setTab}
                        tabs={[
                            { value: "overview", label: "Overview" },
                            { value: "pricing", label: "Pricing" },
                            { value: "limits", label: "Limits" },
                            { value: "errors", label: "Errors", count: 6 },
                        ]}
                    >
                        <QuietTabPanel value="overview" className="pt-5 text-sm leading-6 text-boli-text outline-none">
                            {BOLI_CHAT.id} is {BOLI_CHAT.label}. {BOLI_CHAT.blurb}
                        </QuietTabPanel>
                        <QuietTabPanel value="pricing" className="pt-5 text-sm leading-6 text-boli-text outline-none">
                            Rs {BOLI_CHAT.pricePerMillion.input} per million input tokens, Rs {BOLI_CHAT.pricePerMillion.output} per million output tokens. 1 credit = Rs 1.
                        </QuietTabPanel>
                        <QuietTabPanel value="limits" className="pt-5 text-sm leading-6 text-boli-text outline-none">
                            A context of {BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens per request.
                        </QuietTabPanel>
                        <QuietTabPanel value="errors" className="pt-5 text-sm leading-6 text-boli-text outline-none">
                            402 when you are out of credits, 429 when you go over the rate limit - each with a sentence that says what to do.
                        </QuietTabPanel>
                    </QuietTabs>
                </Panel>

                <Panel title="Segmented control" note="For filters in a page header: a sand trough, a white chip that slides.">
                    <div className="grid gap-4">
                        <Segmented label="Range" value={range} onValueChange={setRange} options={RANGES} />
                        <Segmented label="Source" size="sm" value={source} onValueChange={setSource} options={SOURCES} />
                    </div>
                </Panel>

                <Panel title="Input" note="Label above in text-xs, a white pill field, a soft ink focus ring, an optional unit inside.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <QuietInput label="Key name" placeholder="My laptop" hint="Only you see this." />
                        <QuietInput label="Amount" placeholder="500" suffix="credits" inputMode="numeric" hint="1 credit = Rs 1." />
                    </div>
                </Panel>

                <Panel title="Badges" note="Sand by default, a hairline outline, a live dot, and one inverted for the rare thing that must stand out.">
                    <div className="flex flex-wrap items-center gap-2">
                        <QuietBadge>Apache 2.0</QuietBadge>
                        <QuietBadge tone="outline">{BOLI_CHAT.id}</QuietBadge>
                        <QuietBadge tone="live">Model online</QuietBadge>
                        <QuietBadge tone="ink">New</QuietBadge>
                        <QuietBadge tone="outline">8,192 context</QuietBadge>
                    </div>
                </Panel>
            </div>

            <Panel title="Code block header" note="Languages as quiet text tabs with an ink dot, the endpoint in mono, a round copy button.">
                <CodeFrame samples={DESIGN_CODE} meta="POST /v1/chat/completions" />
            </Panel>
        </section>
    )
}

function Panel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
    return (
        <section className="grid content-start gap-5 rounded-3xl border border-boli-line bg-white p-6">
            <div>
                <h3 className="text-[15px] text-boli-ink">{title}</h3>
                <FrameLabel className="mt-0.5">{note}</FrameLabel>
            </div>
            {children}
        </section>
    )
}
