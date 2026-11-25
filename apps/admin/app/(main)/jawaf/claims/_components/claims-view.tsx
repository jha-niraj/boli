"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, KeyRound, RefreshCw } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { Input } from "@repo/ui/components/ui/input"
import { Page } from "@repo/ui/components/ui/page"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { toast } from "@repo/ui/components/ui/toast"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import { useAdminAccess } from "@/context/admin-access-context"
import { generateJawafClaim, getJawafClaims, revokeJawafClaim } from "@/actions/jawaf/claims.action"
import { ROUTES } from "@/lib/navigation"
import { CLAIM_STATUS_LABELS, type ClaimStatus, type ClaimView } from "@/types/jawaf"
import { ClaimChip, copyText, fmtDate, JAWAF_KEYS } from "../../_components/jawaf-bits"
import { CLAIMS_DESCRIPTION, CLAIMS_TITLE } from "./claims-skeleton"

/**
 * Every claim link (plan/admin/jawaf/admin-v1.md): bot, prospect, made, sent, opened, claimed, expires, status. A
 * link's token is never stored, so an open link cannot be copied again: "New link" makes a fresh one (the old one
 * stops working) and copies it. Revoke kills an open link.
 */
export function ClaimsView({ initialData }: { initialData: ClaimView[] }) {
    const { can } = useAdminAccess()
    const canWrite = can("jawaf", "write")
    const queryClient = useQueryClient()
    const [status, setStatus] = React.useState<ClaimStatus | "all">("all")
    const [search, setSearch] = React.useState("")
    const q = useDebounce(search.trim().toLowerCase(), 200)

    const claims = useQuery({
        queryKey: JAWAF_KEYS.claims,
        queryFn: async () => {
            const r = await getJawafClaims()
            if (!r.success) throw new Error(r.error ?? "Could not load the claim links")
            return r.data
        },
        initialData,
    })
    const revoke = useMutation({
        mutationFn: async (id: string) => {
            const r = await revokeJawafClaim(id)
            if (!r.success) throw new Error(r.error ?? "The link could not be revoked")
        },
        onSuccess: async () => { toast.success("Link revoked"); await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all }) },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The link could not be revoked"),
    })
    const renew = useMutation({
        mutationFn: async (c: ClaimView) => {
            const r = await generateJawafClaim({ botId: c.botId, prospectId: c.prospectId ?? undefined })
            if (!r.success) throw new Error(r.error ?? "The link could not be made")
            return r.data
        },
        onSuccess: async (made) => { await copyText(made.url, "New claim link made and copied"); await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all }) },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The link could not be made"),
    })

    const all = claims.data
    const rows = all.filter((c) => (status === "all" || c.status === status) && (!q || [c.botName, c.prospectBusiness, c.sentToEmail].some((v) => v?.toLowerCase().includes(q))))

    return (
        <Page title={CLAIMS_TITLE} description={CLAIMS_DESCRIPTION} icon={<KeyRound />}>
            <div className="flex min-w-0 items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bot, business, email" aria-label="Search claim links" className="h-9 min-w-0 flex-1 rounded-xl sm:max-w-xs" />
                <Select value={status} onValueChange={(v) => setStatus(v as ClaimStatus | "all")}>
                    <SelectTrigger size="sm" className="w-[150px] cursor-pointer rounded-xl" aria-label="Status"><SelectValue /></SelectTrigger>
                    <SelectContent emptyMessage="No statuses">
                        <SelectItem value="all">All links</SelectItem>
                        {(["open", "claimed", "expired", "revoked"] as const).map((s) => <SelectItem key={s} value={s}>{CLAIM_STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {rows.length === 0 ? (
                <BoliEmpty kind={all.length ? "search" : "keys"} framed title={all.length ? "No links match" : "No claim links yet"} description={all.length ? "Change the search or the status." : "Make one from a demo's sheet when the business is ready to take it over."} />
            ) : (
                <TableCard minWidth="min-w-[66rem]">
                    <Table scroller="parent">
                        <TableHeader sticky>
                            <TableRow>
                                <TableHead>Bot</TableHead>
                                <TableHead>Business</TableHead>
                                <TableHead>Made</TableHead>
                                <TableHead>Sent</TableHead>
                                <TableHead>Opened</TableHead>
                                <TableHead>Claimed</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead pin="end"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="max-w-[180px] truncate text-sm text-neutral-900 dark:text-white">{c.botName}</TableCell>
                                    <TableCell className="max-w-[180px] truncate text-sm">
                                        {c.prospectId ? <AppLink href={`${ROUTES.jawafDemos}?prospect=${encodeURIComponent(c.prospectId)}`} className="text-boli-sky-ink hover:underline">{c.prospectBusiness ?? "Prospect"}</AppLink> : <span className="text-neutral-500 dark:text-neutral-400">-</span>}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                                        {fmtDate(c.createdAt, true)}
                                        {c.createdByName ? <span className="block text-xs text-neutral-500 dark:text-neutral-400">{c.createdByName}</span> : null}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] text-sm text-neutral-700 dark:text-neutral-300">
                                        {c.sentAt ? <>{fmtDate(c.sentAt, true)}<span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{c.sentToEmail}</span></> : "Not sent"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">{c.linkOpenedAt ? fmtDate(c.linkOpenedAt, true) : "Not yet"}</TableCell>
                                    <TableCell className="max-w-[180px] text-sm text-neutral-700 dark:text-neutral-300">
                                        {c.claimedAt ? <>{fmtDate(c.claimedAt, true)}<span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{c.claimedWorkspaceName}</span></> : "-"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">{fmtDate(c.expiresAt)}</TableCell>
                                    <TableCell><ClaimChip status={c.status} /></TableCell>
                                    <TableCell pin="end" className="text-right">
                                        {canWrite && c.status !== "claimed" ? (
                                            <div className="flex justify-end gap-1.5">
                                                <ConfirmPopover title="Make a new link and copy it?" description="Any open link for this bot stops working." confirmLabel="New link" destructive={false}
                                                    onConfirm={() => renew.mutateAsync(c).then(() => undefined)}>
                                                    <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={renew.isPending}><RefreshCw className="h-3.5 w-3.5" /> New link</Button>
                                                </ConfirmPopover>
                                                {c.status === "open" ? (
                                                    <ConfirmPopover title="Revoke this link?" description="It stops working at once. The bot stays a demo." confirmLabel="Revoke"
                                                        onConfirm={() => revoke.mutateAsync(c.id)}>
                                                        <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={revoke.isPending}><Ban className="h-3.5 w-3.5" /> Revoke</Button>
                                                    </ConfirmPopover>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableCard>
            )}
        </Page>
    )
}
