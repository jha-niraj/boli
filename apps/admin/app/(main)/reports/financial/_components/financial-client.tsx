"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowRight, Bot, CreditCard, Wallet } from "lucide-react"
import { ChartPanel, TrendLineChart } from "@repo/ui/components/charts/panel-charts"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { SURFACE } from "@repo/ui/lib/surfaces"
import { getFinancialReport, type FinancialReport, type PaymentRow } from "@/actions/analytics.action"
import { dayLabel, fmtDateTime, fmtMicroUsd, fmtMoneyMinor, fmtNumber, humanize } from "@/components/admin-format"
import { DetailRow, SideSheet } from "@/components/side-sheet"
import { BoliEmpty } from "@/components/empty/boli-empty"

const STATUS_TONE: Record<string, string> = {
    processed: "text-neutral-900 dark:text-white",
    failed: "text-rose-700 dark:text-rose-400",
    ignored: "text-neutral-500 dark:text-neutral-400",
    received: "text-amber-700 dark:text-amber-400",
}

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
    const [shown, setShown] = React.useState<PaymentRow | null>(null)
    const open = (row: PaymentRow) => { setShown(row); setOpenId(row.id) }

    // One currency gets the headline; more than one are listed in the hint (never summed across currencies).
    const main = data.payments[0]
    const others = data.payments.slice(1)
    const band: StatBandItem[] = [
        {
            icon: Wallet,
            label: "Received, last 30 days",
            value: main ? fmtMoneyMinor(main.last30Minor, main.currency) : "No payments yet",
            hint: others.length ? `+ ${others.map((o) => fmtMoneyMinor(o.last30Minor, o.currency)).join(", ")}` : undefined,
        },
        {
            icon: Wallet,
            label: "Received, all time",
            value: main ? fmtMoneyMinor(main.allTimeMinor, main.currency) : "No payments yet",
            hint: others.length ? `+ ${others.map((o) => fmtMoneyMinor(o.allTimeMinor, o.currency)).join(", ")}` : undefined,
        },
        {
            icon: AlertTriangle,
            label: "Failed events, last 30 days",
            value: fmtNumber(data.paymentEvents.failedLast30),
            hint: `of ${fmtNumber(data.paymentEvents.last30)} events`,
            tone: data.paymentEvents.failedLast30 > 0 ? "rose" : undefined,
        },
        { icon: Bot, label: "AI spend, last 30 days", value: fmtMicroUsd(data.aiSpend.last30Micro), hint: `${fmtNumber(data.aiSpend.requestsLast30)} requests` },
        { icon: Bot, label: "AI spend, all time", value: fmtMicroUsd(data.aiSpend.allTimeMicro) },
    ]
    // The chart in dollars (cents precision is lost below a cent - the axis is about the shape, the band about the sum).
    const spendPoints = data.dailyAiSpend.map((d) => ({ label: dayLabel(d.day), value: Math.round(d.value / 10_000) / 100 }))
    const anySpend = data.dailyAiSpend.some((d) => d.value > 0)

    return (
        <Page title="Financial report" icon={<Wallet />} description="Payments received and AI spend, in UTC days" body="page">
            <StatBand items={band} />
            <ChartPanel title="AI spend per day" hint="Last 30 days, USD">
                <TrendLineChart
                    points={anySpend ? spendPoints : spendPoints.map((p) => ({ ...p, value: null }))}
                    name="USD"
                    height={200}
                    emptyMessage="No AI requests in the last 30 days."
                />
            </ChartPanel>

            <section className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Payment events</h2>
                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">The latest 50 webhook events from the payment provider</p>
                </div>
                <div className={SURFACE}>
                    <ScrollArea orientation="both" viewportClassName="max-h-[44rem]">
                        <div className="min-w-[720px]">
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
                                    {data.recentPayments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="whitespace-normal">
                                                <BoliEmpty kind="payments" compact title="No payment events yet" description="They arrive once the payment provider's webhook is set up." />
                                            </TableCell>
                                        </TableRow>
                                    ) : data.recentPayments.map((p) => (
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
