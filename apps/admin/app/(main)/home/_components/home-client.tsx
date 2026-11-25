"use client"

import type { ComponentType, ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowRight, Bot, Building2, Coins, CreditCard, Home, Inbox, Presentation, TriangleAlert, UserPlus } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { ChartPanel } from "@repo/ui/components/charts/panel-charts"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { formatCredits } from "@repo/boli"
import { formatMoney } from "@repo/billing/plans"
import { getAuditLogsFiltered, type AuditLogWithAdmin } from "@/actions/admin.action"
import { getHomeData } from "@/actions/home.action"
import { fmtNumber, humanize } from "@/components/admin-format"
import { SkyGlow } from "@/components/brand/sky-glow"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { DashDhaka } from "@/components/empty/dhaka-band"
import type { HomeData } from "@/lib/home-data"
import { ROUTES } from "@/lib/navigation"
import { signupsHint, SignupsChart, SpendChart } from "./home-charts"
import { HOME_CARD, HOME_DESCRIPTION, HOME_TITLE } from "./home-skeleton"

export interface HomeOverview {
    data: HomeData
    /** null = this admin cannot read the audit log (the card is left out). */
    recent: AuditLogWithAdmin[] | null
}

const RECENT_LIMIT = 10
const KEY = ["home", "overview"] as const

/**
 * The console Home (plan/admin/jawaf/admin-v1.md "Admin Home"): the sky glow header, one StatBand, Needs attention and
 * Recent admin activity (Dhaka-edged cards), then sign-ups and credits spent per Nepal day. Every part this admin
 * cannot read is left out - never drawn as a zero.
 */
export function HomeClient({ initial, canAudit, firstName }: { initial: HomeOverview; canAudit: boolean; firstName: string }) {
    const { data } = useQuery({
        queryKey: KEY,
        initialData: initial,
        queryFn: async (): Promise<HomeOverview> => {
            const [h, r] = await Promise.all([getHomeData(), canAudit ? getAuditLogsFiltered({ limit: RECENT_LIMIT }) : null])
            if (!h.success) throw new Error(h.error)
            if (r && !r.success) throw new Error(r.error ?? "Could not load recent activity")
            return { data: h.data, recent: r ? r.data?.logs ?? [] : null }
        },
    })
    const { people, money, jawaf, days } = data.data

    const band: StatBandItem[] = []
    if (people) {
        band.push({ key: "users", icon: UserPlus, label: "New users", value: fmtNumber(people.newUsers7), hint: "last 7 days", href: ROUTES.users })
        band.push({ key: "ws", icon: Building2, label: "Active workspaces", value: fmtNumber(people.activeWorkspaces30), hint: "used Kura, the API or Jawaf, last 30 days" })
    }
    if (money) band.push({ key: "sold", icon: Coins, label: "Credits sold", value: formatCredits(money.creditsSoldMonthMicro), hint: "this month, Nepal time", href: ROUTES.credits })
    if (jawaf) {
        band.push({ key: "live", icon: Bot, label: "Jawaf bots live", value: fmtNumber(jawaf.botsLive), hint: "customer bots", href: ROUTES.jawafBots })
        band.push({
            key: "demos", icon: Presentation, label: "Demos by stage",
            value: jawaf.demosByStage ? stageLine(jawaf.demosByStage) : "Not set up yet",
            hint: `${fmtNumber(jawaf.demoBots)} demo ${jawaf.demoBots === 1 ? "bot" : "bots"}`,
            href: ROUTES.jawafDemos,
        })
    }

    return (
        <SkyGlow>
            <Page
                title={HOME_TITLE}
                icon={<Home />}
                description={firstName ? `Welcome back, ${firstName}. ${HOME_DESCRIPTION}.` : HOME_DESCRIPTION}
                body="page"
            >
                {band.length > 0 ? <StatBand items={band} /> : null}

                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    <NeedsAttention data={data.data} />
                    {data.recent ? <RecentActivity logs={data.recent} /> : null}
                </div>

                {days ? (
                    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                        {people ? (
                            <ChartPanel title="Sign-ups per day" hint={signupsHint(days)} href={ROUTES.analytics}>
                                <SignupsChart days={days} />
                            </ChartPanel>
                        ) : null}
                        {money ? (
                            <ChartPanel title="Credits spent per day" hint="Last 30 days, by product" className={people ? undefined : "lg:col-span-2"}>
                                <SpendChart days={days} />
                            </ChartPanel>
                        ) : null}
                    </div>
                ) : null}
            </Page>
        </SkyGlow>
    )
}

function stageLine(stages: Record<string, number>): string {
    const parts = Object.entries(stages).filter(([, n]) => n > 0).map(([s, n]) => `${fmtNumber(n)} ${s}`)
    return parts.length ? parts.join(", ") : "None yet"
}

function CardHead({ title, description, href, link }: { title: string; description: string; href?: string; link?: string }) {
    return (
        <div className="flex min-w-0 items-start justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{description}</p>
            </div>
            {href && link ? (
                <AppLink href={href} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs text-boli-sky-ink hover:underline">
                    {link} <ArrowRight className="h-3 w-3" />
                </AppLink>
            ) : null}
        </div>
    )
}

type AttentionRow = { key: string; icon: ComponentType<{ className?: string }>; label: string; detail: ReactNode; count: number | null; href: string }

/**
 * What needs a person now. Rows with nothing waiting are left out; a source that is not wired yet says so (no data is
 * not a zero). Pilot requests (task 3) and demo follow-ups (task 2) are the hooks the other tasks fill in
 * lib/home-data.ts (`pilotRequests`, `jawaf.followUpsDue`).
 */
function NeedsAttention({ data }: { data: HomeData }) {
    const rows: AttentionRow[] = []
    const pending: AttentionRow[] = []
    if (data.money) {
        const first = data.money.waiting[0]
        rows.push({
            key: "payments", icon: CreditCard, label: "Payments waiting for confirmation", count: data.money.paymentsWaiting, href: `${ROUTES.payments}?status=pending`,
            detail: first ? <>{first.who}, {formatMoney(first.amountMinor, first.currency)} - <RelativeTime value={first.createdAt} /></> : "Recheck them with the gateway",
        })
    }
    if (data.jawaf) {
        const first = data.jawaf.stuck[0]
        rows.push({
            key: "jobs", icon: TriangleAlert, label: "Stuck Jawaf jobs", count: data.jawaf.stuckJobs, href: ROUTES.health,
            detail: first ? <>{first.botName}, {humanize(first.kind)} - since <RelativeTime value={first.since} /></> : "Reading or drafting that stopped moving",
        })
        const followUps: AttentionRow = { key: "followups", icon: Presentation, label: "Demo follow-ups due", count: data.jawaf.followUpsDue, href: ROUTES.jawafDemos, detail: "Next steps dated today or earlier" }
        if (followUps.count === null) pending.push(followUps)
        else rows.push(followUps)
    }
    const pilots: AttentionRow = { key: "pilots", icon: Inbox, label: "Pilot requests unanswered", count: data.pilotRequests, href: ROUTES.inbox, detail: "Jawaf pilot requests from the site" }
    if (pilots.count === null) pending.push(pilots)
    else rows.push(pilots)

    const live = rows.filter((r) => (r.count ?? 0) > 0)
    if (rows.length === 0 && pending.length === 0) return null

    return (
        <section className={HOME_CARD}>
            <DashDhaka height={9} />
            <CardHead title="Needs attention" description="What is waiting for someone on the team" />
            <div className="flex min-w-0 flex-col px-2 pb-2 pt-1">
                {live.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-neutral-600 dark:text-neutral-400">Nothing is waiting. Payments and Jawaf jobs are moving.</p>
                ) : live.map((r) => <AttentionLink key={r.key} row={r} />)}
                {pending.map((r) => <AttentionLink key={r.key} row={r} muted />)}
            </div>
        </section>
    )
}

function AttentionLink({ row, muted = false }: { row: AttentionRow; muted?: boolean }) {
    const Icon = row.icon
    return (
        <AppLink
            href={row.href}
            className="group flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:bg-neutral-800/60"
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-medium", muted ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-900 dark:text-white")}>{row.label}</span>
                <span className="block truncate text-xs text-neutral-600 dark:text-neutral-400">{muted ? "Not set up yet" : row.detail}</span>
            </span>
            {row.count !== null && !muted ? (
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                    {fmtNumber(row.count)}
                </span>
            ) : null}
            <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </AppLink>
    )
}

function RecentActivity({ logs }: { logs: AuditLogWithAdmin[] }) {
    return (
        <section className={HOME_CARD}>
            <DashDhaka height={9} />
            <CardHead title="Recent admin activity" description={`The latest ${RECENT_LIMIT} entries in the audit log`} href={ROUTES.audit} link="Open the log" />
            {logs.length === 0 ? (
                <BoliEmpty kind="usage" compact title="Nothing recorded yet" description="Changes admins make show here as they happen." />
            ) : (
                <ScrollArea orientation="vertical" className="min-w-0" viewportClassName="max-h-[22rem]">
                    <ul className="flex min-w-0 flex-col divide-y divide-neutral-100 px-4 pb-2 dark:divide-neutral-800">
                        {logs.map((log) => (
                            <li key={log.id} className="flex min-w-0 items-center gap-3 py-2.5">
                                <Activity className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-neutral-900 dark:text-white">
                                        {log.description ?? `${humanize(log.action)} in ${humanize(log.module)}`}
                                    </p>
                                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                                        {log.adminUser?.name || log.adminUser?.email || "Unknown admin"} - {humanize(log.module)}
                                    </p>
                                </div>
                                <RelativeTime value={typeof log.createdAt === "string" ? log.createdAt : log.createdAt.toISOString()} className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400" />
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            )}
        </section>
    )
}
