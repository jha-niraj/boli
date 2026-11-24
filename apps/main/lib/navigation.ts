import { BookOpen, ChartNoAxesColumn, KeyRound, LayoutDashboard, MessagesSquare, Boxes, Wallet } from "lucide-react"
import type { ShellNavSection } from "@repo/ui/lib/shell"
import { WEB } from "./web-links"

/**
 * Route constants (every link is built from these, never a guessed URL) and the rail. Links to the public site (docs,
 * legal, about, contact) live in ./web-links.ts - that site is apps/web on its own origin. App URLs carry no hyphens.
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

/** The rail pin cookie ("1" = unpinned). Each app has its own name: localhost cookies ignore the port. */
export const MAIN_RAIL_COOKIE = "boli_rail_hidden"

/**
 * The rail, in labelled groups (owner, 2026-11-24, after Sarvam's console): Home on its own, then one group per kind of
 * work. Live items only - speech to text and text to speech join "Playground" (and their APIs "Build") when they ship,
 * never as placeholders.
 *
 * To add a module: create `app/(main)/<module>/page.tsx` (+ loading.tsx), add its route above, then an item in the group
 * it belongs to:
 *
 *   import { FolderKanban } from "lucide-react"
 *   { name: "Projects", href: "/projects", icon: FolderKanban, tab: true },
 *
 * A group's `label` is shown small and muted over its items (sentence case); the first group has none. `tab: true` puts
 * an item in the phone bottom bar (four at most, in rail order; with none marked, the first four items go there).
 */
export const MAIN_NAV: ShellNavSection[] = [
    {
        id: "overview",
        items: [
            { name: "Home", href: ROUTES.dashboard, icon: LayoutDashboard, tab: true },
        ],
    },
    {
        id: "playground",
        label: "Playground",
        items: [
            { name: "Kura", href: ROUTES.kura, icon: MessagesSquare, tab: true },
        ],
    },
    {
        id: "build",
        label: "Build",
        items: [
            { name: "API keys", href: ROUTES.keys, icon: KeyRound, tab: true },
            { name: "Models", href: ROUTES.models, icon: Boxes },
            { name: "Usage", href: ROUTES.usage, icon: ChartNoAxesColumn },
            { name: "Billing", href: ROUTES.billing, icon: Wallet, tab: true },
        ],
    },
    {
        id: "learn",
        label: "Learn",
        items: [
            { name: "Docs", href: WEB.docs, icon: BookOpen },
        ],
    },
    // Settings live in the account menu at the bottom of the rail; Help is replaced by Docs (owner, 2026-11-24).
]
