import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { findViewablePayment, toPaymentDetail } from "@/lib/platform/payment"
import { getBillingSummary } from "@/lib/platform/usage"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceFor } from "@/lib/workspace"
import { ADD_CREDITS_MAX, ADD_CREDITS_MIN, CREDIT_PACKS } from "@repo/boli"
import type { BillingPreselect } from "./_components/plans-tab"
import { BillingView } from "./_components/billing-view"

export const metadata: Metadata = { title: "Billing" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * `?tab=credits|plans|history` (an old `?tab=payments` lands on Credits, which lists payments); `?add=1` opens the custom
 * amount dialog. From the landing's pricing: `?pack=<id>` opens Plans with that pack's "Pay with" choice open, and
 * `?amount=N` opens Plans with the custom amount filled. Both are validated here; anything else is ignored. Nothing is
 * charged until the person picks eSewa or Khalti, and the price still comes from the server's pack table.
 * `?checkout=<paymentId>` opens that payment in the right sheet (deep-linkable; read here so a reload opens it with its
 * data). A payment this person may not see is ignored and the client drops the param.
 */
export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.billing}`)
    // Credits belong to the current workspace; only its owner sees and pays for them.
    const ws = await getCurrentWorkspaceFor(session.user.id)
    if (ws.role !== "owner") redirect(ROUTES.accessDenied)
    const sp = await searchParams
    const checkoutId = first(sp.checkout) ?? null
    const [data, checkoutRow] = await Promise.all([
        getBillingSummary(ws.id),
        checkoutId ? findViewablePayment(checkoutId, session.user.id, ws) : Promise.resolve(null),
    ])
    const preselect = parsePreselect(sp.pack, sp.amount)
    return (
        <BillingView
            initialData={data}
            initialTab={preselect ? "plans" : sp.tab}
            openAdd={sp.add === "1"}
            preselect={preselect}
            initialCheckout={checkoutRow ? toPaymentDetail(checkoutRow) : null}
        />
    )
}

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v
}

/** A known pack id, or a whole rupee amount in ADD_CREDITS_MIN..MAX; null when neither is valid. */
function parsePreselect(packRaw: string | string[] | undefined, amountRaw: string | string[] | undefined): BillingPreselect | null {
    const pack = CREDIT_PACKS.find((p) => p.id === first(packRaw))
    if (pack) return { pack: pack.id }
    const a = first(amountRaw)
    if (a && /^\d{1,7}$/.test(a)) {
        const amount = Number(a)
        if (amount >= ADD_CREDITS_MIN && amount <= ADD_CREDITS_MAX) return { amount }
    }
    return null
}
