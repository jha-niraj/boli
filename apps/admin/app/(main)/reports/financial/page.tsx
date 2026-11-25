import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/admin-session"
import { loadFinancialReport } from "@/lib/money-data"
import { FinancialClient } from "./_components/financial-client"

export const metadata: Metadata = { title: "Financial report" }

/** Money > Reports > Financial. The read starts here (server-only loader) and seeds the client query. */
export default async function FinancialReportPage() {
    await requireAdminPage("analytics")
    return <FinancialClient initial={await loadFinancialReport()} />
}
