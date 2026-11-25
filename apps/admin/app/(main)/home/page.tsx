import type { Metadata } from "next"
import { getAuditLogsFiltered } from "@/actions/admin.action"
import { requireAdminPage } from "@/lib/admin-session"
import { loadHomeData } from "@/lib/home-data"
import { adminCan } from "@/lib/permissions"
import { HomeClient, type HomeOverview } from "./_components/home-client"

export const metadata: Metadata = { title: "Home" }

/** The console overview (on the Boli mark). Every admin can open it; each part shows only what they can read. */
export default async function HomePage() {
    const admin = await requireAdminPage()
    const canAudit = adminCan(admin, "admin_management")
    const [data, recent] = await Promise.all([
        loadHomeData(admin),
        canAudit ? getAuditLogsFiltered({ limit: 10 }) : null,
    ])
    const initial: HomeOverview = { data, recent: recent ? (recent.success ? recent.data?.logs ?? [] : []) : null }
    return <HomeClient initial={initial} canAudit={canAudit} firstName={admin.name.split(" ")[0] ?? ""} />
}
