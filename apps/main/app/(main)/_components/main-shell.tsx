"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import { AppShell } from "@repo/ui/components/shell/app-shell"
import { AppLink, markNavPending } from "@repo/ui/components/app-link"
import { NotificationsPanel, type NotificationView } from "@repo/ui/components/ui/notifications-panel"
import type { ShellUser } from "@repo/ui/lib/shell"
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from "@/actions/notification.action"
import { BoliLogo } from "@/components/brand/boli-logo"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { CreditsRow, useBalance } from "@/components/shell/credits-chip"
import { BRAND, formatCredits } from "@/lib/boli"
import { MAIN_NAV, MAIN_RAIL_COOKIE, ROUTES } from "@/lib/navigation"

/**
 * The signed-in shell: the shared AppShell (flush rail, pin / peek, phone tab bar) with Boli's rail (MAIN_NAV), the
 * Boli mark at the top, and in the footer the account chip, the credits chip (-> Billing), Feedback and the
 * notifications bell (the latest 10 in a sheet, "See all" -> /notifications). Docs is in the rail, so the account
 * menu has no Help row. The active rail item is neutral (a subtle fill, full ink) - no crimson in the rail (owner,
 * 2026-11-24: crimson is for the logo).
 */
const BELL_LIMIT = 10

const KEYS = {
    unread: ["notifications", "unread"] as const,
    list: ["notifications", "list"] as const,
}

export function MainShell({ user, initialPinned, initialRailWidth, children }: {
    user: ShellUser
    initialPinned: boolean
    initialRailWidth?: number
    children: React.ReactNode
}) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [panelOpen, setPanelOpen] = React.useState(false)

    const unread = useQuery({
        queryKey: KEYS.unread,
        queryFn: async () => {
            const res = await getUnreadCount()
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        refetchInterval: 60_000,
    })

    // Same query as the chip (one fetch), for the account menu's credits box.
    const balance = useBalance()

    const list = useQuery({
        queryKey: KEYS.list,
        enabled: panelOpen,
        queryFn: async (): Promise<NotificationView[]> => {
            const res = await getNotifications(BELL_LIMIT)
            if (!res.success) throw new Error(res.error)
            return res.data.items.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.message,
                createdAt: n.createdAt,
                readAt: n.isRead ? (n.readAt ?? n.createdAt) : null,
                module: n.type.charAt(0).toUpperCase() + n.type.slice(1),
                href: n.actionUrl,
            }))
        },
    })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] })

    return (
        <>
            <AppShell
                brand={{ name: BRAND.name, href: ROUTES.home, lockup: <BoliLogo size={19} /> }}
                nav={MAIN_NAV}
                account={{
                    user, profileHref: ROUTES.profile, signInPath: ROUTES.signIn, queryClient,
                    settingsHref: ROUTES.settings,
                    credits: {
                        label: "Credits",
                        value: balance.data !== undefined ? `${formatCredits(balance.data)} credits` : undefined,
                        secondary: { label: "Usage", href: ROUTES.usage },
                        primary: { label: "Add credits", href: ROUTES.billing },
                    },
                }}
                railFooterTop={<CreditsRow />}
                railFooterExtra={<FeedbackButton align="start" />}
                notifications={{ unread: unread.data ?? 0, onOpen: () => setPanelOpen(true) }}
                initialPinned={initialPinned}
                initialRailWidth={initialRailWidth}
                cookieName={MAIN_RAIL_COOKIE}
            >
                {children}
            </AppShell>
            <NotificationsPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                notifications={list.data ?? []}
                loading={list.isPending && panelOpen}
                subtitle="Your latest ten."
                renderEmpty={(tab) => (
                    <BoliEmpty
                        kind="notifications"
                        title={tab === "unread" ? "You are all caught up" : "Nothing read yet"}
                        description={tab === "unread" ? "The ghanti rings when a payment lands or a key is first used." : "Notifications you have read show here."}
                    />
                )}
                onItemClick={async (n) => {
                    if (n.href) {
                        setPanelOpen(false)
                        if (/^https?:\/\//.test(n.href)) window.open(n.href, "_blank", "noopener,noreferrer")
                        else {
                            markNavPending(n.href)
                            router.push(n.href)
                        }
                    }
                    if (!n.readAt) {
                        await markAsRead(n.id)
                        await refresh()
                    }
                }}
                onMarkAllRead={async () => {
                    await markAllAsRead()
                    await refresh()
                }}
                footer={
                    <AppLink
                        href={ROUTES.notifications}
                        onClick={() => setPanelOpen(false)}
                        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    >
                        See all notifications <ArrowRight className="h-3.5 w-3.5" />
                    </AppLink>
                }
            />
        </>
    )
}
