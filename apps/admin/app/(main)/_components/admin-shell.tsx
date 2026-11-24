"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BRAND } from "@repo/boli"
import { AppShell } from "@repo/ui/components/shell/app-shell"
import { NotificationsPanel, type NotificationView } from "@repo/ui/components/ui/notifications-panel"
import {
    getShellNotifications, getShellUnreadCount, markAllShellNotificationsRead, markShellNotificationRead, stampShellSignIn,
} from "@/actions/shell.action"
import { AdminLockup } from "@/components/brand/admin-lockup"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { AdminAccessProvider } from "@/context/admin-access-context"
import { ADMIN_RAIL_COOKIE, adminNavFor, ROUTES, type AdminPermissions } from "@/lib/navigation"

/**
 * The console shell: the shared AppShell (flush rail, pin / peek, phone tab bar) fed with this admin's rail, the
 * account menu and the notifications bell. The nav is built HERE, not in the server layout - its icons are
 * components, which cannot cross the server/client boundary.
 */
export interface AdminShellProps {
    admin: { role: string; permissions: AdminPermissions; name: string; email: string; image: string | null }
    initialPinned: boolean
    initialRailWidth?: number
    children: React.ReactNode
}

const KEYS = {
    unread: ["notifications", "unread"] as const,
    list: ["notifications", "list"] as const,
}

export function AdminShell({ admin, initialPinned, initialRailWidth, children }: AdminShellProps) {
    const queryClient = useQueryClient()
    const nav = React.useMemo(() => adminNavFor(admin), [admin])
    const [panelOpen, setPanelOpen] = React.useState(false)

    // Last sign-in time: once per browser session, not on every navigation. A write, so it is never part of a render.
    React.useEffect(() => {
        try {
            if (sessionStorage.getItem("admin_login_tracked")) return
            sessionStorage.setItem("admin_login_tracked", "1")
        } catch { /* storage blocked - track anyway */ }
        void stampShellSignIn().catch(() => undefined)
    }, [])

    const unread = useQuery({
        queryKey: KEYS.unread,
        queryFn: async () => {
            const res = await getShellUnreadCount()
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        refetchInterval: 60_000,
    })

    const list = useQuery({
        queryKey: KEYS.list,
        enabled: panelOpen,
        queryFn: async (): Promise<NotificationView[]> => {
            const res = await getShellNotifications(30)
            if (!res.success) throw new Error(res.error)
            return res.data.map((n) => ({
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
        <AdminAccessProvider role={admin.role} permissions={admin.permissions}>
            <AppShell
                brand={{ name: `${BRAND.name} Admin`, href: ROUTES.home, lockup: <AdminLockup size={19} /> }}
                nav={nav}
                account={{
                    user: { name: admin.name || admin.email, email: admin.email, image: admin.image },
                    profileHref: ROUTES.profile,
                    signInPath: ROUTES.signIn,
                    queryClient,
                }}
                notifications={{ unread: unread.data ?? 0, onOpen: () => setPanelOpen(true) }}
                initialPinned={initialPinned}
                initialRailWidth={initialRailWidth}
                cookieName={ADMIN_RAIL_COOKIE}
            >
                {children}
            </AppShell>
            <NotificationsPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                notifications={list.data ?? []}
                loading={list.isPending && panelOpen}
                onItemClick={async (n) => {
                    if (!n.readAt) {
                        await markShellNotificationRead(n.id)
                        await refresh()
                    }
                }}
                onMarkAllRead={async () => {
                    await markAllShellNotificationsRead()
                    await refresh()
                }}
                subtitle="Alerts about the platform and your team."
                renderEmpty={(tab) => (
                    <BoliEmpty
                        kind="notifications"
                        title={tab === "unread" ? "You are all caught up" : "Nothing read yet"}
                        description={tab === "unread" ? "Alerts about the platform and your team show here." : "Notifications you have read show here."}
                    />
                )}
            />
        </AdminAccessProvider>
    )
}
