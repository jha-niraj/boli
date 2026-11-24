"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleCheck, CircleSlash, CircleX, Clock3 } from "lucide-react"
import type { PaymentView } from "@repo/billing"
import { formatMoney, PLANS } from "@repo/billing/plans"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@/components/loaders/spinners"
import { Page } from "@repo/ui/components/ui/page"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { checkPayment } from "@/actions/billing.action"
import { ROUTES } from "@/lib/navigation"
import { formatDay as formatBillingDate, PLATFORM_KEYS, PROVIDER_NAMES } from "@/lib/platform-display"
import { BALANCE_QUERY_KEY } from "@/components/shell/credits-chip"
import { RESULT_DESCRIPTION, RESULT_TITLE } from "./checkout-result-skeleton"

type View = "verifying" | "success" | "failed" | "cancelled" | "mismatch"

function viewOf(p: PaymentView, mismatch: boolean): View {
    if (p.status === "succeeded") return "success"
    if (p.status === "cancelled") return "cancelled"
    if (p.status === "failed" || p.status === "refunded") return mismatch ? "mismatch" : "failed"
    return "verifying"
}

function whatFor(p: PaymentView): string {
    if (p.kind === "credits") return `${(p.credits ?? 0).toLocaleString("en-US")} credits`
    if (p.autoRenew || p.kind === "renewal") return `${PLANS.pro.name} plan, renews monthly`
    return `${PLANS.pro.name} plan, ${p.termMonths ?? 1} month${p.termMonths === 1 ? "" : "s"}`
}

const MAX_AUTO_CHECKS = 6

/**
 * The four states a payment can show, each in one plain sentence: verifying (asking the gateway - automatically, a
 * few times, then on a button), success, failed, cancelled. Nothing here grants anything: "Check again" asks the server,
 * which asks the gateway server to server.
 */
export function CheckoutResult({ initial, mismatch, verifyNote }: { initial: PaymentView; mismatch: boolean; verifyNote: "signature" | "later" | null }) {
    const queryClient = useQueryClient()
    const result = useQuery({
        queryKey: ["billing", "payment", initial.id],
        queryFn: async () => {
            const r = await checkPayment(initial.id)
            if (!r.success) throw new Error(r.error ?? "The payment could not be checked.")
            if (r.data.state === "paid") await Promise.all([queryClient.invalidateQueries({ queryKey: PLATFORM_KEYS.billing }), queryClient.invalidateQueries({ queryKey: BALANCE_QUERY_KEY })])
            return { payment: r.data.payment, mismatch: r.data.state === "mismatch" }
        },
        initialData: { payment: initial, mismatch },
        // The return already asked once; a still-open payment is asked again every 4s, a few times.
        staleTime: 0,
        refetchOnMount: viewOf(initial, mismatch) === "verifying",
        refetchInterval: (q) => (q.state.data && viewOf(q.state.data.payment, q.state.data.mismatch) === "verifying" && q.state.dataUpdateCount < MAX_AUTO_CHECKS ? 4000 : false),
    })
    const p = result.data.payment
    const view = viewOf(p, result.data.mismatch)
    const provider = PROVIDER_NAMES[p.provider] ?? p.provider
    // The result object has no update count in TanStack v5; the query's state does.
    const autoDone = (queryClient.getQueryState(["billing", "payment", initial.id])?.dataUpdateCount ?? 0) >= MAX_AUTO_CHECKS

    const copy: Record<View, { icon: React.ReactNode; title: string; body: string }> = {
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
            body: p.kind === "credits" ? `${whatFor(p)} were added to your account.` : `Your ${whatFor(p)} is active.`,
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

    return (
        <Page title={RESULT_TITLE} description={RESULT_DESCRIPTION} back={{ href: ROUTES.billing, label: "Billing" }} body="page">
            <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-xl bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-neutral-900">
                {c.icon}
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white" aria-live="polite">{c.title}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{c.body}</p>
                <PanelRows className="mt-2 w-full text-left">
                    <PanelRow label="For">{whatFor(p)}</PanelRow>
                    <PanelRow label="Amount">{formatMoney(p.amountMinor, p.currency)} with {provider}</PanelRow>
                    <PanelRow label="Started">{formatBillingDate(p.createdAt)}</PanelRow>
                    <PanelRow label="Reference" valueClassName="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{p.id}</PanelRow>
                </PanelRows>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {view === "verifying" ? (
                        <Button type="button" variant="outline" className="cursor-pointer gap-2 rounded-xl" disabled={result.isFetching} onClick={() => void result.refetch()}>
                            {result.isFetching ? <InlineLoader size={14} label="Checking" /> : null}
                            Check again
                        </Button>
                    ) : null}
                    <Button asChild className="cursor-pointer rounded-xl">
                        <AppLink href={ROUTES.billing}>{view === "success" ? "Back to billing" : view === "verifying" ? "Billing" : "Try again"}</AppLink>
                    </Button>
                </div>
                {result.isError ? <p className="text-xs text-neutral-600 dark:text-neutral-400">The payment could not be checked just now. Try again in a minute.</p> : null}
            </div>
        </Page>
    )
}
