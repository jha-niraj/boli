"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { ArrowRight, ChevronRight, Plus } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { cn } from "@repo/ui/lib/utils"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { getBilling } from "@/actions/billing.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { SKY_LINK } from "@/components/platform/sky"
import { BOLI_CHAT, formatCredits } from "@repo/boli"
import { WEB } from "@/lib/web-links"
import { formatDateTime, formatDay, formatRupeesMinor, PAYMENT_STATUS_LABELS, PLATFORM_KEYS, PROVIDER_NAMES } from "@/lib/platform-display"
import type { BillingData, BillingHistoryRow, PaymentDetail } from "@/types/platform"
import { AddCreditsDialog } from "./add-credits-dialog"
import { PaymentSheet } from "./payment-sheet"
import { PlansTab, type BillingPreselect } from "./plans-tab"
import { BILLING_DESCRIPTION, BILLING_TABS, BILLING_TITLE, type BillingTab } from "./billing-skeleton"

const KIND_LABEL: Record<BillingHistoryRow["kind"], string> = {
    grant: "Grant",
    purchase: "Purchase",
    refund: "Refund",
    expiry: "Expiry",
    spend: "Usage",
}

const CARD = "flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"

function signed(micro: number): string {
    return `${micro > 0 ? "+" : micro < 0 ? "-" : ""}${formatCredits(Math.abs(micro))}`
}

/** The payment sheet's URL param: `/billing?checkout=<paymentId>`. */
const CHECKOUT_PARAM = "checkout"

/** Writes `?checkout=` without a server round trip (AGENTS.md section 11); null removes it. */
function writeCheckoutParam(id: string | null) {
    const url = new URL(globalThis.location.href)
    if (id) url.searchParams.set(CHECKOUT_PARAM, id)
    else url.searchParams.delete(CHECKOUT_PARAM)
    globalThis.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
}

export function BillingView({ initialData, initialTab, openAdd, preselect, initialCheckout }: {
    initialData: BillingData
    initialTab: string | string[] | undefined
    openAdd: boolean
    /** From the landing's pricing (`?pack=` / `?amount=`), validated on the server. */
    preselect: BillingPreselect | null
    /** `?checkout=<id>` read on the server: that payment, when this person may see it. */
    initialCheckout: PaymentDetail | null
}) {
    const { data } = useQuery({
        queryKey: PLATFORM_KEYS.billing,
        queryFn: async () => {
            const r = await getBilling()
            if (!r.success) throw new Error(r.error ?? "Billing could not be loaded.")
            return r.data
        },
        initialData,
    })
    const [tab, setTab] = useUrlTab<BillingTab>(BILLING_TABS.map((t) => t.value), initialTab, "credits")
    const [addOpen, setAddOpen] = React.useState(openAdd)

    // The payment sheet. Its open state IS `?checkout=<id>`: a row press sets it, closing removes it, a reload (or a
    // pasted link) reopens it. Another row swaps the sheet (rows carry data-sheet-keep-open). The id is cleared only
    // in onExitComplete, so the card does not empty while sliding out.
    const searchParams = useSearchParams()
    const urlCheckout = searchParams?.get(CHECKOUT_PARAM) ?? null
    const [checkoutId, setCheckoutId] = React.useState<string | null>(initialCheckout?.payment.id ?? null)
    const [sheetOpen, setSheetOpen] = React.useState(!!initialCheckout)
    // What this view last wrote, so its own write echoing back through useSearchParams is not treated as a link.
    const lastCheckout = React.useRef<string | null>(urlCheckout)

    // A payment this person may not see (or a stale link) is dropped from the URL instead of opening an empty sheet.
    React.useEffect(() => {
        if (urlCheckout && !initialCheckout) {
            lastCheckout.current = null
            writeCheckoutParam(null)
        }
        // Once, at mount: the server's answer for the URL it was given.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Follow an in-app link to `?checkout=<id>` (or its removal) while the page is already open.
    React.useEffect(() => {
        if (urlCheckout === lastCheckout.current) return
        lastCheckout.current = urlCheckout
        if (urlCheckout) {
            setCheckoutId(urlCheckout)
            setSheetOpen(true)
        } else setSheetOpen(false)
    }, [urlCheckout])

    const openPayment = React.useCallback((id: string) => {
        setCheckoutId(id)
        setSheetOpen(true)
        lastCheckout.current = id
        writeCheckoutParam(id)
    }, [])

    const onSheetOpenChange = React.useCallback((next: boolean) => {
        setSheetOpen(next)
        if (!next) {
            lastCheckout.current = null
            writeCheckoutParam(null)
        }
    }, [])

    // One-shot params: read once, then dropped from the URL so a reload does not reopen them.
    React.useEffect(() => {
        if (!openAdd && !preselect) return
        const url = new URL(globalThis.location.href)
        url.searchParams.delete("add")
        url.searchParams.delete("pack")
        url.searchParams.delete("amount")
        if (preselect) url.searchParams.set("tab", "plans")
        globalThis.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    }, [openAdd, preselect])

    const empty = data.balanceMicro <= 0

    return (
        <Page
            title={BILLING_TITLE}
            description={BILLING_DESCRIPTION}
            tabs={BILLING_TABS.map((t) => ({ value: t.value, label: t.label }))}
            tab={tab}
            onTabChange={(v) => setTab(v as BillingTab)}
            body="page"
        >
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                {tab === "plans" ? (
                    <PlansTab preselect={preselect} />
                ) : tab === "history" ? (
                    data.history.length === 0 ? (
                        <BoliEmpty kind="payments" framed title="No history yet" description="Free credits, purchases and each day's usage show up here." />
                    ) : (
                        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                            <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[44rem]">
                                <div className="min-w-[36rem] [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
                                    <Table scroller="parent">
                                        <TableHeader sticky>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">Credits</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.history.map((h) => (
                                                <TableRow key={h.id}>
                                                    <TableCell className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                                                        {h.kind === "spend" ? formatDay(h.at) : formatDateTime(h.at)}
                                                    </TableCell>
                                                    <TableCell className="max-w-[20rem] truncate">
                                                        {h.description}
                                                        {h.requests !== null ? <span className="ml-1.5 text-xs text-neutral-600 dark:text-neutral-400">{h.requests.toLocaleString("en-US")} requests</span> : null}
                                                    </TableCell>
                                                    <TableCell className="text-neutral-700 dark:text-neutral-300">{KIND_LABEL[h.kind]}</TableCell>
                                                    <TableCell className={cn("whitespace-nowrap text-right tabular-nums", h.amountMicro > 0 && "text-emerald-700 dark:text-emerald-400")}>
                                                        {signed(h.amountMicro)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </ScrollArea>
                        </section>
                    )
                ) : (
                    <>
                        <div className="grid min-w-0 gap-3 md:grid-cols-2">
                            <section className={CARD}>
                                <p className={cn("font-serif text-5xl leading-none tabular-nums", empty ? "text-rose-700 dark:text-rose-400" : "text-neutral-900 dark:text-white")}>
                                    {formatCredits(data.balanceMicro)}
                                </p>
                                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{empty ? "No credits left - add some to keep using Kura and the API" : "Credits left"}</p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                                    <Button size="sm" className="gap-1.5" onClick={() => setTab("plans")}>
                                        <Plus className="h-3.5 w-3.5" /> Buy credits
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                                        Custom amount
                                    </Button>
                                </div>
                            </section>
                            <section className={CARD}>
                                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Pay as you go</h2>
                                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                                    1 credit = Rs 1, and credits never expire. You pay only for the tokens you use:{" "}
                                    {BOLI_CHAT.pricePerMillion.input} credits per 1M input tokens, {BOLI_CHAT.pricePerMillion.output} per 1M output.
                                </p>
                                <div className="mt-auto pt-4">
                                    <AppLink href={WEB.doc("models")} className={cn("inline-flex items-center gap-1 text-sm", SKY_LINK)}>
                                        View pricing <ArrowRight className="h-3.5 w-3.5" />
                                    </AppLink>
                                </div>
                            </section>
                        </div>

                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Payments</h2>
                        {data.payments.length === 0 ? (
                    <BoliEmpty
                        kind="payments"
                        framed
                        title="No payments yet"
                        description="Credit packs you buy with eSewa or Khalti show here, each with its receipt."
                        action={<Button size="sm" className="gap-1.5" onClick={() => setTab("plans")}><Plus className="h-3.5 w-3.5" /> Add credits</Button>}
                    />
                ) : (
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[44rem]">
                            <div className="min-w-[40rem] [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
                                <Table scroller="parent">
                                    <TableHeader sticky>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Credits</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Paid with</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead pin="end"><span className="sr-only">Open</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.payments.map((p) => {
                                            const active = sheetOpen && checkoutId === p.id
                                            return (
                                            <TableRow
                                                key={p.id}
                                                data-sheet-keep-open=""
                                                tabIndex={0}
                                                aria-selected={active}
                                                onClick={() => openPayment(p.id)}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPayment(p.id) } }}
                                                className={cn("cursor-pointer", active && "bg-neutral-50 dark:bg-neutral-800/60")}
                                            >
                                                <TableCell className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">{formatDateTime(p.createdAt)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{p.credits !== null ? p.credits.toLocaleString("en-US") : "-"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-right tabular-nums">{p.currency === "NPR" ? formatRupeesMinor(p.amountMinor) : `${p.currency} ${(p.amountMinor / 100).toFixed(2)}`}</TableCell>
                                                <TableCell>{PROVIDER_NAMES[p.provider] ?? p.provider}</TableCell>
                                                <TableCell className={cn(p.status === "failed" && "text-rose-700 dark:text-rose-400")}>{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</TableCell>
                                                <TableCell pin="end" className="w-10 text-right">
                                                    <ChevronRight className="ml-auto h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
                                                </TableCell>
                                            </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                    </section>
                        )}
                    </>
                )}
            </div>

            <AddCreditsDialog open={addOpen} onOpenChange={setAddOpen} />
            <PaymentSheet
                paymentId={checkoutId}
                initial={initialCheckout}
                open={sheetOpen}
                onOpenChange={onSheetOpenChange}
                onExitComplete={() => setCheckoutId(null)}
                onRetry={() => {
                    onSheetOpenChange(false)
                    setTab("plans")
                }}
            />
        </Page>
    )
}
