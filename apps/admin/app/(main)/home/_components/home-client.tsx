"use client"

import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowRight, BarChart3, Home, MessageSquare, Settings, Shield, UserPlus, Users } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { SectionPanel } from "@repo/ui/components/ui/section-panel"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { getAnalyticsData, type AnalyticsData } from "@/actions/analytics.action"
import { getAuditLogsFiltered, type AuditLogWithAdmin } from "@/actions/admin.action"
import { useAdminAccess } from "@/context/admin-access-context"
import { fmtNumber, humanize } from "@/components/admin-format"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { ROUTES, type AdminPermission } from "@/lib/navigation"

export interface HomeOverview {
    analytics: AnalyticsData | null
    /** null = this admin cannot read the audit log. */
    recent: AuditLogWithAdmin[] | null
}

const QUICK_LINKS: { label: string; hint: string; href: string; icon: typeof Users; module: AdminPermission }[] = [
    { label: "Users", hint: "Look up an account", href: ROUTES.users, icon: Users, module: "users" },
    { label: "Analytics", hint: "Sign-ups over time", href: ROUTES.analytics, icon: BarChart3, module: "analytics" },
    { label: "Announcements", hint: "Tell everyone something", href: ROUTES.announcements, icon: MessageSquare, module: "communications" },
    { label: "Team", hint: "Admins and their access", href: ROUTES.admins, icon: Shield, module: "admin_management" },
    { label: "Settings", hint: "Platform configuration", href: ROUTES.settings, icon: Settings, module: "system" },
]

export function HomeClient({ initial, canAnalytics, canAudit, firstName }: {
    initial: HomeOverview
    canAnalytics: boolean
    canAudit: boolean
    firstName: string
}) {
    const { can } = useAdminAccess()
    const { data } = useQuery({
        queryKey: ["home", "overview"],
        initialData: initial,
        queryFn: async (): Promise<HomeOverview> => {
            const [a, r] = await Promise.all([
                canAnalytics ? getAnalyticsData() : null,
                canAudit ? getAuditLogsFiltered({ limit: 6 }) : null,
            ])
            if (a && !a.success) throw new Error(a.error ?? "Could not load the numbers")
            if (r && !r.success) throw new Error(r.error ?? "Could not load recent activity")
            return { analytics: a?.data ?? null, recent: r ? r.data?.logs ?? [] : null }
        },
    })

    const a = data.analytics
    const band: StatBandItem[] = a ? [
        { icon: Users, label: "Users", value: fmtNumber(a.signups.allTime), hint: "all time", href: ROUTES.users },
        { icon: UserPlus, label: "Joined today", value: fmtNumber(a.signups.today), hint: "since 00:00 UTC" },
        { icon: UserPlus, label: "Joined, last 30 days", value: fmtNumber(a.signups.last30), hint: `${fmtNumber(a.signups.last7)} in the last 7`, href: ROUTES.analytics },
        { icon: Activity, label: "Admin actions, last 7 days", value: fmtNumber(a.adminActions.last7), hint: `${fmtNumber(a.activeAdmins)} active admins`, href: ROUTES.reportsActivity },
    ] : []
    const links = QUICK_LINKS.filter((l) => can(l.module))

    return (
        <Page
            title="Home"
            icon={<Home />}
            description={firstName ? `Welcome back, ${firstName}. Here is how the platform is doing.` : "Here is how the platform is doing."}
            body="page"
        >
            {band.length > 0 && <StatBand items={band} />}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                {data.recent && (
                    <SectionPanel
                        title="Recent admin activity"
                        description="The latest entries in the audit log"
                        action={(
                            <AppLink href={ROUTES.audit} className="inline-flex cursor-pointer items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                                Open the log <ArrowRight className="h-3 w-3" />
                            </AppLink>
                        )}
                    >
                        {data.recent.length === 0 ? (
                            <BoliEmpty kind="usage" compact title="Nothing recorded yet" description="Changes admins make show here as they happen." />
                        ) : (
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {data.recent.map((log) => (
                                    <li key={log.id} className="flex min-w-0 items-center gap-3 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm text-neutral-900 dark:text-white">
                                                {log.description ?? `${humanize(log.action)} in ${humanize(log.module)}`}
                                            </p>
                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                {log.adminUser?.name || log.adminUser?.email || "Unknown admin"} - {humanize(log.module)}
                                            </p>
                                        </div>
                                        <RelativeTime value={typeof log.createdAt === "string" ? log.createdAt : log.createdAt.toISOString()} className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionPanel>
                )}
                {links.length > 0 && (
                    <SectionPanel title="Go to" description="Where the work is done" className={data.recent ? undefined : "lg:col-span-2"}>
                        <ul className="flex flex-col gap-1">
                            {links.map(({ label, hint, href, icon: Icon }) => (
                                <li key={href}>
                                    <AppLink
                                        href={href}
                                        className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">{label}</span>
                                            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>
                                        </span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                                    </AppLink>
                                </li>
                            ))}
                        </ul>
                    </SectionPanel>
                )}
            </div>
        </Page>
    )
}
