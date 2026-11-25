import {
    Activity, BarChart3, Bot, CircleDollarSign, Coins, CreditCard, FileBarChart, HeartPulse, Inbox, KeyRound, Landmark, Lock, Megaphone,
    MessageSquare, Presentation, Radio, Settings, Shield, SlidersHorizontal, Users, UsersRound, Wallet,
} from "lucide-react"
import { JawafIcon } from "@repo/brand/product-icons"
import type { ShellNavItem, ShellNavSection, ShellProduct } from "@repo/ui/lib/shell"
import { activeProductId, isUnder } from "@repo/ui/lib/shell"
import { adminCan, type AdminPermission, type AdminPermissions } from "./permissions"

export * from "./permissions"

/**
 * Route constants (every link is built from these, never a guessed URL) and the admin MODULES - the console's product
 * rail (plan/admin/jawaf/admin-v1.md "Shell and look"): the icon rail is the modules, the sidebar beside it is the open
 * module's pages. App URLs carry no hyphens (`/reports/adminactivity`).
 */
export const ROUTES = {
    /** The overview, on the Boli mark. No module, so no sidebar. */
    home: "/home",

    // People
    users: "/users",
    analytics: "/analytics",
    admins: "/admins",
    access: "/admins/access",
    audit: "/admins/audit",
    /** The signed-in admin's own profile (the account menu). No sidebar. */
    profile: "/admins/profile",

    // Money
    billing: "/billing",
    payments: "/billing/payments",
    credits: "/billing/credits",
    reportsActivity: "/reports/adminactivity",
    reportsFinancial: "/reports/financial",

    // Jawaf (task 2 of the plan fills these pages)
    jawafDemos: "/jawaf/demos",
    jawafBots: "/jawaf/bots",
    jawafClaims: "/jawaf/claims",
    /** A demo bot's conversation as a page (task 2). */
    jawafConversation: (id: string) => `/jawaf/conversations/${encodeURIComponent(id)}`,

    // Communications
    communications: "/communications",
    /** Contact messages and app feedback (task 3 fills it). */
    inbox: "/communications/inbox",
    announcements: "/communications/announcements",
    broadcasts: "/communications/broadcasts",

    // System
    settings: "/system/settings",
    health: "/system/health",

    accessDenied: "/accessdenied",
    signIn: "/",
} as const

/**
 * The module SIDEBAR cookie: "1" = collapsed (the icon rail off screen, the sidebar a 64px icon rail), anything else =
 * expanded. Read by the (main) layout so the first frame is right. Admin's own name: localhost cookies ignore the port.
 */
export const ADMIN_RAIL_COOKIE = "boliadmin_rail_hidden"

export type AdminModuleId = "people" | "money" | "jawaf" | "communications" | "system"

/** One page in a module's sidebar, with the permission (read) it needs. */
type ModuleItem = ShellNavItem & { permission: AdminPermission }

interface ModuleDef {
    id: AdminModuleId
    label: string
    icon: ShellProduct["icon"]
    /** A path belongs to the module whose prefix matches it (longest wins). */
    prefixes: readonly string[]
    sections: { id: string; label?: string; items: ModuleItem[] }[]
}

/**
 * The modules, in rail order. To add a page: a folder under `app/(main)/`, a route above, an item here (its
 * `permission` decides who sees it; `tab: true` puts it in the phone bottom bar). A module with no item the admin can
 * read is left out of the rail.
 */
const MODULES: ModuleDef[] = [
    {
        id: "people",
        label: "People",
        icon: UsersRound,
        prefixes: [ROUTES.users, ROUTES.admins, ROUTES.analytics],
        sections: [
            {
                id: "people",
                items: [
                    { name: "Users", href: ROUTES.users, icon: Users, permission: "users", tab: true },
                    { name: "Sign-ups", href: ROUTES.analytics, icon: BarChart3, permission: "analytics" },
                ],
            },
            {
                id: "team",
                label: "Team",
                items: [
                    { name: "Admins", href: ROUTES.admins, icon: Shield, permission: "admin_management", tab: true },
                    { name: "Access", href: ROUTES.access, icon: Lock, permission: "admin_management", tab: true },
                    { name: "Audit log", href: ROUTES.audit, icon: Activity, permission: "admin_management", tab: true },
                ],
            },
        ],
    },
    {
        id: "money",
        label: "Money",
        icon: Wallet,
        prefixes: [ROUTES.billing, "/reports"],
        sections: [
            {
                id: "money",
                items: [
                    { name: "Billing", href: ROUTES.billing, icon: CircleDollarSign, permission: "analytics", tab: true },
                    { name: "Payments", href: ROUTES.payments, icon: CreditCard, permission: "analytics", tab: true },
                    { name: "Credits", href: ROUTES.credits, icon: Coins, permission: "analytics", tab: true },
                ],
            },
            {
                id: "reports",
                label: "Reports",
                items: [
                    { name: "Admin activity", href: ROUTES.reportsActivity, icon: FileBarChart, permission: "analytics" },
                    { name: "Financial", href: ROUTES.reportsFinancial, icon: Landmark, permission: "analytics", tab: true },
                ],
            },
        ],
    },
    {
        id: "jawaf",
        label: "Jawaf",
        icon: JawafIcon,
        prefixes: ["/jawaf"],
        sections: [
            {
                id: "jawaf",
                items: [
                    { name: "Demos", href: ROUTES.jawafDemos, icon: Presentation, permission: "jawaf", tab: true },
                    { name: "All bots", href: ROUTES.jawafBots, icon: Bot, permission: "jawaf", tab: true },
                    { name: "Claims", href: ROUTES.jawafClaims, icon: KeyRound, permission: "jawaf", tab: true },
                ],
            },
        ],
    },
    {
        id: "communications",
        label: "Communications",
        icon: MessageSquare,
        prefixes: [ROUTES.communications],
        sections: [
            {
                id: "communications",
                items: [
                    { name: "Overview", href: ROUTES.communications, icon: MessageSquare, permission: "communications" },
                    { name: "Inbox", href: ROUTES.inbox, icon: Inbox, permission: "communications", tab: true },
                    { name: "Announcements", href: ROUTES.announcements, icon: Megaphone, permission: "communications", tab: true },
                    { name: "Broadcasts", href: ROUTES.broadcasts, icon: Radio, permission: "communications", tab: true },
                ],
            },
        ],
    },
    {
        id: "system",
        label: "System",
        icon: SlidersHorizontal,
        prefixes: ["/system"],
        sections: [
            {
                id: "system",
                items: [
                    { name: "Settings", href: ROUTES.settings, icon: Settings, permission: "system", tab: true },
                    { name: "Health", href: ROUTES.health, icon: HeartPulse, permission: "system", tab: true },
                ],
            },
        ],
    },
]

/** One module as this admin sees it: only the pages they can read; `href` is the first of them. */
export interface AdminModule {
    id: AdminModuleId
    label: string
    icon: ShellProduct["icon"]
    href: string
    prefixes: readonly string[]
    sidebar: ShellNavSection[]
}

type AdminLike = { role: string; permissions: AdminPermissions }

/** The modules one admin can open, each with only the pages they can read. A module with none is left out. */
export function adminModulesFor(admin: AdminLike): AdminModule[] {
    const out: AdminModule[] = []
    for (const m of MODULES) {
        const sidebar: ShellNavSection[] = m.sections
            .map((s) => ({
                id: s.id,
                label: s.label,
                items: s.items
                    .filter((i) => adminCan(admin, i.permission, "read"))
                    .map((i): ShellNavItem => ({ name: i.name, href: i.href, icon: i.icon, tab: i.tab, match: i.match, badge: i.badge })),
            }))
            .filter((s) => s.items.length > 0)
        const first = sidebar[0]?.items[0]
        if (!first) continue
        out.push({ id: m.id, label: m.label, icon: m.icon, href: first.href, prefixes: m.prefixes, sidebar })
    }
    return out
}

/** The rail's entries (the shell's shape). */
export function railModules(modules: AdminModule[]): ShellProduct[] {
    return modules.map((m) => ({ id: m.id, label: m.label, icon: m.icon, href: m.href }))
}

/** The module a path belongs to, or null for Home, Profile and the 403 page (the rail alone, no sidebar). */
export function moduleForPath(pathname: string, modules: AdminModule[]): AdminModule | null {
    if (isUnder(pathname, ROUTES.profile)) return null
    const id = activeProductId(pathname, modules)
    return modules.find((m) => m.id === id) ?? null
}
