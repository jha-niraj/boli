"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Coins } from "lucide-react"
import type { Paged } from "@repo/billing"
import { formatMicroCredits } from "@repo/billing/plans"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { Page } from "@repo/ui/components/ui/page"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { cn } from "@repo/ui/lib/utils"
import { getCreditGrants, type CreditGrantRow } from "@/actions/billing.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import { useAdminAccess } from "@/context/admin-access-context"
import { formatDate } from "../../../admins/_components/admin-bits"
import { BILLING_KEYS } from "../../_components/billing-shared"
import { GrantSheet } from "../../_components/grant-sheet"
import { CREDITS_DESCRIPTION, CREDITS_TITLE, CreditsSkeleton } from "./credits-skeleton"

/**
 * Money > Credits: the credit ledger's grants, newest first - admin grants (who, why) and automatic ones (welcome
 * credits). One-line rows, nothing to open: the reason is the whole record. "Grant credits" opens the grant sheet.
 */
export function CreditsClient({ initial }: { initial?: Paged<CreditGrantRow> }) {
    const { can } = useAdminAccess()
    const canGrant = can("users", "write")
    const [page, setPage] = React.useState(1)
    const [grantOpen, setGrantOpen] = React.useState(false)

    const grants = useQuery({
        queryKey: BILLING_KEYS.grants(page),
        queryFn: async () => {
            const r = await getCreditGrants(page)
            if (!r.success) throw new Error(r.error)
            return r.data
        },
        initialData: page === 1 ? initial : undefined,
        placeholderData: keepPreviousData,
    })

    if (!grants.data && grants.isPending) return <CreditsSkeleton />

    return (
        <Page
            title={CREDITS_TITLE}
            description={CREDITS_DESCRIPTION}
            icon={<Coins />}
            actions={canGrant ? [{ key: "grant", label: "Grant credits", icon: <Coins className="h-3.5 w-3.5" />, primary: true, onClick: () => setGrantOpen(true), keepSheetOpen: true }] : undefined}
        >
            {(grants.data?.items.length ?? 0) === 0 && !grants.isFetching ? (
                <BoliEmpty kind="payments" framed title="No grants yet" description="Credits given by an admin, and welcome credits, show here." />
            ) : (
                <div className={cn("min-w-0 transition-opacity", grants.isPlaceholderData && "opacity-60")}>
                    <TableCard minWidth="min-w-[760px]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Why</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead className="text-right">Credits</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {grants.data?.items.map((g) => (
                                    <TableRow key={g.id} className="h-14">
                                        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{formatDate(g.createdAt, true)}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{g.ownerName || (g.ownerType === "workspace" ? "Deleted workspace" : "Deleted account")}</p>
                                            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{g.ownerType === "workspace" ? "Workspace" : g.ownerEmail ?? "-"}</p>
                                        </TableCell>
                                        <TableCell className="max-w-[18rem] truncate text-sm text-neutral-700 dark:text-neutral-300" title={g.reason ?? undefined}>{g.reason ?? "-"}</TableCell>
                                        <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{g.grantedByName ?? "Automatic"}</TableCell>
                                        <TableCell className="text-right text-sm tabular-nums text-neutral-900 dark:text-white">
                                            {g.amountMicro > 0 ? "+" : ""}{formatMicroCredits(g.amountMicro)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                </div>
            )}
            <ListPagination page={page} totalPages={grants.data?.pages ?? 1} totalItems={grants.data?.total} itemNoun="grants" onPageChange={setPage} disabled={grants.isFetching} />

            <GrantSheet target={null} open={grantOpen} onOpenChange={setGrantOpen} onExitComplete={() => undefined} />
        </Page>
    )
}
