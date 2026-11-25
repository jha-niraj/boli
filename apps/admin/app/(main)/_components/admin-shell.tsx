"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BRAND } from "@repo/boli"
import { BoliMark } from "@repo/brand/boli-mark"
import { markNavPending } from "@repo/ui/components/app-link"
import { AppShell } from "@repo/ui/components/shell/app-shell"
import type { ShellSidebar } from "@repo/ui/lib/shell"
import { NotificationsPanel, type NotificationView } from "@repo/ui/components/ui/notifications-panel"
import {
    getShellNotifications, getShellUnreadCount, markAllShellNotificationsRead, markShellNotificationRead, stampShellSignIn,
} from "@/actions/shell.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { AdminAccessProvider } from "@/context/admin-access-context"
import { ADMIN_RAIL_COOKIE, adminModulesFor, moduleForPath, railModules, ROUTES, type AdminPermissions } from "@/lib/navigation"

/**
 * The console shell: the shared AppShell in its PRODUCT RAIL mode, exactly as apps/main (plan/admin/jawaf/admin-v1.md
 * "Shell and look"): the 56px icon rail holds the admin MODULES (People, Money, Jawaf, Communications, System; the
 * Boli mark -> Home), it widens over the page on hover; beside it the open module's sidebar. Collapsing (the sidebar's
 * button or Cmd/Ctrl+\, cookie ADMIN_RAIL_COOKIE read by the server layout) turns the sidebar into the 64px icon rail.
 * No workspaces (no switcher) and no credits card - the foot is the bell and the account row (name + chevron, the menu
 * opening above it). Home, Profile and the 403 page have no sidebar.
 *
 * Modules and pages are filtered by this admin's permissions (lib/navigation.ts). Built HERE, not in the server
 * layout - the icons are components, which cannot cross the server/client boundary.
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
    const router = useRouter()
    const pathname = usePathname() ?? "/"
    const modules = React.useMemo(() => adminModulesFor(admin), [admin])
    const rail = React.useMemo(() => railModules(modules), [modules])
    const current = moduleForPath(pathname, modules)
    const currentId = current?.id ?? null
    // Rebuilt only when the module changes (`current` is the same object from the memoised list while the path stays
    // inside one module), so the sidebar keeps its state across pages.
    const sidebar = React.useMemo<ShellSidebar | null>(() => (current ? { title: current.label, href: current.href } : null), [current])
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
                brand={{ name: `${BRAND.name} Admin`, href: ROUTES.home, mark: <BoliMark px={24} /> }}
                nav={current?.sidebar ?? []}
                productRail={{
                    products: rail,
                    activeProductId: currentId,
                    sidebar,
                    productsLabel: "Modules",
                    phoneMenuLabel: "Modules",
                }}
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
                    if (n.href) {
                        setPanelOpen(false)
                        if (/^https?:\/\//.test(n.href)) window.open(n.href, "_blank", "noopener,noreferrer")
                        else {
                            markNavPending(n.href)
                            router.push(n.href)
                        }
                    }
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
