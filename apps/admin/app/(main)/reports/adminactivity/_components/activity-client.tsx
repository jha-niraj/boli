"use client"

import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowRight, CalendarDays, FileBarChart } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { CategoryBarChart, ChartPanel, TrendLineChart } from "@repo/ui/components/charts/panel-charts"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { TABLE_CARD, TABLE_EDGES } from "@/components/table-card"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { getAdminActivityReport, type AdminActivityReport } from "@/actions/analytics.action"
import { dayLabel, fmtNumber, humanize } from "@/components/admin-format"
import { formatAdminRole, ROUTES } from "@/lib/navigation"

export function ActivityClient({ initial }: { initial: AdminActivityReport }) {
    const { data } = useQuery({
        queryKey: ["reports", "adminactivity"],
        initialData: initial,
        queryFn: async () => {
            const res = await getAdminActivityReport()
            if (!res.success || !res.data) throw new Error(res.error ?? "Could not load the activity report")
            return res.data
        },
    })

    return (
        <Page title="Admin activity" icon={<FileBarChart />} description="Who did what in the console, in Nepal days" body="page">
            <StatBand
                items={[
                    { icon: Activity, label: "Actions today", value: fmtNumber(data.actions.today), hint: "since midnight, Nepal time" },
                    { icon: CalendarDays, label: "Last 7 days", value: fmtNumber(data.actions.last7) },
                    { icon: CalendarDays, label: "Last 30 days", value: fmtNumber(data.actions.last30) },
                    { icon: Activity, label: "All time", value: fmtNumber(data.actions.allTime), href: ROUTES.audit },
                ]}
            />
            <div className="grid gap-3 lg:grid-cols-2">
                <ChartPanel title="Actions per day" hint="Last 30 days, Nepal time">
                    <TrendLineChart
                        points={data.daily.map((d) => ({ label: dayLabel(d.day), value: d.value }))}
                        name="Actions"
                        emptyMessage="No admin actions in the last 30 days."
                    />
                </ChartPanel>
                <ChartPanel title="Actions by area" hint="Last 30 days">
                    <CategoryBarChart
                        bars={data.byModule.map((m) => ({ label: humanize(m.module), value: m.count }))}
                        name="Actions"
                        highlight="highest"
                        emptyMessage="No admin actions in the last 30 days."
                    />
                </ChartPanel>
            </div>

            <section className="flex min-w-0 flex-col gap-2">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">By admin</h2>
                <div className={TABLE_CARD}>
                    <ScrollArea orientation="both" viewportClassName="max-h-[44rem]">
                        <div className={`min-w-[720px] ${TABLE_EDGES}`}>
                            <Table scroller="parent">
                                <TableHeader sticky>
                                    <TableRow>
                                        <TableHead>Admin</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Last 30 days</TableHead>
                                        <TableHead className="text-right">All time</TableHead>
                                        <TableHead>Last action</TableHead>
                                        <TableHead pin="end" className="w-px"><span className="sr-only">Open</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.admins.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="whitespace-normal">
                                                <BoliEmpty kind="usage" compact title="No admins yet" description="Admins you invite show here with what they did." />
                                            </TableCell>
                                        </TableRow>
                                    ) : data.admins.map((a) => (
                                        <TableRow key={a.adminId}>
                                            <TableCell className="max-w-[16rem]">
                                                <p className="truncate font-medium text-neutral-900 dark:text-white">{a.name || a.email || "Unknown"}</p>
                                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{a.email}</p>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{formatAdminRole(a.role)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{fmtNumber(a.last30)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{fmtNumber(a.allTime)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                                                {a.lastActionAt ? <RelativeTime value={a.lastActionAt} /> : "Nothing recorded yet"}
                                            </TableCell>
                                            <TableCell pin="end">
                                                <Button asChild size="sm" variant="ghost" className="cursor-pointer gap-1">
                                                    <AppLink href={`${ROUTES.audit}?admin=${encodeURIComponent(a.adminId)}`}>
                                                        Log <ArrowRight className="h-3.5 w-3.5" />
                                                    </AppLink>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ScrollArea>
                </div>
            </section>
        </Page>
    )
}
