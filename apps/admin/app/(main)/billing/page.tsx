import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/admin-session"
import { loadBillingOverview } from "@/lib/money-data"
import { BillingClient } from "./_components/billing-client"

export const metadata: Metadata = { title: "Billing" }

/**
 * Money > Billing: Boli is credits only - this Nepal month's rupees and credits, credit packs and custom top-ups sold,
 * the top buying workspaces. The read starts here (server-only loader) and seeds the client query. Reading needs
 * `analytics`; granting needs `users` write.
 */
export default async function BillingPage() {
    await requireAdminPage("analytics")
    return <BillingClient initial={await loadBillingOverview()} />
}
