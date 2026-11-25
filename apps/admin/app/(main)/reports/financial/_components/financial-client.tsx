"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowRight, Coins, CreditCard, Gift, Wallet } from "lucide-react"
import { ChartPanel } from "@repo/ui/components/charts/panel-charts"
import { formatCredits } from "@repo/boli"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { TABLE_CARD, TABLE_EDGES } from "@/components/table-card"
import { getFinancialReport } from "@/actions/analytics.action"
import { fmtDateTime, fmtMoneyMinor, fmtNumber, fmtRupees, humanize } from "@/components/admin-format"
import type { FinancialReport, PaymentEventRow } from "@/lib/money-data"
import { SpendChart } from "../../../home/_components/home-charts"
import { FINANCIAL_DESCRIPTION, FINANCIAL_TITLE } from "./financial-skeleton"
import { DetailRow, SideSheet } from "@/components/side-sheet"
import { BoliEmpty } from "@/components/empty/boli-empty"

const STATUS_TONE: Record<string, string> = {
    processed: "text-neutral-900 dark:text-white",
    failed: "text-rose-700 dark:text-rose-400",
    ignored: "text-neutral-500 dark:text-neutral-400",
    received: "text-amber-700 dark:text-amber-400",
}

/**
 * Money > Reports > Financial: Boli's real money picture (credits only, NPR, Nepal days - lib/money-data.ts). Rupees
 * received from succeeded payments, credits sold vs granted, failed payments, credits spent per day by product, and
 * the payment provider's latest webhook events (a row opens the keep-open sheet).
 */
export function FinancialClient({ initial }: { initial: FinancialReport }) {
    const { data } = useQuery({
        queryKey: ["reports", "financial"],
        initialData: initial,
        queryFn: async () => {
            const res = await getFinancialReport()
            if (!res.success || !res.data) throw new Error(res.error ?? "Could not load the financial report")
            return res.data
        },
    })
    const [openId, setOpenId] = React.useState<string | null>(null)
    const [shown, setShown] = React.useState<PaymentEventRow | null>(null)
    const open = (row: PaymentEventRow) => { setShown(row); setOpenId(row.id) }

    const { received, credits, failed } = data
    const band: StatBandItem[] = [
        {
            icon: Wallet,
            label: "Received, last 30 days",
            value: fmtRupees(received.last30Minor),
            hint: `${fmtNumber(received.paymentsLast30)} payments, Nepal time`,
        },
        { icon: Wallet, label: "Received, all time", value: fmtRupees(received.allTimeMinor), hint: `${fmtNumber(received.paymentsAllTime)} payments` },
        {
            icon: Coins,
            label: "Credits sold, last 30 days",
            value: formatCredits(credits.soldLast30Micro),
            hint: `${formatCredits(credits.soldAllTimeMicro)} all time`,
        },
        {
            icon: Gift,
            label: "Credits granted, last 30 days",
            value: formatCredits(credits.grantedLast30Micro),
            hint: `${formatCredits(credits.grantedAllTimeMicro)} all time, welcome + admin`,
        },
        {
            icon: AlertTriangle,
            label: "Failed payments, last 30 days",
            value: fmtNumber(failed.last30),
            hint: `of ${fmtNumber(failed.startedLast30)} started`,
            tone: failed.last30 > 0 ? "rose" : undefined,
        },
    ]

    return (
        <Page title={FINANCIAL_TITLE} icon={<Wallet />} description={FINANCIAL_DESCRIPTION} body="page">
            <StatBand items={band} />
            <ChartPanel title="Credits spent per day" hint="Last 30 days, by product, Nepal time">
                <SpendChart days={data.spend} height={220} />
            </ChartPanel>

            <section className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Payment events</h2>
                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">The latest 50 webhook events from the payment provider</p>
                </div>
                <div className={TABLE_CARD}>
                    <ScrollArea orientation="both" viewportClassName="max-h-[44rem]">
                        <div className={`min-w-[720px] ${TABLE_EDGES}`}>
                            <Table scroller="parent">
                                <TableHeader sticky>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Received</TableHead>
                                        <TableHead pin="end" className="w-px"><span className="sr-only">Open</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.recentEvents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="whitespace-normal">
                                                <BoliEmpty kind="payments" compact title="No payment events yet" description="They arrive once the payment provider's webhook is set up." />
                                            </TableCell>
                                        </TableRow>
                                    ) : data.recentEvents.map((p) => (
                                        <TableRow
                                            key={p.id}
                                            data-sheet-keep-open=""
                                            data-state={openId === p.id ? "selected" : undefined}
                                            onClick={() => open(p)}
                                            className="cursor-pointer"
                                        >
                                            <TableCell className="max-w-[18rem] truncate font-mono text-xs">{p.type}</TableCell>
                                            <TableCell className={STATUS_TONE[p.status] ?? ""}>{humanize(p.status)}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {p.amountMinor != null && p.currency ? fmtMoneyMinor(p.amountMinor, p.currency) : "-"}
                                            </TableCell>
                                            <TableCell>{p.livemode ? "Live" : "Test"}</TableCell>
                                            <TableCell className="whitespace-nowrap text-neutral-600 dark:text-neutral-400"><RelativeTime value={p.receivedAt} /></TableCell>
                                            <TableCell pin="end">
                                                <Button size="sm" variant="ghost" className="cursor-pointer" data-sheet-keep-open="" onClick={(e) => { e.stopPropagation(); open(p) }} aria-label="Open event">
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ScrollArea>
                </div>
            </section>

            <SideSheet
                open={openId !== null}
                onOpenChange={(o) => { if (!o) setOpenId(null) }}
                onExitComplete={() => setShown(null)}
                title={shown?.type ?? "Payment event"}
                description={shown ? fmtDateTime(shown.receivedAt) : undefined}
                headerExtra={shown ? <div className="pt-1"><Badge variant="outline" className="gap-1"><CreditCard className="h-3 w-3" />{shown.livemode ? "Live" : "Test mode"}</Badge></div> : null}
            >
                {shown && (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        <DetailRow label="Status"><span className={STATUS_TONE[shown.status] ?? ""}>{humanize(shown.status)}</span></DetailRow>
                        <DetailRow label="Amount">{shown.amountMinor != null && shown.currency ? fmtMoneyMinor(shown.amountMinor, shown.currency) : "No amount on this event"}</DetailRow>
                        <DetailRow label="Event id" mono>{shown.id}</DetailRow>
                        <DetailRow label="Received">{fmtDateTime(shown.receivedAt)}</DetailRow>
                        {shown.error && <DetailRow label="Error">{shown.error}</DetailRow>}
                    </div>
                )}
            </SideSheet>
        </Page>
    )
}
