"use server"

/**
 * /billing's reads and writes, and the checkout result page's "Check again". Every export checks the session itself
 * and returns ActionResult. Credits are applied INLINE and only after the gateway confirmed the payment server to
 * server (@repo/billing confirmPayment); starting a purchase only creates the payment row and the gateway checkout.
 */
import { revalidatePath } from "next/cache"
import { requireSession } from "@repo/auth/next"
import { accountForUser, confirmPayment, getPayment, startCreditPurchase, type ConfirmOutcome, type PaymentView } from "@repo/billing"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { isProviderId, type CheckoutStart } from "@repo/payments"
import { ROUTES } from "@/lib/navigation"
import { getBillingSummary } from "@/lib/platform/usage"
import { addCreditsSchema, type AddCreditsInput } from "@/schemas/billing"
import type { BillingData } from "@/types/platform"

export async function getBilling(): Promise<ActionResult<BillingData>> {
    try {
        const session = await requireSession()
        return ok(await getBillingSummary(session.user.id))
    } catch (err) {
        return fail(err, "billing.read")
    }
}

/** Add credits: creates the payment and the eSewa / Khalti checkout; the browser then follows `start`. */
export async function startAddCredits(input: AddCreditsInput): Promise<ActionResult<{ paymentId: string; start: CheckoutStart }>> {
    try {
        const session = await requireSession({ fresh: true })
        const parsed = addCreditsSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the amount.")
        const started = await startCreditPurchase({
            userId: session.user.id,
            credits: parsed.data.credits,
            provider: parsed.data.provider,
            returnUrl: ROUTES.billing,
        })
        return ok({ paymentId: started.paymentId, start: started.start })
    } catch (err) {
        return fail(err, "billing.add_credits")
    }
}

export interface PaymentResult {
    payment: PaymentView
    state: ConfirmOutcome["state"] | "unknown"
}

/** "Check again" on the result page: asks the gateway (server to server) and applies the payment if it is now paid. */
export async function checkPayment(paymentId: string): Promise<ActionResult<PaymentResult>> {
    try {
        const session = await requireSession()
        if (typeof paymentId !== "string" || !paymentId) return failWith("validation", "That payment could not be found.")
        const [row, account] = await Promise.all([getPayment(paymentId), accountForUser(session.user.id)])
        if (!row || row.accountId !== account.id || !isProviderId(row.provider)) return failWith("notfound", "That payment could not be found.")
        let state: PaymentResult["state"] = "unknown"
        if (row.fulfilledAt) state = "paid"
        else if (row.status !== "failed" && row.status !== "refunded") {
            try {
                state = (await confirmPayment(row.provider, row.id)).state
            } catch (err) {
                console.error("[billing] check payment failed", err instanceof Error ? err.message : err)
            }
        }
        const fresh = (await getPayment(row.id)) ?? row
        revalidatePath(ROUTES.billing)
        return ok({
            state,
            payment: {
                id: fresh.id, kind: fresh.kind, status: fresh.status, provider: fresh.provider, currency: fresh.currency,
                amountMinor: fresh.amountMinor, planCode: fresh.planCode, termMonths: fresh.termMonths, credits: fresh.credits,
                autoRenew: fresh.autoRenew, createdAt: fresh.createdAt.toISOString(),
            },
        })
    } catch (err) {
        return fail(err)
    }
}
