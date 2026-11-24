"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@repo/ui/components/ui/button"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { getPaymentDetail } from "@/actions/billing.action"
import { PaymentResultCard } from "@/components/platform/payment-result"
import { ResultCardSkeleton } from "@/components/platform/payment-result-skeleton"
import { formatDateTime } from "@/lib/platform-display"
import type { PaymentDetail } from "@/types/platform"

export const paymentDetailKey = (id: string) => ["billing", "payment-detail", id] as const

/**
 * One payment in the keep-open right sheet on Billing (`/billing?checkout=<id>`): the same result card as
 * /checkout/<id> - status, "Check again" (asks eSewa / Khalti server to server, applies the payment if it is now paid),
 * "Try again" for a failed or cancelled one, and the reference. Payment rows carry `data-sheet-keep-open`, so pressing
 * another row swaps the sheet. The caller clears `paymentId` in `onExitComplete`.
 */
export function PaymentSheet({ paymentId, initial, open, onOpenChange, onExitComplete, onRetry }: {
    paymentId: string | null
    /** From the server when the page was opened with `?checkout=<id>`, so a reload paints at once. */
    initial: PaymentDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
    /** "Try again": the caller closes the sheet and shows Plans. */
    onRetry: () => void
}) {
    const detail = useQuery({
        queryKey: paymentDetailKey(paymentId ?? ""),
        queryFn: async () => {
            const r = await getPaymentDetail(paymentId ?? "")
            if (!r.success) throw new Error(r.error ?? "That payment could not be found.")
            return r.data
        },
        enabled: !!paymentId,
        initialData: initial && initial.payment.id === paymentId ? initial : undefined,
        retry: false,
    })
    const d = detail.data

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="truncate">Payment</SheetTitle>
                    <SheetDescription className="truncate">{d ? `Started ${formatDateTime(d.payment.createdAt)}` : "What happened to your payment."}</SheetDescription>
                </SheetHeader>
                <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-3 px-6 pb-2">
                        {d ? (
                            // Re-keyed per payment so a swap starts that payment's own checks.
                            <PaymentResultCard
                                key={d.payment.id}
                                initial={d.payment}
                                mismatch={d.mismatch}
                                verifyNote={null}
                                primary={(view) => (view === "failed" || view === "cancelled" ? (
                                    <Button type="button" className="cursor-pointer" onClick={onRetry}>Try again</Button>
                                ) : null)}
                            />
                        ) : detail.isError ? (
                            <p className="py-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
                                {detail.error instanceof Error ? detail.error.message : "That payment could not be found."}
                            </p>
                        ) : paymentId ? (
                            <ResultCardSkeleton framed={false} />
                        ) : null}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
