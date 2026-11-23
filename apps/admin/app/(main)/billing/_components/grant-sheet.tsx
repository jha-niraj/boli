"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Coins, Search } from "lucide-react"
import { formatCredits, formatMicroCredits } from "@repo/billing/plans"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { findBillingUser, getUserCredits, grantUserCredits } from "@/actions/billing.action"
import { formatDate } from "../../admins/_components/admin-bits"
import { BILLING_KEYS } from "./billing-shared"

export interface GrantTarget {
    id: string
    name: string
    email: string
}

const KIND_LABEL: Record<string, string> = { grant: "Grant", purchase: "Bought", spend: "Spent", refund: "Refund", expiry: "Removed" }

/**
 * Grant credits to one person (negative takes them back), in the keep-open right sheet. Opened from a row (the person
 * is known) or from the header (find them by email). The confirm is a popover on the button; the request id is made
 * once per opening, so a double submit is ONE grant; the server writes the audit row.
 */
export function GrantSheet({ target, open, onOpenChange, onExitComplete }: {
    target: GrantTarget | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
}) {
    const queryClient = useQueryClient()
    const [found, setFound] = React.useState<GrantTarget | null>(null)
    const [email, setEmail] = React.useState("")
    const [lookupNote, setLookupNote] = React.useState<string | null>(null)
    const [credits, setCredits] = React.useState("")
    const [reason, setReason] = React.useState("")
    const [requestId, setRequestId] = React.useState(() => crypto.randomUUID())
    const person = target ?? found

    const ledger = useQuery({
        queryKey: BILLING_KEYS.credits(person?.id ?? ""),
        queryFn: async () => {
            const r = await getUserCredits(person!.id)
            if (!r.success) throw new Error(r.error ?? "Could not load the balance")
            return r.data
        },
        enabled: open && !!person,
    })

    const lookup = useMutation({
        mutationFn: async () => {
            const r = await findBillingUser(email)
            if (!r.success) throw new Error(r.error ?? "Could not look that up")
            return r.data
        },
        onSuccess: (u) => {
            setFound(u)
            setLookupNote(u ? null : "No one has that email.")
        },
        onError: (e) => setLookupNote(e instanceof Error ? e.message : "Could not look that up"),
    })

    const amount = Math.trunc(Number(credits))
    const valid = !!person && Number.isFinite(amount) && amount !== 0 && reason.trim().length > 0

    const grant = useMutation({
        mutationFn: async () => {
            if (!person) return
            const r = await grantUserCredits({ userId: person.id, credits: amount, reason, requestId })
            if (!r.success) throw new Error(r.error ?? "The credits could not be granted")
            return r.data
        },
        onSuccess: async (d) => {
            toast.success(d?.applied === false ? "Already granted" : amount > 0 ? `Granted ${formatCredits(amount)} credits` : `Removed ${formatCredits(Math.abs(amount))} credits`)
            setCredits("")
            setReason("")
            setRequestId(crypto.randomUUID())
            await queryClient.invalidateQueries({ queryKey: BILLING_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The credits could not be granted"),
    })

    const reset = () => {
        setFound(null); setEmail(""); setLookupNote(null); setCredits(""); setReason(""); setRequestId(crypto.randomUUID())
        onExitComplete()
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={reset}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle className="truncate">{person ? `Credits for ${person.name || person.email}` : "Grant credits"}</SheetTitle>
                    <SheetDescription className="truncate">{person ? person.email : "Find the person by their email."}</SheetDescription>
                </SheetHeader>
                <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-4 px-6 pb-2">
                        {!target ? (
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="grant-email">Email</Label>
                                <div className="flex min-w-0 gap-2">
                                    <Input id="grant-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 min-w-0 flex-1 rounded-xl"
                                        onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) lookup.mutate() }} />
                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5 rounded-xl" disabled={!email.trim() || lookup.isPending} onClick={() => lookup.mutate()}>
                                        {lookup.isPending ? <InlineLoader size={14} label="Finding" /> : <Search className="h-3.5 w-3.5" />} Find
                                    </Button>
                                </div>
                                {lookupNote ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{lookupNote}</p> : null}
                            </div>
                        ) : null}

                        {person ? (
                            <>
                                <div className="flex min-w-0 items-baseline justify-between gap-3">
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Balance</span>
                                    {ledger.data ? (
                                        <span className="text-base font-semibold tabular-nums text-neutral-900 dark:text-white">{formatMicroCredits(ledger.data.balanceMicro)}</span>
                                    ) : <Skeleton className="h-5 w-16 rounded-md" />}
                                </div>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <Label htmlFor="grant-credits">Credits</Label>
                                    <Input id="grant-credits" inputMode="numeric" value={credits} onChange={(e) => setCredits(e.target.value.replace(/[^\d-]/g, ""))}
                                        placeholder="e.g. 1000, or -500 to take back" className="h-9 rounded-xl" />
                                </div>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <Label htmlFor="grant-reason">Why</Label>
                                    <Textarea id="grant-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
                                        placeholder="Shown in the audit log" className="field-sizing-content min-h-16 rounded-xl text-sm" />
                                </div>
                                <div className="flex min-w-0 flex-col gap-1">
                                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Recent</h3>
                                    {ledger.data?.entries.length ? (
                                        <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                                            {ledger.data.entries.map((e) => (
                                                <li key={e.id} className="flex min-w-0 items-center gap-3 py-2">
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm text-neutral-900 dark:text-white">{e.description ?? KIND_LABEL[e.kind] ?? e.kind}</span>
                                                        <span className="block text-xs text-neutral-500 dark:text-neutral-400">{KIND_LABEL[e.kind] ?? e.kind} - {formatDate(e.createdAt, true)}</span>
                                                    </span>
                                                    <span className="shrink-0 text-sm tabular-nums text-neutral-900 dark:text-white">{e.amountMicro > 0 ? "+" : ""}{formatMicroCredits(e.amountMicro)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : ledger.isPending ? (
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                    ) : null}
                                </div>
                            </>
                        ) : null}
                    </div>
                </ScrollArea>
                <SheetFooter>
                    <Button type="button" variant="outline" className="cursor-pointer rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
                    <ConfirmPopover
                        title={amount < 0 ? `Remove ${formatCredits(Math.abs(amount || 0))} credits?` : `Grant ${formatCredits(amount || 0)} credits?`}
                        description={person ? `To ${person.email}. This is recorded in the audit log.` : undefined}
                        confirmLabel={amount < 0 ? "Remove" : "Grant"}
                        destructive={amount < 0}
                        side="top"
                        disabled={!valid || grant.isPending}
                        onConfirm={() => grant.mutateAsync().then(() => undefined)}
                    >
                        <Button type="button" className="cursor-pointer gap-2 rounded-xl" disabled={!valid || grant.isPending}>
                            {grant.isPending ? <InlineLoader size={14} label="Saving" /> : <Coins className="h-4 w-4" />}
                            {amount < 0 ? "Remove credits" : "Grant credits"}
                        </Button>
                    </ConfirmPopover>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
