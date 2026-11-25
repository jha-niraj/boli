"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { BadgeCent, CircleDollarSign, Coins, Gift, Receipt } from "lucide-react"
import { formatCredits } from "@repo/boli"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { getBillingOverview } from "@/actions/billing.action"
import { fmtNumber, fmtRupees } from "@/components/admin-format"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import { useAdminAccess } from "@/context/admin-access-context"
import type { BillingOverview, SalesWindow } from "@/lib/money-data"
import { ROUTES } from "@/lib/navigation"
import { BILLING_DESCRIPTION, BILLING_TITLE } from "./billing-skeleton"
import { BILLING_KEYS } from "./billing-shared"
import { GrantSheet, type GrantTarget } from "./grant-sheet"

const MUTED = "text-sm tabular-nums text-neutral-600 dark:text-neutral-400"
const STRONG = "text-sm tabular-nums text-neutral-900 dark:text-white"

/** "3 for Rs 1,500" - or "None" when nothing was sold in that window (a real zero, not a missing number). */
function sold(w: SalesWindow): string {
    return w.count === 0 ? "None" : `${fmtNumber(w.count)} for ${fmtRupees(w.minor)}`
}

/**
 * Money > Billing, the module's first page (Boli is credits only, apps/main/CLAUDE.md): this Nepal month in one
 * StatBand (rupees received, payments, credits sold, credits granted), then the credit packs and custom top-ups sold
 * (this month and all time, from @repo/boli CREDIT_PACKS) and the top buying workspaces. Data: lib/money-data.ts.
 * Payments and Credits are their own pages. Granting credits needs `users` write.
 */
export function BillingClient({ initial }: { initial: BillingOverview }) {
    const { can } = useAdminAccess()
    const canGrant = can("users", "write")
    const [grantTarget, setGrantTarget] = React.useState<GrantTarget | null>(null)
    const [grantOpen, setGrantOpen] = React.useState(false)

    const { data } = useQuery({
        queryKey: BILLING_KEYS.overview,
        queryFn: async () => {
            const r = await getBillingOverview()
            if (!r.success) throw new Error(r.error ?? "Could not load the billing figures")
            return r.data
        },
        initialData: initial,
    })
    const m = data.month
    const anySold = data.packs.some((p) => p.allTime.count > 0)
    const openGrant = (t: GrantTarget | null) => { setGrantTarget(t); setGrantOpen(true) }

    return (
        <Page
            title={BILLING_TITLE}
            description={BILLING_DESCRIPTION}
            icon={<CircleDollarSign />}
            actions={canGrant ? [{ key: "grant", label: "Grant credits", icon: <Coins className="h-3.5 w-3.5" />, primary: true, onClick: () => openGrant(null), keepSheetOpen: true }] : undefined}
        >
            <StatBand
                items={[
                    { icon: BadgeCent, label: "Rupees received", value: fmtRupees(m.receivedMinor), hint: "this month, Nepal time", href: ROUTES.payments },
                    { icon: Receipt, label: "Payments", value: fmtNumber(m.payments), hint: "paid this month", href: ROUTES.payments },
                    { icon: Coins, label: "Credits sold", value: formatCredits(m.creditsSoldMicro), hint: "this month, bonus included" },
                    {
                        icon: Gift, label: "Credits granted", value: formatCredits(m.creditsGrantedMicro),
                        hint: `this month, ${formatCredits(m.adminGrantedMicro)} by admins`, href: ROUTES.credits,
                    },
                ]}
            />

            <section className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Credit packs sold</h2>
                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">Paid in NPR, 1 credit = Rs 1</p>
                </div>
                {!anySold ? (
                    <BoliEmpty kind="payments" framed title="No credits sold yet" description="Packs and custom top-ups people pay for show here, this month and all time." />
                ) : (
                    <TableCard minWidth="min-w-[760px]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Pack</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Credits</TableHead>
                                    <TableHead className="text-right">This month</TableHead>
                                    <TableHead className="text-right">All time</TableHead>
                                    <TableHead className="text-right">Credits sold, all time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.packs.map((p) => (
                                    <TableRow key={p.id} className="h-12">
                                        <TableCell className="text-sm text-neutral-900 dark:text-white">{p.name}</TableCell>
                                        <TableCell className={`text-right ${MUTED}`}>{p.rupees === null ? "Any amount" : fmtRupees(p.rupees * 100)}</TableCell>
                                        <TableCell className={`text-right ${MUTED}`}>{p.packCredits === null ? "Same as rupees" : fmtNumber(p.packCredits)}</TableCell>
                                        <TableCell className={`text-right ${STRONG}`}>{sold(p.month)}</TableCell>
                                        <TableCell className={`text-right ${STRONG}`}>{sold(p.allTime)}</TableCell>
                                        <TableCell className={`text-right ${MUTED}`}>{fmtNumber(p.allTime.credits)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                )}
            </section>

            <section className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Top buying workspaces</h2>
                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">By rupees paid, all time, top 10</p>
                </div>
                {data.topBuyers.length === 0 ? (
                    <BoliEmpty kind="payments" framed title="No buyers yet" description="Workspaces that buy credits show here with what they paid." />
                ) : (
                    <TableCard minWidth="min-w-[760px]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Workspace</TableHead>
                                    <TableHead className="text-right">Payments</TableHead>
                                    <TableHead className="text-right">Paid, all time</TableHead>
                                    <TableHead className="text-right">Paid, this month</TableHead>
                                    <TableHead className="text-right">Credits bought</TableHead>
                                    <TableHead>Last paid</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topBuyers.map((b) => (
                                    <TableRow key={b.accountId} className="h-14">
                                        <TableCell className="max-w-[260px]">
                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{b.name || "Deleted owner"}</p>
                                            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{b.ownerType === "workspace" ? "Workspace" : b.email ?? "Personal account"}</p>
                                        </TableCell>
                                        <TableCell className={`text-right ${MUTED}`}>{fmtNumber(b.allTime.count)}</TableCell>
                                        <TableCell className={`text-right ${STRONG}`}>{fmtRupees(b.allTime.minor)}</TableCell>
                                        <TableCell className={`text-right ${MUTED}`}>{b.monthMinor === 0 ? "None" : fmtRupees(b.monthMinor)}</TableCell>
                                        <TableCell className={`text-right ${MUTED}`}>{fmtNumber(b.allTime.credits)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{b.lastPaidAt ? <RelativeTime value={b.lastPaidAt} /> : "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                )}
            </section>

            <GrantSheet target={grantTarget} open={grantOpen} onOpenChange={setGrantOpen} onExitComplete={() => setGrantTarget(null)} />
        </Page>
    )
}
