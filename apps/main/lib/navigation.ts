import { BookOpen, ChartNoAxesColumn, KeyRound, LayoutDashboard, MessagesSquare, Boxes, Wallet } from "lucide-react"
import type { ShellNavSection } from "@repo/ui/lib/shell"

/**
 * Route constants (every link is built from these, never a guessed URL) and the rail. App URLs carry no hyphens.
 * Profile and Notifications are reached from the account row and the bell at the foot of the rail, so they are not
 * rail items. Boli (plan/main/platform/platform-v0.md): signed-in people land on Kura.
 */
export const ROUTES = {
    /** Where a signed-in person lands (and the brand links): Kura, the chat. */
    home: "/kura",
    kura: "/kura",
    kuraConversation: (id: string) => `/kura/${id}`,
    dashboard: "/home",
    keys: "/keys",
    usage: "/usage",
    billing: "/billing",
    models: "/models",
    docs: "/docs",
    doc: (slug: string) => `/docs/${slug}`,
    about: "/about",
    terms: "/terms",
    privacy: "/privacy",
    landing: "/",
    profile: "/profile",
    notifications: "/notifications",
    settings: "/settings",
    settingsNotifications: "/settings/notifications",
    settingsAppearance: "/settings/appearance",
    settingsAccounts: "/settings/accounts",
    onboarding: "/welcome",
    signIn: "/signin",
    signUp: "/signup",
    accessDenied: "/accessdenied",
} as const

/** Docs pages (public, own module now, own domain later). Slugs carry no hyphens. */
export const DOCS_PAGES = [
    { slug: "quickstart", title: "Quickstart" },
    { slug: "authentication", title: "Authentication and errors" },
    { slug: "chatcompletions", title: "Chat completions" },
    { slug: "models", title: "Models, pricing and limits" },
] as const

/** The rail pin cookie ("1" = unpinned). Each app has its own name: localhost cookies ignore the port. */
export const MAIN_RAIL_COOKIE = "boli_rail_hidden"

/**
 * The rail.
 *
 * To add a module: create `app/(main)/<module>/page.tsx` (+ loading.tsx), add its route above, then an item here:
 *
 *   import { FolderKanban } from "lucide-react"
 *   { name: "Projects", href: "/projects", icon: FolderKanban, tab: true },
 *
 * `tab: true` puts it in the phone bottom bar (four at most; with none marked, the first four items go there).
 */
export const MAIN_NAV: ShellNavSection[] = [
    {
        id: "main",
        items: [
            { name: "Kura", href: ROUTES.kura, icon: MessagesSquare, tab: true },
            { name: "Home", href: ROUTES.dashboard, icon: LayoutDashboard, tab: true },
            { name: "API keys", href: ROUTES.keys, icon: KeyRound, tab: true },
            { name: "Usage", href: ROUTES.usage, icon: ChartNoAxesColumn },
            { name: "Billing", href: ROUTES.billing, icon: Wallet, tab: true },
            { name: "Models", href: ROUTES.models, icon: Boxes },
            { name: "Docs", href: ROUTES.docs, icon: BookOpen },
        ],
    },
    // Settings live in the account menu at the bottom of the rail; Help is replaced by Docs (owner, 2026-11-24).
]
