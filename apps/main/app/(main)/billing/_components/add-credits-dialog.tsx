"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"
import { startAddCredits } from "@/actions/billing.action"
import { ADD_CREDIT_CHIPS, ADD_CREDITS_MAX, ADD_CREDITS_MIN, MICRO_PER_CREDIT, formatRupees } from "@/lib/boli"
import { PROVIDER_NAMES } from "@/lib/platform-display"
import { launchCheckout } from "./launch-checkout"

type Provider = "esewa" | "khalti"
const PROVIDERS: Provider[] = ["esewa", "khalti"]
const STEP = ADD_CREDIT_CHIPS[0]

const clamp = (n: number) => Math.min(ADD_CREDITS_MAX, Math.max(ADD_CREDITS_MIN, n))

/**
 * Add credits (Sarvam-style): a big centred number with - / +, quick chips, eSewa or Khalti, Cancel / Continue.
 * Continue creates the payment on the server and hands the browser to the gateway (a form POST for eSewa, a redirect for
 * Khalti). The gateway returns to /checkout/<paymentId>, which confirms the payment server to server.
 */
export function AddCreditsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [amount, setAmount] = React.useState<number>(ADD_CREDIT_CHIPS[1] ?? ADD_CREDITS_MIN)
    const [text, setText] = React.useState(String(ADD_CREDIT_CHIPS[1] ?? ADD_CREDITS_MIN))
    const [provider, setProvider] = React.useState<Provider>("esewa")
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) return
        setError(null)
        setPending(false)
    }, [open])

    function set(n: number) {
        const v = clamp(Math.round(n))
        setAmount(v)
        setText(String(v))
    }

    const typed = Number(text.replace(/[^0-9]/g, ""))
    const valid = Number.isInteger(typed) && typed >= ADD_CREDITS_MIN && typed <= ADD_CREDITS_MAX

    async function onContinue() {
        if (!valid || pending) return
        setPending(true)
        setError(null)
        const r = await startAddCredits({ credits: typed, provider })
        if (!r.success) {
            setPending(false)
            setError(r.error ?? "The payment could not be started. Try again.")
            return
        }
        try {
            await launchCheckout(r.data.start, { onDismiss: () => setPending(false) })
        } catch (e) {
            setPending(false)
            setError(e instanceof Error ? e.message : "The payment page could not be opened. Try again.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next) }}>
            <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Add credits</DialogTitle>
                    <DialogDescription className="text-xs">1 credit = Rs 1. Credits never expire.</DialogDescription>
                </DialogHeader>

                <div className="flex min-w-0 flex-col items-center gap-4">
                    <div className="flex w-full items-center justify-center gap-3">
                        <Button type="button" variant="outline" size="icon" aria-label={`${STEP} fewer credits`} disabled={pending || amount <= ADD_CREDITS_MIN} onClick={() => set((valid ? typed : amount) - STEP)}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                            data-no-pill=""
                            inputMode="numeric"
                            aria-label="Credits to add"
                            value={text}
                            disabled={pending}
                            onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                            onBlur={() => set(valid ? typed : amount)}
                            className="h-16 w-44 rounded-2xl border-transparent bg-transparent text-center font-serif text-5xl tabular-nums shadow-none focus-visible:border-neutral-300 dark:bg-transparent"
                        />
                        <Button type="button" variant="outline" size="icon" aria-label={`${STEP} more credits`} disabled={pending || amount >= ADD_CREDITS_MAX} onClick={() => set((valid ? typed : amount) + STEP)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className={cn("text-xs", valid ? "text-neutral-600 dark:text-neutral-400" : "text-rose-700 dark:text-rose-400")}>
                        {valid
                            ? `You pay ${formatRupees(typed * MICRO_PER_CREDIT)}`
                            : `Choose between ${ADD_CREDITS_MIN.toLocaleString("en-US")} and ${ADD_CREDITS_MAX.toLocaleString("en-US")} credits.`}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {ADD_CREDIT_CHIPS.map((c) => (
                            <Button key={c} type="button" variant="outline" size="sm" disabled={pending} onClick={() => set((valid ? typed : amount) + c)}>
                                +{c.toLocaleString("en-US")}
                            </Button>
                        ))}
                    </div>

                    <div className="w-full">
                        <p className="mb-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">Pay with</p>
                        <div role="radiogroup" aria-label="Pay with" className="grid grid-cols-2 gap-2">
                            {PROVIDERS.map((p) => {
                                const on = provider === p
                                return (
                                    <Button
                                        key={p}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        variant="outline"
                                        disabled={pending}
                                        onClick={() => setProvider(p)}
                                        className={cn("h-11", on && "border-neutral-900 bg-white ring-1 ring-neutral-900 hover:bg-white dark:border-white dark:bg-neutral-900 dark:ring-white")}
                                    >
                                        {PROVIDER_NAMES[p]}
                                    </Button>
                                )
                            })}
                        </div>
                    </div>
                    {error ? <p className="w-full text-xs text-rose-700 dark:text-rose-400">{error}</p> : null}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" disabled={!valid || pending} onClick={() => void onContinue()} className="gap-2">
                        {pending ? <InlineLoader size={14} label="Opening payment" /> : null}
                        Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
