import "server-only"

import { findWorkspaceAccount, getPayment, type PaymentView } from "@repo/billing"
import type { CurrentWorkspace } from "@/lib/workspace"
import type { PaymentDetail } from "@/types/platform"

type PaymentRow = NonNullable<Awaited<ReturnType<typeof getPayment>>>

/** The stored payment as the result card shows it. */
export function toPaymentView(row: PaymentRow): PaymentView {
    return {
        id: row.id, kind: row.kind, status: row.status, provider: row.provider, currency: row.currency,
        amountMinor: row.amountMinor, planCode: row.planCode, termMonths: row.termMonths, credits: row.credits,
        autoRenew: row.autoRenew, createdAt: row.createdAt.toISOString(),
    }
}

export function toPaymentDetail(row: PaymentRow): PaymentDetail {
    return { payment: toPaymentView(row), mismatch: row.status === "failed" && (row.failureReason ?? "").startsWith("amount_mismatch") }
}

/**
 * One payment, only when this person may see it: the person who paid, or the owner of the workspace it credited (the
 * workspace may have been switched since). Null otherwise - the caller treats that as "not found". Reads only: it never
 * asks the gateway (that is `checkPayment`, on a button or on the gateway's return).
 * Used by /checkout/<id>, /billing?checkout=<id> and the billing actions, so the three can never disagree.
 */
export async function findViewablePayment(paymentId: string, userId: string, ws: CurrentWorkspace): Promise<PaymentRow | null> {
    if (!paymentId) return null
    const [row, account] = await Promise.all([getPayment(paymentId), findWorkspaceAccount(ws.id)])
    if (!row) return null
    const mine = row.userId === userId || (ws.role === "owner" && !!account && row.accountId === account.id)
    return mine ? row : null
}
