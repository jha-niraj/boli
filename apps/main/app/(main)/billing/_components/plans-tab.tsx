"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@/components/loaders/spinners"
import { Input } from "@repo/ui/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { cn } from "@repo/ui/lib/utils"
import { startAddCredits, startBuyPack } from "@/actions/billing.action"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { SKY_RING, SKY_SOFT, SKY_TEXT } from "@/components/platform/sky"
import { ADD_CREDITS_MAX, ADD_CREDITS_MIN, BOLI_CHAT, CREDIT_PACKS, type CreditPackId } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { PROVIDER_NAMES } from "@/lib/platform-display"
import { launchCheckout } from "./launch-checkout"

/*
 * Billing > Plans (owner, 2026-11-24): the four credit packs from lib/boli.ts with a Dhaka band on each, the custom
 * amount (1 rupee = 1 credit) and Enterprise. Pressing Buy only sends the pack ID and the gateway - the server prices
 * it from its own table and grants the credits (bonus included) once the gateway confirms the payment.
 */

type Provider = "esewa" | "khalti"
const PROVIDERS: Provider[] = ["esewa", "khalti"]
type Pack = (typeof CREDIT_PACKS)[number]

const n = (v: number) => v.toLocaleString("en-US")
const PRICE = BOLI_CHAT.pricePerMillion
/** "about 175M output tokens" for a credit amount, at the live model's output price. */
function buys(credits: number): string {
    const out = credits / PRICE.output
    return `about ${out >= 10 ? n(Math.round(out)) : out.toFixed(1)}M output tokens`
}
function bonusPercent(p: Pack): number {
    return Math.round(((p.credits - p.rupees) / p.rupees) * 100)
}
/** The pack with the biggest bonus is the one drawn as the primary choice. */
const BEST: CreditPackId | undefined = [...CREDIT_PACKS].sort((a, b) => bonusPercent(b) - bonusPercent(a))[0]?.id

const CARD = "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

/** One "starting a payment" at a time for the whole tab, with the hand-over to the gateway. */
function useCheckout() {
    const [pending, setPending] = React.useState<string | null>(null)
    const [error, setError] = React.useState<{ at: string; text: string } | null>(null)
    const run = React.useCallback(async (at: string, start: () => ReturnType<typeof startBuyPack>) => {
        setPending(at)
        setError(null)
        const r = await start()
        if (!r.success) {
            setPending(null)
            setError({ at, text: r.error ?? "The payment could not be started. Try again." })
            return
        }
        try {
            await launchCheckout(r.data.start, { onDismiss: () => setPending(null) })
        } catch (e) {
            setPending(null)
            setError({ at, text: e instanceof Error ? e.message : "The payment page could not be opened. Try again." })
        }
    }, [])
    return { pending, error, run }
}

/** What the landing's pricing asked for: one pack (its "Pay with" choice opens) or a custom amount (filled in). */
export type BillingPreselect = { pack: CreditPackId; amount?: undefined } | { amount: number; pack?: undefined }

export function PlansTab({ preselect }: { preselect?: BillingPreselect | null }) {
    const { pending, error, run } = useCheckout()
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {CREDIT_PACKS.map((p) => (
                    <PackCard
                        key={p.id}
                        pack={p}
                        primary={p.id === BEST}
                        focused={preselect?.pack === p.id}
                        busy={pending !== null}
                        pendingProvider={pending?.startsWith(`${p.id}:`) ? (pending.split(":")[1] as Provider) : null}
                        error={error && error.at.startsWith(`${p.id}:`) ? error.text : null}
                        onBuy={(provider) => void run(`${p.id}:${provider}`, () => startBuyPack({ pack: p.id, provider }))}
                    />
                ))}
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-[1.4fr_1fr]">
                <CustomAmount
                    initialAmount={preselect?.amount}
                    busy={pending !== null}
                    pendingProvider={pending?.startsWith("custom:") ? (pending.split(":")[1] as Provider) : null}
                    error={error && error.at.startsWith("custom:") ? error.text : null}
                    onPay={(credits, provider) => void run(`custom:${provider}`, () => startAddCredits({ credits, provider }))}
                />
                <Enterprise />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                1 credit = Rs 1. Credits never expire and there is no subscription. Bonus credits are added with the purchase once the payment is confirmed.
            </p>
        </div>
    )
}

function PackCard({ pack, primary, focused, busy, pendingProvider, error, onBuy }: {
    pack: Pack
    primary: boolean
    /** Arrived from the landing for this pack: ringed, scrolled into view, its "Pay with" choice open. */
    focused: boolean
    busy: boolean
    pendingProvider: Provider | null
    error: string | null
    onBuy: (provider: Provider) => void
}) {
    const bonus = bonusPercent(pack)
    const [open, setOpen] = React.useState(false)
    const ref = React.useRef<HTMLElement | null>(null)
    React.useEffect(() => {
        if (!focused) return
        ref.current?.scrollIntoView({ block: "nearest" })
        // Opened after mount so the popover anchors to the laid-out button.
        const id = requestAnimationFrame(() => setOpen(true))
        return () => cancelAnimationFrame(id)
    }, [focused])
    return (
        <article ref={ref} className={cn(CARD, focused && cn("ring-2", SKY_RING))}>
            <DashDhaka height={9} />
            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-neutral-600 dark:text-neutral-400">{pack.name}</p>
                    {bonus > 0 ? (
                        <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-medium", SKY_SOFT, SKY_TEXT)}>
                            +{bonus}% credits
                        </span>
                    ) : null}
                </div>
                <p className="font-serif text-3xl leading-none tabular-nums text-neutral-900 dark:text-white">Rs {n(pack.rupees)}</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium text-neutral-900 dark:text-white">{n(pack.credits)} credits</span>
                    {bonus > 0 ? <span className="text-neutral-600 dark:text-neutral-400"> - {n(pack.credits - pack.rupees)} extra</span> : null}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Buys {buys(pack.credits)}</p>
                <div className="mt-auto pt-2">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant={primary ? "default" : "outline"} size="sm" disabled={busy} className="w-full gap-2">
                                {pendingProvider ? <InlineLoader size={14} label={`Opening ${PROVIDER_NAMES[pendingProvider]}`} /> : null}
                                Buy for Rs {n(pack.rupees)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="center" className="w-60 rounded-2xl p-3">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Pay Rs {n(pack.rupees)} with</p>
                            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{n(pack.credits)} credits once the payment is confirmed.</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {PROVIDERS.map((p) => (
                                    <Button
                                        key={p}
                                        type="button"
                                        size="sm"
                                        variant={p === "esewa" ? "default" : "outline"}
                                        disabled={busy}
                                        onClick={() => {
                                            setOpen(false)
                                            onBuy(p)
                                        }}
                                    >
                                        {PROVIDER_NAMES[p]}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    {error ? <p className="mt-2 text-xs text-rose-700 dark:text-rose-400">{error}</p> : null}
                </div>
            </div>
        </article>
    )
}

function CustomAmount({ initialAmount, busy, pendingProvider, error, onPay }: {
    initialAmount?: number
    busy: boolean
    pendingProvider: Provider | null
    error: string | null
    onPay: (credits: number, provider: Provider) => void
}) {
    const [raw, setRaw] = React.useState(String(initialAmount ?? 2500))
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    React.useEffect(() => {
        if (initialAmount === undefined) return
        inputRef.current?.scrollIntoView({ block: "nearest" })
        inputRef.current?.focus()
    }, [initialAmount])
    const amount = Number(raw.replace(/[^0-9]/g, ""))
    const valid = Number.isInteger(amount) && amount >= ADD_CREDITS_MIN && amount <= ADD_CREDITS_MAX
    return (
        <article className={cn(CARD, "gap-3 p-4")}>
            <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Custom amount</h2>
                <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">Any amount from Rs {n(ADD_CREDITS_MIN)}. Rs 1 = 1 credit.</p>
            </div>
            <div className="grid gap-1.5">
                <label htmlFor="custom-amount" className="text-xs text-neutral-600 dark:text-neutral-400">Amount in rupees</label>
                {/* One row: amount, then both gateways. Below sm the two buttons drop under the field, side by side. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-neutral-600 dark:text-neutral-400">Rs</span>
                    <Input
                        ref={inputRef}
                        id="custom-amount"
                        inputMode="numeric"
                        value={raw}
                        disabled={busy}
                        onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                        aria-invalid={!valid}
                        aria-label="Amount in rupees"
                        className="h-10 pl-11 pr-28 text-sm tabular-nums"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                        {valid ? `${n(amount)} credits` : ""}
                    </span>
                </span>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    {PROVIDERS.map((p) => (
                        <Button key={p} type="button" variant={p === "esewa" ? "default" : "outline"} disabled={!valid || busy} onClick={() => onPay(amount, p)} className="h-10 gap-2 px-4">
                            {pendingProvider === p ? <InlineLoader size={14} label={`Opening ${PROVIDER_NAMES[p]}`} /> : null}
                            Pay with {PROVIDER_NAMES[p]}
                        </Button>
                    ))}
                </div>
                </div>
                <span className={cn("text-xs", valid ? "text-neutral-600 dark:text-neutral-400" : "text-rose-700 dark:text-rose-400")}>
                    {valid ? `Buys ${buys(amount)}` : `Enter Rs ${n(ADD_CREDITS_MIN)} to Rs ${n(ADD_CREDITS_MAX)}`}
                </span>
            </div>
            {error ? <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p> : null}
        </article>
    )
}

function Enterprise() {
    return (
        <article className={cn(CARD, "gap-3 p-4")}>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Enterprise</h2>
            <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                Large volumes, invoices in NPR and help moving an existing workload to an open model.
            </p>
            <div className="mt-auto pt-1">
                <Button asChild variant="outline" size="sm" className={cn("gap-1.5 focus-visible:ring-2", SKY_RING)}>
                    <AppLink href={ROUTES.contactAbout("Enterprise")}>
                        Talk to us <ArrowRight className="h-3.5 w-3.5" />
                    </AppLink>
                </Button>
            </div>
        </article>
    )
}
