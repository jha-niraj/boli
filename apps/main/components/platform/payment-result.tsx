"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CircleCheck, CircleSlash, CircleX, Clock3, Copy } from "lucide-react"
import type { PaymentView } from "@repo/billing"
import { formatMoney, PLANS } from "@repo/billing/plans"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { cn } from "@repo/ui/lib/utils"
import { checkPayment } from "@/actions/billing.action"
import { formatDay as formatBillingDate, formatFullDateTime, PLATFORM_KEYS, PROVIDER_NAMES } from "@/lib/platform-display"
import { BALANCE_QUERY_KEY } from "@/components/shell/credits-chip"

export type PaymentResultView = "verifying" | "success" | "failed" | "cancelled" | "mismatch"

function viewOf(p: PaymentView, mismatch: boolean): PaymentResultView {
    if (p.status === "succeeded") return "success"
    if (p.status === "cancelled") return "cancelled"
    if (p.status === "failed" || p.status === "refunded") return mismatch ? "mismatch" : "failed"
    return "verifying"
}

export function paymentWhatFor(p: PaymentView): string {
    if (p.kind === "credits") return `${(p.credits ?? 0).toLocaleString("en-US")} credits`
    if (p.autoRenew || p.kind === "renewal") return `${PLANS.pro.name} plan, renews monthly`
    return `${PLANS.pro.name} plan, ${p.termMonths ?? 1} month${p.termMonths === 1 ? "" : "s"}`
}

/** The checked payment's query key - shared by /checkout/<id> and the billing sheet, so both show the same answer. */
export const paymentResultKey = (id: string) => ["billing", "payment", id] as const

const MAX_AUTO_CHECKS = 6

/**
 * The four states a payment can show, each in one plain sentence: verifying (asking the gateway - automatically, a
 * few times, then on a button), success, failed, cancelled. Nothing here grants anything: "Check again" asks the server,
 * which asks the gateway server to server.
 *
 * Used by the full page (/checkout/<id>, where the gateways return) and by the sheet on Billing
 * (/billing?checkout=<id>). `primary` draws the main button for the state (the page links to Billing; the sheet offers
 * "Try again" in its footer instead). `framed` gives the card its own white ground (the page); in a sheet it sits flat.
 */
export function PaymentResultCard({ initial, mismatch, verifyNote, primary, framed = false }: {
    initial: PaymentView
    mismatch: boolean
    verifyNote: "signature" | "later" | null
    primary?: (view: PaymentResultView) => React.ReactNode
    framed?: boolean
}) {
    const queryClient = useQueryClient()
    const result = useQuery({
        queryKey: paymentResultKey(initial.id),
        queryFn: async () => {
            const r = await checkPayment(initial.id)
            if (!r.success) throw new Error(r.error ?? "The payment could not be checked.")
            if (r.data.state === "paid") await Promise.all([queryClient.invalidateQueries({ queryKey: PLATFORM_KEYS.billing }), queryClient.invalidateQueries({ queryKey: BALANCE_QUERY_KEY })])
            return { payment: r.data.payment, mismatch: r.data.state === "mismatch" }
        },
        initialData: { payment: initial, mismatch },
        // A still-open payment is asked again every 4s, a few times.
        staleTime: 0,
        refetchOnMount: viewOf(initial, mismatch) === "verifying",
        refetchInterval: (q) => (q.state.data && viewOf(q.state.data.payment, q.state.data.mismatch) === "verifying" && q.state.dataUpdateCount < MAX_AUTO_CHECKS ? 4000 : false),
    })
    const p = result.data.payment
    const view = viewOf(p, result.data.mismatch)
    const provider = PROVIDER_NAMES[p.provider] ?? p.provider
    // The result object has no update count in TanStack v5; the query's state does.
    const autoDone = (queryClient.getQueryState(paymentResultKey(initial.id))?.dataUpdateCount ?? 0) >= MAX_AUTO_CHECKS

    const copy: Record<PaymentResultView, { icon: React.ReactNode; title: string; body: string }> = {
        verifying: {
            icon: <Clock3 className="size-10 text-neutral-500" aria-hidden />,
            title: autoDone ? "Not confirmed yet" : "Checking your payment",
            body: verifyNote === "signature"
                ? `The confirmation from ${provider} did not check out, so nothing was added yet. If money left your account, press Check again or contact support with the reference below.`
                : autoDone
                    ? `${provider} has not confirmed this payment yet. If you paid, it usually arrives within a few minutes - press Check again.`
                    : `Asking ${provider} whether the payment went through. This takes a few seconds.`,
        },
        success: {
            icon: <CircleCheck className="size-10 text-emerald-600" aria-hidden />,
            title: "Payment received",
            body: p.kind === "credits" ? `${paymentWhatFor(p)} were added to your account.` : `Your ${paymentWhatFor(p)} is active.`,
        },
        failed: {
            icon: <CircleX className="size-10 text-rose-600" aria-hidden />,
            title: "The payment did not go through",
            body: `${provider} says the payment failed. Nothing was charged - you can try again or pick another way to pay.`,
        },
        mismatch: {
            icon: <CircleX className="size-10 text-rose-600" aria-hidden />,
            title: "The amount did not match",
            body: `${provider} charged a different amount than this order, so nothing was added. Contact support with the reference below.`,
        },
        cancelled: {
            icon: <CircleSlash className="size-10 text-neutral-500" aria-hidden />,
            title: "Payment cancelled",
            body: "You left the payment page before paying. Nothing was charged.",
        },
    }
    const c = copy[view]
    const main = primary?.(view)

    const checkAgain = view === "verifying" ? (
        <Button type="button" variant="outline" className="cursor-pointer gap-2" disabled={result.isFetching} onClick={() => void result.refetch()}>
            {result.isFetching ? <InlineLoader size={14} label="Checking" /> : null}
            Check again
        </Button>
    ) : null

    // In the Billing sheet (owner, 2026-11-25): left-aligned like every other sheet - the state in a tinted box, then
    // the details with the full date and time, the whole reference with a copy button, the buttons at the end.
    if (!framed) {
        return (
            <div className="flex w-full min-w-0 flex-col gap-4">
                <div className={cn("flex min-w-0 items-start gap-3 rounded-xl border p-4", STATE_BOX[view])}>
                    <span className="mt-0.5 shrink-0 [&_svg]:size-5">{c.icon}</span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white" aria-live="polite">{c.title}</h2>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{c.body}</p>
                    </div>
                </div>
                <div className="min-w-0">
                    <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">Details</p>
                    <PanelRows className="w-full min-w-0">
                        <PanelRow label="For">{paymentWhatFor(p)}</PanelRow>
                        <PanelRow label="Amount" valueClassName="tabular-nums">{formatMoney(p.amountMinor, p.currency)}</PanelRow>
                        <PanelRow label="Paid with">{provider}</PanelRow>
                        <PanelRow label="Status">{c.title}</PanelRow>
                        <PanelRow label="Started">{formatFullDateTime(p.createdAt)}</PanelRow>
                    </PanelRows>
                </div>
                <div className="min-w-0">
                    <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">Reference</p>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 py-1.5 pl-3 pr-1.5 dark:border-neutral-800 dark:bg-neutral-950">
                        <code className="min-w-0 flex-1 break-all font-mono text-xs text-neutral-700 dark:text-neutral-300">{p.id}</code>
                        <CopyReference value={p.id} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Quote this if you contact support about this payment.</p>
                </div>
                {checkAgain || main ? <div className="flex flex-wrap gap-2">{checkAgain}{main}</div> : null}
                {result.isError ? <p className="text-xs text-neutral-600 dark:text-neutral-400">The payment could not be checked just now. Try again in a minute.</p> : null}
            </div>
        )
    }

    return (
        <div className={cn(
            "flex w-full min-w-0 flex-col items-center gap-3 text-center",
            framed && "mx-auto max-w-lg rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-neutral-900",
        )}>
            {c.icon}
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white" aria-live="polite">{c.title}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{c.body}</p>
            <PanelRows className="mt-2 w-full min-w-0 text-left">
                <PanelRow label="For">{paymentWhatFor(p)}</PanelRow>
                <PanelRow label="Amount">{formatMoney(p.amountMinor, p.currency)} with {provider}</PanelRow>
                <PanelRow label="Started">{formatBillingDate(p.createdAt)}</PanelRow>
                <PanelRow label="Reference" valueClassName="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{p.id}</PanelRow>
            </PanelRows>
            {view === "verifying" || main ? (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {view === "verifying" ? (
                        <Button type="button" variant="outline" className="cursor-pointer gap-2" disabled={result.isFetching} onClick={() => void result.refetch()}>
                            {result.isFetching ? <InlineLoader size={14} label="Checking" /> : null}
                            Check again
                        </Button>
                    ) : null}
                    {main}
                </div>
            ) : null}
            {result.isError ? <p className="text-xs text-neutral-600 dark:text-neutral-400">The payment could not be checked just now. Try again in a minute.</p> : null}
        </div>
    )
}

/** The state box's tint: words carry the state, the tint only hints at it. */
const STATE_BOX: Record<PaymentResultView, string> = {
    verifying: "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900",
    success: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30",
    failed: "border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30",
    mismatch: "border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30",
    cancelled: "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900",
}

function CopyReference({ value }: { value: string }) {
    const [copied, setCopied] = React.useState(false)
    React.useEffect(() => {
        if (!copied) return
        const t = setTimeout(() => setCopied(false), 1600)
        return () => clearTimeout(t)
    }, [copied])
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copied ? "Copied" : "Copy reference"}
            className="h-7 w-7 shrink-0 cursor-pointer rounded-full [&_svg]:size-3.5"
            onClick={() => { void navigator.clipboard.writeText(value).then(() => setCopied(true)).catch(() => undefined) }}
        >
            {copied ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
        </Button>
    )
}
