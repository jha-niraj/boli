"use client"

import { useQuery } from "@tanstack/react-query"
import { FilePen, Mail, Megaphone, MessageSquare, Radio, Send } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { SectionPanel } from "@repo/ui/components/ui/section-panel"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { getCommunicationsOverview, type CommunicationsOverview } from "@/actions/communications.action"
import { fmtNumber, humanize } from "@/components/admin-format"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { ROUTES } from "@/lib/navigation"

export function OverviewClient({ initial }: { initial: CommunicationsOverview }) {
    const { data } = useQuery({
        queryKey: ["communications", "overview"],
        initialData: initial,
        queryFn: async () => {
            const res = await getCommunicationsOverview()
            if (!res.success) throw new Error(res.error)
            return res.data
        },
    })
    const drafts = data.announcements.drafts + data.broadcasts.drafts

    return (
        <Page
            title="Communications"
            icon={<MessageSquare />}
            description="Announcements in the app and email broadcasts"
            body="page"
            actions={[
                { key: "announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" />, href: ROUTES.announcements, primary: true },
                { key: "broadcasts", label: "Broadcasts", icon: <Radio className="h-4 w-4" />, href: ROUTES.broadcasts, variant: "outline" },
            ]}
        >
            <StatBand
                items={[
                    { icon: Megaphone, label: "Announcements live", value: fmtNumber(data.announcements.published), hint: `${fmtNumber(data.announcements.archived)} archived`, href: ROUTES.announcements },
                    { icon: FilePen, label: "Drafts", value: fmtNumber(drafts), hint: `${fmtNumber(data.announcements.drafts)} announcements, ${fmtNumber(data.broadcasts.drafts)} broadcasts` },
                    { icon: Send, label: "Broadcasts sent", value: fmtNumber(data.broadcasts.sent), hint: "all time", href: ROUTES.broadcasts },
                    { icon: Mail, label: "Emails sent, last 30 days", value: fmtNumber(data.broadcasts.emailsSentLast30) },
                ]}
            />
            <SectionPanel title="Latest" description="The newest announcements and broadcasts">
                {data.latest.length === 0 ? (
                    <BoliEmpty kind="notifications" compact title="Nothing written yet" description="Start with an announcement." />
                ) : (
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {data.latest.map((item) => {
                            const Icon = item.kind === "announcement" ? Megaphone : Radio
                            const href = `${item.kind === "announcement" ? ROUTES.announcements : ROUTES.broadcasts}?open=${encodeURIComponent(item.id)}`
                            return (
                                <li key={`${item.kind}-${item.id}`}>
                                    <AppLink href={href} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm text-neutral-900 dark:text-white">{item.title}</span>
                                            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                {item.kind === "announcement" ? "Announcement" : "Broadcast"} - {humanize(item.status)}
                                            </span>
                                        </span>
                                        <RelativeTime value={item.createdAt} className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400" />
                                    </AppLink>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </SectionPanel>
        </Page>
    )
}
