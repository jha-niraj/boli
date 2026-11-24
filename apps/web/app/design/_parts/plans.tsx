"use client"

import { ArrowRight } from "lucide-react"
import { useState, type CSSProperties, type ReactNode } from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"
import { ADD_CREDITS_MAX, ADD_CREDITS_MIN, BOLI_CHAT, WELCOME_CREDITS } from "@repo/boli"
import { CodeTag } from "../_components/board"
import { DhakaStrip } from "./dhaka-strip"
import { R2Head } from "./r2-head"
import { useSky, type Sky } from "./sky"
import { sans, serif } from "./t1"

/*
 * Credit packs (owner, 2026-11-24): smaller packs with small bonuses, the free 100 on sign-up, a custom amount and
 * Enterprise. Prices per token come from lib/boli.ts. The pack list itself is a proposal shown here; when approved it
 * moves into lib/boli.ts next to ADD_CREDIT_CHIPS.
 */
type Pack = { id: string; rupees: number; credits: number; bonus?: number }

export const PACKS: Pack[] = [
    { id: "p100", rupees: 100, credits: 100 },
    { id: "p500", rupees: 500, credits: 500 },
    { id: "p1000", rupees: 1000, credits: 1050, bonus: 5 },
    { id: "p5000", rupees: 5000, credits: 5500, bonus: 10 },
]

const PRICE = BOLI_CHAT.pricePerMillion
const n = (v: number) => v.toLocaleString("en-US")
/** "about 17M output tokens" for a credit amount. */
function buys(credits: number): string {
    const out = credits / PRICE.output
    return `about ${out >= 10 ? Math.round(out) : out.toFixed(1)}M output tokens`
}

type Tone = {
    dark: boolean
    ground: string
    surface: string
    line: string
    ink: string
    text: string
    muted: string
}
const LIGHT: Tone = { dark: false, ground: "#f7f5f3", surface: "#ffffff", line: "#e6e1db", ink: "#141414", text: "#3a3a3a", muted: "#6b6560" }
const DARKT: Tone = { dark: true, ground: "#121314", surface: "#1a1b1d", line: "#2a2b2e", ink: "#f5f3f0", text: "#d6d3cf", muted: "#8f8a85" }

function Pill({ children, tone, variant = "primary", className }: { children: ReactNode; tone: Tone; variant?: "primary" | "secondary"; className?: string }) {
    const primary = variant === "primary"
    return (
        <span
            className={cn("inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-5 text-sm transition-opacity hover:opacity-90", className)}
            style={{
                ...sans(450),
                background: primary ? tone.ink : tone.surface,
                color: primary ? (tone.dark ? "#141414" : "#ffffff") : tone.ink,
                boxShadow: primary ? "inset 0 1px 0 rgba(255,255,255,0.12)" : `inset 0 0 0 1px ${tone.line}`,
            }}
        >
            {children}
        </span>
    )
}

function PackCard({ pack, sky, tone, size = "lg" }: { pack: Pack; sky: Sky; tone: Tone; size?: "lg" | "sm" }) {
    return (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl" style={{ background: tone.surface, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
            <DhakaStrip sky={sky} tone={tone.dark ? "night" : "sky"} scale={size === "lg" ? 2 : 1.5} />
            <div className={cn("flex flex-1 flex-col", size === "lg" ? "gap-3 p-6" : "gap-2 p-4")}>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs" style={{ color: tone.muted }}>
                        Pay
                    </p>
                    {pack.bonus ? (
                        <span className="inline-flex h-6 items-center rounded-full px-2.5 text-xs" style={{ ...sans(450), background: tone.dark ? sky.darkSoft : sky.soft, color: tone.dark ? sky.dark : sky.text }}>
                            +{pack.bonus}% credits
                        </span>
                    ) : null}
                </div>
                <p className={cn("leading-none tabular-nums", size === "lg" ? "text-[44px]" : "text-[30px]")} style={{ ...serif(380, 96, "-0.03em"), color: tone.ink }}>
                    Rs {n(pack.rupees)}
                </p>
                <p className="text-sm" style={{ color: tone.text }}>
                    <span style={{ color: tone.ink }}>{n(pack.credits)} credits</span>
                    {pack.bonus ? <span style={{ color: tone.muted }}> - {n(pack.credits - pack.rupees)} extra</span> : null}
                </p>
                <p className="text-xs" style={{ color: tone.muted }}>
                    Buys {buys(pack.credits)}
                </p>
                <div className={cn("mt-auto", size === "lg" ? "pt-4" : "pt-2")}>
                    <Pill tone={tone} variant={pack.bonus === 10 ? "primary" : "secondary"} className={cn("w-full", size === "sm" && "h-9 text-[13px]")}>
                        Add Rs {n(pack.rupees)}
                    </Pill>
                </div>
            </div>
        </article>
    )
}

function CustomAmount({ tone, sky, compact }: { tone: Tone; sky: Sky; compact?: boolean }) {
    const [raw, setRaw] = useState("2500")
    const amount = Number(raw.replace(/[^0-9]/g, ""))
    const valid = amount >= ADD_CREDITS_MIN && amount <= ADD_CREDITS_MAX
    return (
        <article className={cn("flex min-w-0 flex-col gap-3 rounded-3xl", compact ? "p-4" : "p-6")} style={{ background: tone.surface, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
            <div>
                <h4 className="text-[22px] leading-tight" style={{ ...serif(420, 36, "-0.015em"), color: tone.ink }}>
                    Custom amount
                </h4>
                <p className="mt-1 text-sm" style={{ color: tone.text }}>
                    Any amount from Rs {n(ADD_CREDITS_MIN)}. Rs 1 = 1 credit.
                </p>
            </div>
            <label className="grid gap-1.5">
                <span className="text-xs" style={{ color: tone.muted }}>
                    Amount in rupees
                </span>
                <span className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm" style={{ color: tone.muted }}>
                        Rs
                    </span>
                    <Input
                        inputMode="numeric"
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                        aria-invalid={!valid}
                        aria-label="Amount in rupees"
                        className="h-11 w-full rounded-full border-0 pl-11 pr-24 text-[15px] tabular-nums shadow-[inset_0_0_0_1px_var(--r2-edge)] transition-shadow focus-visible:shadow-[inset_0_0_0_1px_var(--r2-focus),0_0_0_4px_var(--r2-focus-soft)] focus-visible:ring-0"
                        style={
                            {
                                background: tone.dark ? "#121314" : "#ffffff",
                                color: tone.ink,
                                "--r2-edge": valid ? tone.line : "#c8102e",
                                "--r2-focus": tone.dark ? sky.dark : sky.fill,
                                "--r2-focus-soft": tone.dark ? sky.darkSoft : sky.soft,
                            } as CSSProperties
                        }
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs tabular-nums" style={{ color: tone.muted }}>
                        {valid ? `${n(amount)} credits` : ""}
                    </span>
                </span>
                <span className="text-xs" style={{ color: valid ? tone.muted : "#c8102e" }}>
                    {valid ? `Buys ${buys(amount)}` : `Enter Rs ${n(ADD_CREDITS_MIN)} to Rs ${n(ADD_CREDITS_MAX)}`}
                </span>
            </label>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Pill tone={tone}>Pay with eSewa</Pill>
                <Pill tone={tone} variant="secondary">
                    Pay with Khalti
                </Pill>
            </div>
        </article>
    )
}

function Enterprise({ tone, compact }: { tone: Tone; compact?: boolean }) {
    return (
        <article className={cn("flex min-w-0 flex-col gap-3 rounded-3xl", compact ? "p-4" : "p-6")} style={{ background: tone.surface, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
            <h4 className="text-[22px] leading-tight" style={{ ...serif(420, 36, "-0.015em"), color: tone.ink }}>
                Enterprise
            </h4>
            <p className="text-sm leading-6" style={{ color: tone.text }}>
                Large volumes, invoices in NPR and help moving an existing workload to an open model.
            </p>
            <div className="mt-auto pt-1">
                <Pill tone={tone} variant="secondary">
                    Talk to us <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                </Pill>
            </div>
        </article>
    )
}

function FreeCard({ tone, sky }: { tone: Tone; sky: Sky }) {
    return (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl" style={{ background: tone.dark ? sky.darkSoft : sky.soft, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
            <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="text-xs" style={{ color: tone.dark ? sky.dark : sky.text }}>
                    On sign-up
                </p>
                <p className="text-[44px] leading-none" style={{ ...serif(380, 96, "-0.03em"), color: tone.ink }}>
                    Free
                </p>
                <p className="text-sm" style={{ color: tone.ink }}>
                    {WELCOME_CREDITS} credits
                </p>
                <p className="text-xs" style={{ color: tone.muted }}>
                    Once you verify your email. No card.
                </p>
                <div className="mt-auto pt-4">
                    <Pill tone={tone} className="w-full">
                        Start free
                    </Pill>
                </div>
            </div>
        </article>
    )
}

/** The landing Pricing section (public pages are light only). */
export function LandingPricing() {
    const sky = useSky()
    return (
        <div className="grid gap-10">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                    <p className="text-sm" style={{ ...sans(450), color: sky.text }}>
                        Pricing
                    </p>
                    <h3 className="mt-3 max-w-2xl text-[48px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                        Pay in rupees, only for what you use
                    </h3>
                </div>
                <div className="grid gap-1 text-sm text-boli-text lg:text-right">
                    <p>
                        <span className="text-boli-ink">{BOLI_CHAT.id}</span> - {PRICE.input} credits per 1M input tokens, {PRICE.output} per 1M output
                    </p>
                    <p className="text-boli-muted">1 credit = Rs 1. Credits never expire. No subscription.</p>
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FreeCard tone={LIGHT} sky={sky} />
                {PACKS.map((p) => (
                    <PackCard key={p.id} pack={p} sky={sky} tone={LIGHT} />
                ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                <CustomAmount tone={LIGHT} sky={sky} />
                <Enterprise tone={LIGHT} />
            </div>
        </div>
    )
}

const BILLING_TABS = ["Credits", "Plans", "History"] as const
type BillingTab = (typeof BILLING_TABS)[number]

const HISTORY = [
    { when: "24 Nov 2026, 14:02", what: "Pack Rs 1,000 - eSewa", credits: "+1,050.00", status: "Paid" },
    { when: "20 Nov 2026, 09:41", what: "Custom Rs 250 - Khalti", credits: "+250.00", status: "Paid" },
    { when: "18 Nov 2026, 17:15", what: "Pack Rs 500 - Khalti", credits: "+500.00", status: "Failed" },
    { when: "12 Nov 2026, 11:30", what: "Welcome credits", credits: "+100.00", status: "Granted" },
]

/** Dashboard Billing with Credits | Plans | History on the right of a Page-style header. */
function BillingPage({ tone }: { tone: Tone }) {
    const sky = useSky()
    const [tab, setTab] = useState<BillingTab>("Plans")
    return (
        <div className="min-w-0 overflow-hidden rounded-2xl" style={{ background: tone.ground, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
            <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-6 pt-3 sm:px-6">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="min-w-0">
                        <h3 className="truncate text-xl" style={{ ...serif(450, 24, "-0.012em"), color: tone.ink }}>
                            Billing
                        </h3>
                        <p className="truncate text-xs" style={{ color: tone.muted }}>
                            Credits, packs and payments in NPR
                        </p>
                    </div>
                    <div role="tablist" aria-label="Billing" className="inline-flex items-center gap-0.5 rounded-full p-1" style={{ background: tone.dark ? "#1a1b1d" : "#efebe6", boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
                        {BILLING_TABS.map((t) => {
                            const active = t === tab
                            return (
                                <Button
                                    key={t}
                                    type="button"
                                    variant="ghost"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setTab(t)}
                                    className="h-8 cursor-pointer rounded-full px-4 text-[13px] transition-colors hover:bg-transparent"
                                    style={{
                                        ...sans(450),
                                        color: active ? tone.ink : tone.muted,
                                        background: active ? (tone.dark ? "#2a2b2e" : "#ffffff") : "transparent",
                                        boxShadow: active ? "0 1px 2px rgba(20,20,20,0.08)" : undefined,
                                    }}
                                >
                                    {t}
                                </Button>
                            )
                        })}
                    </div>
                </div>

                {tab === "Plans" ? (
                    <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {PACKS.map((p) => (
                                <PackCard key={p.id} pack={p} sky={sky} tone={tone} size="sm" />
                            ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                            <CustomAmount tone={tone} sky={sky} compact />
                            <Enterprise tone={tone} compact />
                        </div>
                    </div>
                ) : null}

                {tab === "Credits" ? (
                    <div className="grid gap-3">
                        <div className="grid grid-cols-3 overflow-hidden rounded-2xl" style={{ background: tone.surface, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
                            {[
                                { label: "Balance", value: "1,312.58", hint: "credits" },
                                { label: "Spent, last 30 days", value: "87.42", hint: "credits" },
                                { label: "Price", value: `${PRICE.input} / ${PRICE.output}`, hint: "per 1M in / out" },
                            ].map((s, i) => (
                                <div key={s.label} className="min-w-0 px-4 py-4" style={{ borderLeft: i ? `1px solid ${tone.line}` : undefined }}>
                                    <p className="truncate text-xs" style={{ color: tone.muted }}>
                                        {s.label}
                                    </p>
                                    <p className="mt-1 truncate text-xl tabular-nums" style={{ ...serif(420, 36, "-0.015em"), color: tone.ink }}>
                                        {s.value}
                                    </p>
                                    <p className="truncate text-xs" style={{ color: tone.muted }}>
                                        {s.hint}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <CustomAmount tone={tone} sky={sky} compact />
                    </div>
                ) : null}

                {tab === "History" ? (
                    <div className="overflow-hidden rounded-2xl" style={{ background: tone.surface, boxShadow: `inset 0 0 0 1px ${tone.line}` }}>
                        {HISTORY.map((h, i) => (
                            <div key={h.when} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 sm:grid-cols-[11rem_1fr_auto_auto]" style={{ borderTop: i ? `1px solid ${tone.line}` : undefined }}>
                                <span className="text-xs tabular-nums" style={{ color: tone.muted }}>
                                    {h.when}
                                </span>
                                <span className="order-3 min-w-0 truncate text-sm sm:order-none" style={{ color: tone.ink }}>
                                    {h.what}
                                </span>
                                <span className="text-sm tabular-nums" style={{ color: h.status === "Failed" ? tone.muted : tone.ink }}>
                                    {h.credits}
                                </span>
                                <span className="hidden text-xs sm:inline" style={{ color: h.status === "Failed" ? (tone.dark ? "#e4344d" : "#a50e26") : tone.muted }}>
                                    {h.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export function Plans({ n = "06" }: { n?: string }) {
    return (
        <section id="r2-plans" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="Pricing and plans"
                line="Smaller credit packs with small bonuses, the free 100 on sign-up, any custom amount, and Enterprise. Dhaka bands on the pack cards. Shown as the landing section and as Billing > Plans in the dashboard."
                codes="P-landing, P-billing"
            />
            <div className="grid gap-3">
                <div className="flex items-center gap-2">
                    <CodeTag code="P-landing" className="min-w-0" />
                    <p className="text-sm text-boli-text">Landing Pricing section - light only</p>
                </div>
                <div className="rounded-3xl border border-boli-line bg-boli-ground p-5 sm:p-10">
                    <LandingPricing />
                </div>
            </div>
            <div className="grid gap-3">
                <div className="flex items-center gap-2">
                    <CodeTag code="P-billing" className="min-w-0" />
                    <p className="text-sm text-boli-text">Dashboard Billing - tabs on the right of the header, Plans open. Light and dark; the tabs work.</p>
                </div>
                <BillingPage tone={LIGHT} />
                <BillingPage tone={DARKT} />
            </div>
        </section>
    )
}
