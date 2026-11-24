"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { BadgeCent, CalendarClock, Coins, Receipt, RefreshCw } from "lucide-react"
import type { AdminBillingStats, AdminPaymentRow, AdminSubscriptionRow, Paged } from "@repo/billing"
import { formatMicroCredits, formatMoney, PLANS } from "@repo/billing/plans"
import { Button } from "@repo/ui/components/ui/button"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { Input } from "@repo/ui/components/ui/input"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { cn } from "@repo/ui/lib/utils"
import { getBillingPayments, getBillingStats, getBillingSubscriptions } from "@/actions/billing.action"
import { useAdminAccess } from "@/context/admin-access-context"
import { formatDate, Pill } from "../../admins/_components/admin-bits"
import { BILLING_DESCRIPTION, BILLING_TITLE, BillingSkeleton } from "./billing-skeleton"
import { BILLING_KEYS, paymentWhat, PROVIDER_NAMES, STATUS_LABELS } from "./billing-shared"
import { GrantSheet, type GrantTarget } from "./grant-sheet"
import { PaymentSheet } from "./payment-sheet"

const ALL = "all"

/** Per-currency amounts as one line ("Rs 4,995 + $27") - never summed across currencies. */
function moneyLine(m: Record<string, number> | undefined): string {
    const parts = Object.entries(m ?? {}).filter(([, v]) => v > 0).map(([c, v]) => formatMoney(v, c))
    return parts.length ? parts.join(" + ") : "None"
}

/**
 * Billing - payments (filter by provider and status, search by person or reference; a row opens the keep-open payment
 * sheet with a recheck) and subscriptions (a row opens the grant sheet for that person). Tabs sync to ?tab= without a
 * page round trip. Granting credits needs `users` write.
 */
export function BillingClient({ initialTab, initialStats, initialPayments, initialSubscriptions }: {
    initialTab: "payments" | "subscriptions"
    initialStats?: AdminBillingStats
    initialPayments?: Paged<AdminPaymentRow>
    initialSubscriptions?: Paged<AdminSubscriptionRow>
}) {
    const { can } = useAdminAccess()
    const canGrant = can("users", "write")
    const [tab, setTab] = React.useState(initialTab)
    const [page, setPage] = React.useState(1)
    const [subPage, setSubPage] = React.useState(1)
    const [provider, setProvider] = React.useState(ALL)
    const [status, setStatus] = React.useState(ALL)
    const [search, setSearch] = React.useState("")
    const debounced = useDebounce(search.trim(), 300)
    const [paymentRow, setPaymentRow] = React.useState<AdminPaymentRow | null>(null)
    const [paymentOpen, setPaymentOpen] = React.useState(false)
    const [grantTarget, setGrantTarget] = React.useState<GrantTarget | null>(null)
    const [grantOpen, setGrantOpen] = React.useState(false)

    React.useEffect(() => { setPage(1) }, [provider, status, debounced])

    const isFirst = page === 1 && provider === ALL && status === ALL && debounced === ""
    const stats = useQuery({
        queryKey: BILLING_KEYS.stats,
        queryFn: async () => {
            const r = await getBillingStats()
            if (!r.success) throw new Error(r.error ?? "Could not load the figures")
            return r.data
        },
        initialData: initialStats,
    })
    const payments = useQuery({
        queryKey: BILLING_KEYS.payments(page, provider, status, debounced),
        queryFn: async () => {
            const r = await getBillingPayments({ provider: provider === ALL ? undefined : provider, status: status === ALL ? undefined : status, search: debounced || undefined }, page)
            if (!r.success) throw new Error(r.error ?? "Could not load payments")
            return r.data
        },
        initialData: isFirst ? initialPayments : undefined,
        placeholderData: keepPreviousData,
    })
    const subs = useQuery({
        queryKey: BILLING_KEYS.subscriptions(subPage),
        queryFn: async () => {
            const r = await getBillingSubscriptions(subPage)
            if (!r.success) throw new Error(r.error ?? "Could not load subscriptions")
            return r.data
        },
        initialData: subPage === 1 ? initialSubscriptions : undefined,
        placeholderData: keepPreviousData,
        enabled: tab === "subscriptions" || subPage === 1,
    })

    const changeTab = (next: string) => {
        const t = next === "subscriptions" ? "subscriptions" : "payments"
        setTab(t)
        // Data is already in the browser: update the URL without a navigation.
        const url = new URL(window.location.href)
        if (t === "payments") url.searchParams.delete("tab")
        else url.searchParams.set("tab", t)
        window.history.replaceState(window.history.state, "", url.toString())
    }

    if (!payments.data && payments.isPending) return <BillingSkeleton />

    const s = stats.data
    const openGrant = (t: GrantTarget | null) => { setGrantTarget(t); setGrantOpen(true) }

    return (
        <Page
            title={BILLING_TITLE}
            description={BILLING_DESCRIPTION}
            icon={<Receipt />}
            tabs={[{ value: "payments", label: "Payments" }, { value: "subscriptions", label: "Subscriptions" }]}
            tab={tab}
            onTabChange={changeTab}
            actions={canGrant ? [{ key: "grant", label: "Grant credits", icon: <Coins className="h-3.5 w-3.5" />, primary: true, onClick: () => openGrant(null), keepSheetOpen: true }] : undefined}
        >
            <StatBand
                items={[
                    { icon: BadgeCent, label: "Revenue", value: moneyLine(s?.revenueThisMonth), hint: "this month" },
                    { icon: Receipt, label: "Payments", value: s ? s.paymentsThisMonth.toLocaleString() : "-", hint: "paid this month" },
                    { icon: CalendarClock, label: "Paid plans", value: s ? s.activeSubscriptions.toLocaleString() : "-", hint: s ? `${s.autoRenewing.toLocaleString()} auto-renew` : undefined },
                    { icon: Coins, label: "Credits granted", value: s ? formatMicroCredits(s.creditsGrantedThisMonthMicro) : "-", hint: "by admins this month" },
                ]}
            />

            {tab === "payments" ? (
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search person or reference" aria-label="Search payments"
                            className="h-9 min-w-0 flex-1 rounded-xl sm:max-w-xs" />
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger size="sm" className="w-[130px] cursor-pointer rounded-xl" aria-label="Provider"><SelectValue /></SelectTrigger>
                            <SelectContent emptyMessage="No providers">
                                <SelectItem value={ALL}>All providers</SelectItem>
                                {Object.entries(PROVIDER_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger size="sm" className="w-[130px] cursor-pointer rounded-xl" aria-label="Status"><SelectValue /></SelectTrigger>
                            <SelectContent emptyMessage="No statuses">
                                <SelectItem value={ALL}>All statuses</SelectItem>
                                {["succeeded", "pending", "failed", "cancelled", "refunded"].map((st) => <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {(payments.data?.items.length ?? 0) === 0 && !payments.isFetching ? (
                        <BoliEmpty kind={isFirst ? "payments" : "search"} framed title="No payments" description={isFirst ? "Payments people make show here." : "Change the search or a filter."} />
                    ) : (
                        <div data-sheet-keep-open="" className={cn("min-w-0 transition-opacity", payments.isPlaceholderData && "opacity-60")}>
                            <ScrollArea orientation="both" viewportClassName="max-h-[40rem]" className="rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800">
                                <div className="min-w-[820px]">
                                    <Table scroller="parent">
                                        <TableHeader sticky>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Person</TableHead>
                                                <TableHead>For</TableHead>
                                                <TableHead>Provider</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead pin="end"><span className="sr-only">Open</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payments.data?.items.map((p) => (
                                                <TableRow key={p.id} className="cursor-pointer" onClick={() => { setPaymentRow(p); setPaymentOpen(true) }}>
                                                    <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{formatDate(p.createdAt, true)}</TableCell>
                                                    <TableCell className="max-w-[220px]">
                                                        <p className="truncate text-sm text-neutral-900 dark:text-white">{p.userName || "No name"}</p>
                                                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{p.userEmail ?? "-"}</p>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{paymentWhat(p)}</TableCell>
                                                    <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{PROVIDER_NAMES[p.provider] ?? p.provider}{p.livemode ? "" : " (test)"}</TableCell>
                                                    <TableCell><Pill>{STATUS_LABELS[p.status] ?? p.status}</Pill></TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums text-neutral-900 dark:text-white">{formatMoney(p.amountMinor, p.currency)}</TableCell>
                                                    <TableCell pin="end" className="text-right">
                                                        <Button size="sm" variant="outline" className="cursor-pointer rounded-xl" data-sheet-keep-open=""
                                                            onClick={(e) => { e.stopPropagation(); setPaymentRow(p); setPaymentOpen(true) }}>
                                                            Open
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    <ListPagination page={page} totalPages={payments.data?.pages ?? 1} totalItems={payments.data?.total} itemNoun="payments" onPageChange={setPage} disabled={payments.isFetching} />
                </div>
            ) : (
                <div className="flex min-w-0 flex-col gap-3">
                    {(subs.data?.items.length ?? 0) === 0 && !subs.isFetching ? (
                        <BoliEmpty kind="payments" framed title="No subscriptions" description="Paid plans show here once someone buys one." />
                    ) : (
                        <div data-sheet-keep-open="" className={cn("min-w-0 transition-opacity", subs.isPlaceholderData && "opacity-60")}>
                            <ScrollArea orientation="both" viewportClassName="max-h-[40rem]" className="rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800">
                                <div className="min-w-[820px]">
                                    <Table scroller="parent">
                                        <TableHeader sticky>
                                            <TableRow>
                                                <TableHead>Person</TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Period ends</TableHead>
                                                <TableHead>Renewal</TableHead>
                                                <TableHead className="text-right">Credits</TableHead>
                                                <TableHead pin="end"><span className="sr-only">Grant</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subs.data?.items.map((r) => {
                                                const running = new Date(r.currentPeriodEnd).getTime() > Date.now()
                                                return (
                                                    <TableRow key={r.id}>
                                                        <TableCell className="max-w-[220px]">
                                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{r.userName || "No name"}</p>
                                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{r.userEmail ?? "-"}</p>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{PLANS[r.planCode]?.name ?? r.planCode}</TableCell>
                                                        <TableCell><Pill>{running ? (r.status === "past_due" ? "Payment retrying" : "Active") : "Ended"}</Pill></TableCell>
                                                        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{formatDate(r.currentPeriodEnd)}</TableCell>
                                                        <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">
                                                            {r.autoRenew ? `Auto, ${PROVIDER_NAMES[r.provider ?? ""] ?? r.provider ?? "-"}` : `Prepaid, ${r.termMonths} mo`}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums text-neutral-900 dark:text-white">{formatMicroCredits(r.balanceMicro)}</TableCell>
                                                        <TableCell pin="end" className="text-right">
                                                            {canGrant ? (
                                                                <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" data-sheet-keep-open=""
                                                                    onClick={() => openGrant({ id: r.userId, name: r.userName ?? "", email: r.userEmail ?? "" })}>
                                                                    <Coins className="h-3.5 w-3.5" /> Grant
                                                                </Button>
                                                            ) : null}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    <ListPagination page={subPage} totalPages={subs.data?.pages ?? 1} totalItems={subs.data?.total} itemNoun="subscriptions" onPageChange={setSubPage} disabled={subs.isFetching} />
                </div>
            )}

            <PaymentSheet
                row={paymentRow}
                open={paymentOpen && !!paymentRow}
                onOpenChange={setPaymentOpen}
                onExitComplete={() => setPaymentRow(null)}
                onGrant={canGrant ? (t) => { setPaymentOpen(false); openGrant(t) } : undefined}
                recheckIcon={<RefreshCw className="h-4 w-4" />}
            />
            <GrantSheet target={grantTarget} open={grantOpen} onOpenChange={setGrantOpen} onExitComplete={() => setGrantTarget(null)} />
        </Page>
    )
}
