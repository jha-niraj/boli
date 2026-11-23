"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import { AppShell } from "@repo/ui/components/shell/app-shell"
import { AppLink, markNavPending } from "@repo/ui/components/app-link"
import { NotificationsPanel, type NotificationView } from "@repo/ui/components/ui/notifications-panel"
import type { ShellUser } from "@repo/ui/lib/shell"
import { cn } from "@repo/ui/lib/utils"
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from "@/actions/notification.action"
import { BoliLogo } from "@/components/brand/boli-logo"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { CreditsRow, useBalance } from "@/components/shell/credits-chip"
import { BRAND, formatCredits } from "@/lib/boli"
import { MAIN_NAV, MAIN_RAIL_COOKIE, ROUTES } from "@/lib/navigation"

/**
 * The signed-in shell: the shared AppShell (flush rail, pin / peek, phone tab bar) with Boli's rail (MAIN_NAV), the
 * Boli mark at the top, and in the footer the account chip, the credits chip (-> Billing), Feedback and the
 * notifications bell (the latest 10 in a sheet, "See all" -> /notifications). Docs is in the rail, so the account
 * menu has no Help row. The active rail item carries a thin crimson marker (RAIL_ACCENT).
 */
const BELL_LIMIT = 10

/** The active rail item: a 2px crimson bar on its left edge and a crimson icon (Boli rules - the accent, sparingly). */
const RAIL_ACCENT =
    "[&_nav[aria-label=Main]_a[aria-current=page]]:shadow-[inset_2px_0_0_var(--color-boli-crimson)] [&_nav[aria-label=Main]_a[aria-current=page]_svg]:text-boli-crimson"
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
            {/* `contents`: no box of its own, so the shell lays out exactly as before; it only scopes RAIL_ACCENT. */}
            <div className={cn("contents", RAIL_ACCENT)}>
                <AppShell
                    brand={{ name: BRAND.name, href: ROUTES.home, mark: <BoliLogo wordmark={false} className="text-base" /> }}
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
                    railFooterExtra={<FeedbackButton />}
                    notifications={{ unread: unread.data ?? 0, onOpen: () => setPanelOpen(true) }}
                    initialPinned={initialPinned}
                    initialRailWidth={initialRailWidth}
                    cookieName={MAIN_RAIL_COOKIE}
                >
                    {children}
                </AppShell>
            </div>
            <NotificationsPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                notifications={list.data ?? []}
                loading={list.isPending && panelOpen}
                subtitle="Your latest ten."
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
