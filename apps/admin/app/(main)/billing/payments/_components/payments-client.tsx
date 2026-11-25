"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Coins, CreditCard, RefreshCw } from "lucide-react"
import type { AdminPaymentRow, Paged } from "@repo/billing"
import { formatMoney } from "@repo/billing/plans"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { Page } from "@repo/ui/components/ui/page"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { cn } from "@repo/ui/lib/utils"
import { getBillingPayments } from "@/actions/billing.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import { useAdminAccess } from "@/context/admin-access-context"
import { formatDate, Pill } from "../../../admins/_components/admin-bits"
import { BILLING_KEYS, PAYMENT_FILTER_STATUSES, paymentWhat, PROVIDER_NAMES, STATUS_LABELS } from "../../_components/billing-shared"
import { GrantSheet, type GrantTarget } from "../../_components/grant-sheet"
import { PaymentSheet } from "../../_components/payment-sheet"
import { PAYMENTS_DESCRIPTION, PAYMENTS_TITLE, PaymentsSkeleton } from "./payments-skeleton"

const ALL = "all"

/**
 * Money > Payments: filter by provider and status, search by person or reference; a row opens the keep-open payment
 * sheet with "Check with gateway". The status filter is kept in `?status=` with history.replaceState (no page round
 * trip), so a link from Home opens it filtered.
 */
export function PaymentsClient({ initialStatus, initialPayments }: { initialStatus: string; initialPayments?: Paged<AdminPaymentRow> }) {
    const { can } = useAdminAccess()
    const canGrant = can("users", "write")
    const [page, setPage] = React.useState(1)
    const [provider, setProvider] = React.useState(ALL)
    const [status, setStatusRaw] = React.useState(initialStatus)
    const [search, setSearch] = React.useState("")
    const debounced = useDebounce(search.trim(), 300)
    const [row, setRow] = React.useState<AdminPaymentRow | null>(null)
    const [open, setOpen] = React.useState(false)
    const [grantTarget, setGrantTarget] = React.useState<GrantTarget | null>(null)
    const [grantOpen, setGrantOpen] = React.useState(false)

    React.useEffect(() => { setPage(1) }, [provider, status, debounced])

    const setStatus = (next: string) => {
        setStatusRaw(next)
        const url = new URL(window.location.href)
        if (next === ALL) url.searchParams.delete("status")
        else url.searchParams.set("status", next)
        window.history.replaceState(window.history.state, "", url.toString())
    }

    const isFirst = page === 1 && provider === ALL && status === initialStatus && debounced === ""
    const unfiltered = provider === ALL && status === ALL && debounced === ""
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

    if (!payments.data && payments.isPending) return <PaymentsSkeleton />

    const openRow = (p: AdminPaymentRow) => { setRow(p); setOpen(true) }
    const openGrant = (t: GrantTarget | null) => { setGrantTarget(t); setGrantOpen(true) }

    return (
        <Page
            title={PAYMENTS_TITLE}
            description={PAYMENTS_DESCRIPTION}
            icon={<CreditCard />}
            actions={canGrant ? [{ key: "grant", label: "Grant credits", icon: <Coins className="h-3.5 w-3.5" />, primary: true, onClick: () => openGrant(null), keepSheetOpen: true }] : undefined}
        >
            <div className="flex min-w-0 items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search person or reference" aria-label="Search payments"
                    className="h-9 min-w-0 flex-1 sm:max-w-xs" />
                <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger size="sm" className="w-[130px] cursor-pointer" aria-label="Provider"><SelectValue /></SelectTrigger>
                    <SelectContent emptyMessage="No providers">
                        <SelectItem value={ALL}>All providers</SelectItem>
                        {Object.entries(PROVIDER_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger size="sm" className="w-[130px] cursor-pointer" aria-label="Status"><SelectValue /></SelectTrigger>
                    <SelectContent emptyMessage="No statuses">
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        {PAYMENT_FILTER_STATUSES.map((st) => <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {(payments.data?.items.length ?? 0) === 0 && !payments.isFetching ? (
                <BoliEmpty kind={unfiltered ? "payments" : "search"} framed title="No payments" description={unfiltered ? "Payments people make show here." : "Change the search or a filter."} />
            ) : (
                <div data-sheet-keep-open="" className={cn("min-w-0 transition-opacity", payments.isPlaceholderData && "opacity-60")}>
                    <TableCard minWidth="min-w-[820px]" maxHeight="max-h-[40rem]">
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
                                    <TableRow key={p.id} className="h-14 cursor-pointer" data-state={open && row?.id === p.id ? "selected" : undefined} onClick={() => openRow(p)}>
                                        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{formatDate(p.createdAt, true)}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{p.userName || "No name"}</p>
                                            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{p.userEmail ?? "-"}</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{paymentWhat(p)}</TableCell>
                                        <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{PROVIDER_NAMES[p.provider] ?? p.provider}{p.livemode ? "" : " (test)"}</TableCell>
                                        <TableCell><Pill>{STATUS_LABELS[p.status] ?? p.status}</Pill></TableCell>
                                        <TableCell className="text-right text-sm tabular-nums text-neutral-900 dark:text-white">{formatMoney(p.amountMinor, p.currency)}</TableCell>
                                        <TableCell pin="end" className="text-right">
                                            <Button size="sm" variant="outline" className="cursor-pointer" data-sheet-keep-open=""
                                                onClick={(e) => { e.stopPropagation(); openRow(p) }}>
                                                Open
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                </div>
            )}
            <ListPagination page={page} totalPages={payments.data?.pages ?? 1} totalItems={payments.data?.total} itemNoun="payments" onPageChange={setPage} disabled={payments.isFetching} />

            <PaymentSheet
                row={row}
                open={open && !!row}
                onOpenChange={setOpen}
                onExitComplete={() => setRow(null)}
                onGrant={canGrant ? (t) => { setOpen(false); openGrant(t) } : undefined}
                recheckIcon={<RefreshCw className="h-4 w-4" />}
            />
            <GrantSheet target={grantTarget} open={grantOpen} onOpenChange={setGrantOpen} onExitComplete={() => setGrantTarget(null)} />
        </Page>
    )
}
