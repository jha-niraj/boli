import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/admin-session"
import { listClaims } from "@/lib/jawaf"
import { ClaimsView } from "./_components/claims-view"

export const metadata: Metadata = { title: "Claims" }

/** Claims (plan/admin/jawaf/admin-v1.md task 2). The read starts here and seeds the client query. */
export default async function ClaimsPage() {
    await requireAdminPage("jawaf")
    return <ClaimsView initialData={await listClaims()} />
}
