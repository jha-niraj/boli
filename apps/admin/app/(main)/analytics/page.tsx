import type { Metadata } from "next"
import { getAnalyticsData } from "@/actions/analytics.action"
import { requireAdminPage } from "@/lib/admin-session"
import { AnalyticsClient } from "./_components/analytics-client"

export const metadata: Metadata = { title: "Sign-ups" }

export default async function AnalyticsPage() {
    await requireAdminPage("analytics")
    const res = await getAnalyticsData()
    if (!res.success || !res.data) throw new Error(res.error ?? "Could not load analytics")
    return <AnalyticsClient initial={res.data} />
}
