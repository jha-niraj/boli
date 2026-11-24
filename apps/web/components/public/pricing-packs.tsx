"use client"

import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { AppLink } from "@repo/ui/components/app-link"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { PillButton } from "@repo/brand/pill-button"
import { DISPLAY } from "@repo/brand/type"
import { ADD_CREDITS_MAX, ADD_CREDITS_MIN, BOLI_CHAT, CREDIT_PACKS, WELCOME_CREDITS } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { SKY_SOFT_BG, SKY_TEXT } from "./tokens"
import { BILLING_URL, SIGNUP_URL } from "@/lib/app-links"

/*
 * The credit packs (owner, 2026-11-24): the free 100 on sign-up, four packs from CREDIT_PACKS with a Dhaka band, a
 * custom amount and Enterprise. Public pages are light only. Every button goes to Billing (sign-in first when signed
 * out); the payment itself happens there.
 */

const PRICE = BOLI_CHAT.pricePerMillion
const n = (v: number) => v.toLocaleString("en-US")

/** "about 17M output tokens" for a credit amount. */
function buys(credits: number): string {
    const out = credits / PRICE.output
    return `about ${out >= 10 ? Math.round(out) : out.toFixed(1)}M output tokens`
}

function bonusPercent(rupees: number, credits: number): number {
    return Math.round(((credits - rupees) / rupees) * 100)
}

const BEST = CREDIT_PACKS[CREDIT_PACKS.length - 1]?.id

const CARD = "flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white font-sans"

function FreeCard() {
    return (
        <article className={cn(CARD, SKY_SOFT_BG)}>
            <div className="flex flex-1 flex-col gap-3 p-6">
                <p className={cn("text-xs", SKY_TEXT)}>On sign-up</p>
                <p className="text-[44px] leading-none text-boli-ink" style={DISPLAY.number}>
                    Free
                </p>
                <p className="text-sm text-boli-ink">{WELCOME_CREDITS} credits</p>
                <p className="text-xs text-boli-muted">Once you verify your email. No card.</p>
                <div className="mt-auto pt-4">
                    <PillButton asChild className="w-full">
                        <a href={SIGNUP_URL}>Start free</a>
                    </PillButton>
                </div>
            </div>
        </article>
    )
}

function PackCard({ pack }: { pack: (typeof CREDIT_PACKS)[number] }) {
    const bonus = bonusPercent(pack.rupees, pack.credits)
    return (
        <article className={CARD}>
            <DhakaStrip tone="sky" scale={2} />
            <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-boli-muted">{pack.name}</p>
                    {bonus > 0 ? <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-[450]", SKY_SOFT_BG, SKY_TEXT)}>+{bonus}% credits</span> : null}
                </div>
                <p className="text-[40px] leading-none tabular-nums text-boli-ink" style={DISPLAY.number}>
                    Rs {n(pack.rupees)}
                </p>
                <p className="text-sm text-boli-text">
                    <span className="text-boli-ink">{n(pack.credits)} credits</span>
                    {bonus > 0 ? <span className="text-boli-muted"> - {n(pack.credits - pack.rupees)} extra</span> : null}
                </p>
                <p className="text-xs text-boli-muted">Buys {buys(pack.credits)}</p>
                <div className="mt-auto pt-4">
                    <PillButton asChild variant={pack.id === BEST ? "primary" : "secondary"} className="w-full">
                        <a href={BILLING_URL({ pack: pack.id })}>Add Rs {n(pack.rupees)}</a>
                    </PillButton>
                </div>
            </div>
        </article>
    )
}

function CustomAmount() {
    const [raw, setRaw] = useState("2500")
    const amount = Number(raw.replace(/[^0-9]/g, ""))
    const valid = amount >= ADD_CREDITS_MIN && amount <= ADD_CREDITS_MAX
    return (
        <article className={cn(CARD, "gap-3 p-6")}>
            <div>
                <h3 className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                    Custom amount
                </h3>
                <p className="mt-1 text-sm text-boli-text">Any amount from Rs {n(ADD_CREDITS_MIN)}. Rs 1 = 1 credit.</p>
            </div>
            <div className="grid gap-1.5">
                <label htmlFor="landing-custom-amount" className="text-xs text-boli-muted">
                    Amount in rupees
                </label>
                <span className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-boli-muted">Rs</span>
                    <Input
                        id="landing-custom-amount"
                        inputMode="numeric"
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                        aria-invalid={!valid}
                        aria-describedby="landing-custom-amount-hint"
                        className="h-11 w-full bg-white pl-11 pr-28 text-[15px] tabular-nums"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs tabular-nums text-boli-muted">{valid ? `${n(amount)} credits` : ""}</span>
                </span>
                <span id="landing-custom-amount-hint" className={cn("text-xs", valid ? "text-boli-muted" : "text-boli-crimson-ink")}>
                    {valid ? `Buys ${buys(amount)}` : `Enter Rs ${n(ADD_CREDITS_MIN)} to Rs ${n(ADD_CREDITS_MAX)}`}
                </span>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                {valid ? (
                    <PillButton asChild>
                        <a href={BILLING_URL({ amount })}>
                            Add Rs {n(amount)} <ArrowRight aria-hidden />
                        </a>
                    </PillButton>
                ) : (
                    <PillButton disabled>Add credits</PillButton>
                )}
                <span className="text-xs text-boli-muted">Pay with eSewa or Khalti</span>
            </div>
        </article>
    )
}

function Enterprise() {
    return (
        <article className={cn(CARD, "gap-3 p-6")}>
            <h3 className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                Enterprise
            </h3>
            <p className="text-sm leading-6 text-boli-text">Large volumes, invoices in NPR and help moving an existing workload to an open model.</p>
            <div className="mt-auto pt-1">
                <PillButton asChild variant="secondary">
                    <AppLink href={ROUTES.contactAbout("Enterprise")}>
                        Talk to us <ArrowRight aria-hidden />
                    </AppLink>
                </PillButton>
            </div>
        </article>
    )
}

/** The pricing grid: free + packs on one row (two on a tablet, one on a phone), custom amount and Enterprise below. */
export function PricingPacks() {
    return (
        <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FreeCard />
                {CREDIT_PACKS.map((p) => (
                    <PackCard key={p.id} pack={p} />
                ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                <CustomAmount />
                <Enterprise />
            </div>
        </div>
    )
}
