"use client"

import { useQuery } from "@tanstack/react-query"
import { Activity, AlertTriangle, Database, HeartPulse, ListTodo, RefreshCw, TriangleAlert } from "lucide-react"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { getHealthData } from "@/actions/home.action"
import { fmtNumber, humanize } from "@/components/admin-format"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import type { HealthData } from "@/lib/health-data"
import { HEALTH_DESCRIPTION, HEALTH_TITLE } from "./health-skeleton"

const KEY = ["system", "health"] as const

/**
 * System > Health. The band is the state right now; the table lists Jawaf jobs that are stuck (queued over 15 minutes,
 * or running past their lease) or failed in the last 24 hours. "Check again" refetches; nothing here writes.
 * TODO(task 2, plan/admin/jawaf/admin-v1.md): Retry failed / Re-read now live on the bot's health panel in All bots.
 */
export function HealthClient({ initial }: { initial: HealthData }) {
    const { data, refetch, isFetching } = useQuery({
        queryKey: KEY,
        initialData: initial,
        queryFn: async () => {
            const r = await getHealthData()
            if (!r.success) throw new Error(r.error)
            return r.data
        },
    })

    const items: StatBandItem[] = [
        {
            key: "db", icon: Database, label: "Database",
            value: data.database.ok ? "Healthy" : "Not reachable",
            hint: data.database.latencyMs !== null ? `${fmtNumber(data.database.latencyMs)} ms to answer` : undefined,
            tone: data.database.ok ? undefined : "rose",
        },
        {
            key: "errors", icon: AlertTriangle, label: "Errors logged",
            value: data.errors ? fmtNumber(data.errors.last7) : "Not checked",
            hint: data.errors ? `last 7 days, ${fmtNumber(data.errors.allTime)} all time` : undefined,
            tone: data.errors && data.errors.last7 > 0 ? "amber" : undefined,
        },
    ]
    if (data.jobs) {
        items.push(
            { key: "running", icon: Activity, label: "Jobs running", value: fmtNumber(data.jobs.running), hint: `${fmtNumber(data.jobs.queued)} queued` },
            { key: "stuck", icon: TriangleAlert, label: "Stuck jobs", value: fmtNumber(data.jobs.stuck), hint: "queued 15+ min or past their lease", tone: data.jobs.stuck > 0 ? "amber" : undefined },
            { key: "failed", icon: ListTodo, label: "Failed jobs", value: fmtNumber(data.jobs.failed24h), hint: "last 24 hours", tone: data.jobs.failed24h > 0 ? "rose" : undefined },
        )
    }

    return (
        <Page
            title={HEALTH_TITLE}
            description={HEALTH_DESCRIPTION}
            icon={<HeartPulse />}
            actions={[{ key: "check", label: "Check again", icon: <RefreshCw className="h-3.5 w-3.5" />, variant: "outline", pending: isFetching, onClick: () => { void refetch() } }]}
        >
            <StatBand items={items} />
            {data.jobs ? (
                <section className="flex min-w-0 flex-col gap-2">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Jobs to look at</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            Stuck and failed jobs, newest change first. Checked <RelativeTime value={data.checkedAt} />.
                        </p>
                    </div>
                    {data.jobs.recent.length === 0 ? (
                        <BoliEmpty kind="usage" framed title="Every job is moving" description="Nothing is stuck and nothing failed in the last 24 hours." />
                    ) : (
                        <TableCard minWidth="min-w-[46rem]">
                            <Table scroller="parent">
                                <TableHeader sticky>
                                    <TableRow>
                                        <TableHead>Bot</TableHead>
                                        <TableHead>Job</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead>What went wrong</TableHead>
                                        <TableHead className="text-right">Last change</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.jobs.recent.map((j) => (
                                        <TableRow key={j.id} className="h-12">
                                            <TableCell className="max-w-[14rem] truncate text-sm text-neutral-900 dark:text-white">{j.botName}</TableCell>
                                            <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{humanize(j.kind)}</TableCell>
                                            <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">{j.status === "failed" ? "Failed" : "Stuck"}</TableCell>
                                            <TableCell className="max-w-[20rem] truncate text-sm text-neutral-600 dark:text-neutral-400" title={j.error ?? undefined}>{j.error ?? "-"}</TableCell>
                                            <TableCell className="whitespace-nowrap text-right text-sm text-neutral-600 dark:text-neutral-400"><RelativeTime value={j.at} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableCard>
                    )}
                </section>
            ) : null}
        </Page>
    )
}
