"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Plus, Receipt, Wallet } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { EmptyState } from "@repo/ui/components/ui/empty-state"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { cn } from "@repo/ui/lib/utils"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { getBilling } from "@/actions/billing.action"
import { BOLI_CHAT, formatCredits } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { formatDateTime, formatDay, formatRupeesMinor, PAYMENT_STATUS_LABELS, PLATFORM_KEYS, PROVIDER_NAMES } from "@/lib/platform-display"
import type { BillingData, BillingHistoryRow } from "@/types/platform"
import { AddCreditsDialog } from "./add-credits-dialog"
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

export function BillingView({ initialData, initialTab, openAdd }: {
    initialData: BillingData
    initialTab: string | string[] | undefined
    openAdd: boolean
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
    const [tab, setTab] = useUrlTab<BillingTab>(BILLING_TABS.map((t) => t.value), initialTab, "history")
    const [addOpen, setAddOpen] = React.useState(openAdd)

    React.useEffect(() => {
        if (!openAdd) return
        const url = new URL(globalThis.location.href)
        url.searchParams.delete("add")
        globalThis.history.replaceState(globalThis.history.state, "", url.toString())
    }, [openAdd])

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
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <section className={CARD}>
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Pay as you go</h2>
                        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                            1 credit = Rs 1, and credits never expire. You pay only for the tokens you use:{" "}
                            {BOLI_CHAT.pricePerMillion.input} credits per 1M input tokens, {BOLI_CHAT.pricePerMillion.output} per 1M output.
                        </p>
                        <div className="mt-auto pt-4">
                            <Button asChild variant="outline" size="sm" className="gap-1.5">
                                <AppLink href={ROUTES.doc("models")}>View pricing <ArrowRight className="h-3.5 w-3.5" /></AppLink>
                            </Button>
                        </div>
                    </section>
                    <section className={CARD}>
                        <p className={cn("font-serif text-5xl leading-none tabular-nums", empty ? "text-rose-700 dark:text-rose-400" : "text-neutral-900 dark:text-white")}>
                            {formatCredits(data.balanceMicro)}
                        </p>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{empty ? "No credits left - add some to keep using Kura and the API" : "Credits left"}</p>
                        <div className="mt-auto pt-4">
                            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                                <Plus className="h-3.5 w-3.5" /> Add credits
                            </Button>
                        </div>
                    </section>
                </div>

                {tab === "history" ? (
                    data.history.length === 0 ? (
                        <EmptyState bordered icon={<Wallet />} title="No history yet" description="Free credits, purchases and each day's usage show up here." />
                    ) : (
                        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                            <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[44rem]">
                                <div className="min-w-[36rem] px-2 pb-2">
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
                ) : data.payments.length === 0 ? (
                    <EmptyState
                        bordered
                        icon={<Receipt />}
                        title="No payments yet"
                        description="Credits you buy with eSewa or Khalti show up here."
                        action={<Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Add credits</Button>}
                    />
                ) : (
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[44rem]">
                            <div className="min-w-[40rem] px-2 pb-2">
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
                                        {data.payments.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">{formatDateTime(p.createdAt)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{p.credits !== null ? p.credits.toLocaleString("en-US") : "-"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-right tabular-nums">{p.currency === "NPR" ? formatRupeesMinor(p.amountMinor) : `${p.currency} ${(p.amountMinor / 100).toFixed(2)}`}</TableCell>
                                                <TableCell>{PROVIDER_NAMES[p.provider] ?? p.provider}</TableCell>
                                                <TableCell className={cn(p.status === "failed" && "text-rose-700 dark:text-rose-400")}>{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</TableCell>
                                                <TableCell pin="end" className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <AppLink href={`/checkout/${encodeURIComponent(p.id)}`}>Details</AppLink>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                    </section>
                )}
            </div>

            <AddCreditsDialog open={addOpen} onOpenChange={setAddOpen} />
        </Page>
    )
}
