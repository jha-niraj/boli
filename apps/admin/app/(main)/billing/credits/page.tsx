import type { Metadata } from "next"
import { getCreditGrants } from "@/actions/billing.action"
import { requireAdminPage } from "@/lib/admin-session"
import { CreditsClient } from "./_components/credits-client"

export const metadata: Metadata = { title: "Credits" }

/** Money > Credits: every credit grant (by an admin or automatic). Granting needs `users` write. */
export default async function CreditsPage() {
    await requireAdminPage("analytics")
    const first = await getCreditGrants(1)
    return <CreditsClient initial={first.success ? first.data : undefined} />
}
