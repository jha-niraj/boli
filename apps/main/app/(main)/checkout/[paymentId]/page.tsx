import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { findViewablePayment, toPaymentDetail } from "@/lib/platform/payment"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceFor } from "@/lib/workspace"
import { CheckoutResult } from "./_components/checkout-result"

export const metadata: Metadata = { title: "Payment" }

type Params = Promise<{ paymentId: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Where every gateway's return lands (via /api/payments/<provider>/return/<id>, which already asked the gateway).
 * Shows the payment as stored; while it is still open the client asks again (server to server) a few times.
 * Only the person who paid, or the owner of the workspace it credited, may see it.
 * In the app, a payment row opens the same card in a sheet on Billing (`/billing?checkout=<id>`); this page stays for
 * the gateways' return and for old links.
 */
export default async function CheckoutResultPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
    const { paymentId } = await params
    const session = await getSession()
    if (!session) redirect(`/signin?stale=1&returnTo=/checkout/${encodeURIComponent(paymentId)}`)
    const ws = await getCurrentWorkspaceFor(session.user.id)
    const row = await findViewablePayment(paymentId, session.user.id, ws)
    if (!row) notFound()
    const sp = await searchParams
    const verify = typeof sp.verify === "string" ? sp.verify : null
    const detail = toPaymentDetail(row)
    return (
        <CheckoutResult
            initial={detail.payment}
            mismatch={detail.mismatch}
            verifyNote={verify === "signature" ? "signature" : verify ? "later" : null}
        />
    )
}
