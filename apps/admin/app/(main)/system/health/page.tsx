import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/admin-session"
import { loadHealthData } from "@/lib/health-data"
import { HealthClient } from "./_components/health-client"

export const metadata: Metadata = { title: "Health" }

/** System > Health: the database, errors in the audit log and Jawaf's background jobs. */
export default async function HealthPage() {
    const admin = await requireAdminPage("system")
    const initial = await loadHealthData(admin)
    return <HealthClient initial={initial} />
}
