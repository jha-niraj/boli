import {
    Activity, BarChart3, CreditCard, FileBarChart, Home, Lock, Megaphone, MessageSquare, Radio, Settings, Shield, Users, Wallet,
} from "lucide-react"
import type { ShellNavItem, ShellNavSection } from "@repo/ui/lib/shell"
import { adminCan, type AdminPermission, type AdminPermissions } from "./permissions"

export * from "./permissions"

/**
 * The admin rail. Route constants live here so every link is built from one place (never a guessed URL). App URLs
 * carry no hyphens (`/reports/adminactivity`).
 */
export const ROUTES = {
    home: "/home",
    analytics: "/analytics",
    users: "/users",
    reportsActivity: "/reports/adminactivity",
    reportsFinancial: "/reports/financial",
    billing: "/billing",
    communications: "/communications",
    announcements: "/communications/announcements",
    broadcasts: "/communications/broadcasts",
    admins: "/admins",
    audit: "/admins/audit",
    access: "/admins/access",
    profile: "/admins/profile",
    settings: "/system/settings",
    accessDenied: "/accessdenied",
    signIn: "/",
} as const

/** The rail pin cookie ("1" = unpinned). Admin's own name: localhost cookies ignore the port. */
export const ADMIN_RAIL_COOKIE = "boliadmin_rail_hidden"

type NavDef = ShellNavItem & { permission?: AdminPermission }

const NAV: { id: string; label?: string; items: NavDef[] }[] = [
    {
        id: "main",
        items: [
            { name: "Home", href: ROUTES.home, icon: Home, tab: true },
            { name: "Analytics", href: ROUTES.analytics, icon: BarChart3, permission: "analytics", tab: true },
            { name: "Users", href: ROUTES.users, icon: Users, permission: "users", tab: true },
            { name: "Billing", href: ROUTES.billing, icon: CreditCard, permission: "analytics" },
        ],
    },
    {
        id: "reports",
        label: "Reports",
        items: [
            { name: "Admin activity", href: ROUTES.reportsActivity, icon: FileBarChart, permission: "analytics" },
            { name: "Financial", href: ROUTES.reportsFinancial, icon: Wallet, permission: "analytics" },
        ],
    },
    {
        id: "communications",
        label: "Communications",
        items: [
            { name: "Overview", href: ROUTES.communications, icon: MessageSquare, permission: "communications" },
            { name: "Announcements", href: ROUTES.announcements, icon: Megaphone, permission: "communications", tab: true },
            { name: "Broadcasts", href: ROUTES.broadcasts, icon: Radio, permission: "communications" },
        ],
    },
    {
        id: "team",
        label: "Team",
        items: [
            { name: "Admins", href: ROUTES.admins, icon: Shield, permission: "admin_management" },
            { name: "Audit log", href: ROUTES.audit, icon: Activity, permission: "admin_management" },
            { name: "Access", href: ROUTES.access, icon: Lock, permission: "admin_management" },
        ],
    },
    {
        id: "system",
        label: "System",
        items: [
            { name: "Settings", href: ROUTES.settings, icon: Settings, permission: "system" },
        ],
    },
]

/** The rail for one admin: items they cannot read are left out; an empty section disappears. */
export function adminNavFor(admin: { role: string; permissions: AdminPermissions }): ShellNavSection[] {
    return NAV
        .map((s) => ({
            id: s.id,
            label: s.label,
            items: s.items
                .filter((i) => !i.permission || adminCan(admin, i.permission, "read"))
                .map((i): ShellNavItem => ({ name: i.name, href: i.href, icon: i.icon, tab: i.tab, match: i.match, badge: i.badge })),
        }))
        .filter((s) => s.items.length > 0)
}
