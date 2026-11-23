import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { getBillingSummary } from "@/lib/platform/usage"
import { getSession } from "@/lib/session"
import { BillingView } from "./_components/billing-view"

export const metadata: Metadata = { title: "Billing" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** `?tab=history|payments`; `?add=1` opens Add credits (Kura's out-of-credits button can link here). */
export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.billing}`)
    const [data, sp] = await Promise.all([getBillingSummary(session.user.id), searchParams])
    return <BillingView initialData={data} initialTab={sp.tab} openAdd={sp.add === "1"} />
}
