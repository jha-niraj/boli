"use server"

/**
 * /billing's reads and writes, the payment sheet's read, and the checkout result's "Check again". Every export checks the session itself
 * and returns ActionResult. Credits are applied INLINE and only after the gateway confirmed the payment server to
 * server (@repo/billing confirmPayment); starting a purchase only creates the payment row and the gateway checkout.
 * Credits belong to the CURRENT workspace; only its owner reads billing and buys credits for it.
 */
import { revalidatePath } from "next/cache"
import { requireSession } from "@repo/auth/next"
import { confirmPayment, getPayment, startCreditPurchase, type ConfirmOutcome, type PaymentView } from "@repo/billing"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { isProviderId, type CheckoutStart } from "@repo/payments"
import { ROUTES } from "@/lib/navigation"
import { getBillingSummary } from "@/lib/platform/usage"
import { addCreditsSchema, buyPackSchema, type AddCreditsInput, type BuyPackInput } from "@/schemas/billing"
import { findViewablePayment, toPaymentDetail, toPaymentView } from "@/lib/platform/payment"
import type { BillingData, PaymentDetail } from "@/types/platform"
import { getCurrentWorkspaceFor, requireWorkspaceOwner } from "@/lib/workspace"

export async function getBilling(): Promise<ActionResult<BillingData>> {
    try {
        await requireSession()
        const ws = await requireWorkspaceOwner()
        return ok(await getBillingSummary(ws.id))
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
        const ws = await requireWorkspaceOwner()
        const started = await startCreditPurchase({
            userId: session.user.id,
            workspaceId: ws.id,
            purchase: { kind: "custom", credits: parsed.data.credits },
            provider: parsed.data.provider,
            returnUrl: ROUTES.billing,
        })
        return ok({ paymentId: started.paymentId, start: started.start })
    } catch (err) {
        return fail(err, "billing.add_credits")
    }
}

/**
 * Buy a credit pack (Billing > Plans): the payment row carries the pack code and its credits from the SERVER's pack
 * table (@repo/billing CREDIT_PACKS); the credits (bonus included) are granted only once the gateway confirms.
 */
export async function startBuyPack(input: BuyPackInput): Promise<ActionResult<{ paymentId: string; start: CheckoutStart }>> {
    try {
        const session = await requireSession({ fresh: true })
        const parsed = buyPackSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Choose a credit pack.")
        const ws = await requireWorkspaceOwner()
        const started = await startCreditPurchase({
            userId: session.user.id,
            workspaceId: ws.id,
            purchase: { kind: "pack", pack: parsed.data.pack },
            provider: parsed.data.provider,
            returnUrl: ROUTES.billing,
        })
        return ok({ paymentId: started.paymentId, start: started.start })
    } catch (err) {
        return fail(err, "billing.buy_pack")
    }
}

export interface PaymentResult {
    payment: PaymentView
    state: ConfirmOutcome["state"] | "unknown"
}

/**
 * One payment for the billing page's sheet (`/billing?checkout=<id>`): the stored row only, never the gateway - opening
 * a sheet is a read. The result card asks the gateway itself (`checkPayment`) while the payment is still open.
 */
export async function getPaymentDetail(paymentId: string): Promise<ActionResult<PaymentDetail>> {
    try {
        const session = await requireSession()
        if (typeof paymentId !== "string" || !paymentId) return failWith("validation", "That payment could not be found.")
        const ws = await getCurrentWorkspaceFor(session.user.id)
        const row = await findViewablePayment(paymentId, session.user.id, ws)
        if (!row) return failWith("notfound", "That payment could not be found.")
        return ok(toPaymentDetail(row))
    } catch (err) {
        return fail(err, "billing.payment_detail")
    }
}

/** "Check again" on the result card: asks the gateway (server to server) and applies the payment if it is now paid. */
export async function checkPayment(paymentId: string): Promise<ActionResult<PaymentResult>> {
    try {
        const session = await requireSession()
        if (typeof paymentId !== "string" || !paymentId) return failWith("validation", "That payment could not be found.")
        const ws = await getCurrentWorkspaceFor(session.user.id)
        // The person who paid, or the owner of the workspace it was for (the workspace may have been switched since).
        const row = await findViewablePayment(paymentId, session.user.id, ws)
        if (!row || !isProviderId(row.provider)) return failWith("notfound", "That payment could not be found.")
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
        return ok({ state, payment: toPaymentView(fresh) })
    } catch (err) {
        return fail(err)
    }
}
