"use client"

import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, BarChart3, UserPlus, Users } from "lucide-react"
import { ChartPanel, TrendLineChart } from "@repo/ui/components/charts/panel-charts"
import { Page } from "@repo/ui/components/ui/page"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { getAnalyticsData, type AnalyticsData } from "@/actions/analytics.action"
import { dayLabel, fmtNumber } from "@/components/admin-format"
import { ROUTES } from "@/lib/navigation"
import { ANALYTICS_DESCRIPTION, ANALYTICS_TITLE } from "./analytics-skeleton"

export function AnalyticsClient({ initial }: { initial: AnalyticsData }) {
    const { data } = useQuery({
        queryKey: ["analytics", "overview"],
        initialData: initial,
        queryFn: async () => {
            const res = await getAnalyticsData()
            if (!res.success || !res.data) throw new Error(res.error ?? "Could not load analytics")
            return res.data
        },
    })
    const verifiedPct = data.signups.allTime > 0 ? Math.round((data.verifiedUsers / data.signups.allTime) * 100) : null
    const signupPoints = data.dailySignups.map((d) => ({ label: dayLabel(d.day), value: d.value }))

    return (
        <Page title={ANALYTICS_TITLE} icon={<BarChart3 />} description={ANALYTICS_DESCRIPTION} body="page">
            <StatBand
                items={[
                    { icon: Users, label: "Users", value: fmtNumber(data.signups.allTime), hint: "all time", href: ROUTES.users },
                    { icon: UserPlus, label: "Joined today", value: fmtNumber(data.signups.today), hint: "since midnight, Nepal time" },
                    { icon: UserPlus, label: "Joined, last 7 days", value: fmtNumber(data.signups.last7), hint: "today included, Nepal days" },
                    { icon: UserPlus, label: "Joined, last 30 days", value: fmtNumber(data.signups.last30), hint: "today included, Nepal days" },
                    {
                        icon: BadgeCheck,
                        label: "Email verified",
                        value: verifiedPct === null ? "No users yet" : `${verifiedPct}%`,
                        hint: verifiedPct === null ? undefined : `${fmtNumber(data.verifiedUsers)} of ${fmtNumber(data.signups.allTime)}`,
                        progress: verifiedPct ?? undefined,
                    },
                ]}
            />
            <ChartPanel title="New users per day" hint="Last 30 days, Nepal time">
                <TrendLineChart points={signupPoints} name="New users" height={220} emptyMessage="No one has signed up in the last 30 days." />
            </ChartPanel>
        </Page>
    )
}
