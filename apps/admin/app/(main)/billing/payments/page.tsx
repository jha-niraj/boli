import type { Metadata } from "next"
import { getBillingPayments } from "@/actions/billing.action"
import { requireAdminPage } from "@/lib/admin-session"
import { PAYMENT_FILTER_STATUSES } from "../_components/billing-shared"
import { PaymentsClient } from "./_components/payments-client"

export const metadata: Metadata = { title: "Payments" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** Money > Payments. `?status=pending` opens it filtered (Home's "Payments waiting" links here). */
export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
    await requireAdminPage("analytics")
    const sp = await searchParams
    const raw = typeof sp.status === "string" ? sp.status : ""
    const status = (PAYMENT_FILTER_STATUSES as readonly string[]).includes(raw) ? raw : "all"
    const first = await getBillingPayments({ status: status === "all" ? undefined : status }, 1)
    return <PaymentsClient initialStatus={status} initialPayments={first.success ? first.data : undefined} />
}
