import {
    BookOpen, Boxes, ChartLine, ChartNoAxesColumn, Contact, FlaskConical, House, Inbox, KeyRound, Library, Settings, Share2,
} from "lucide-react"
import { ApiIcon, DocumentAiIcon, HomeIcon, JawafIcon, KuraIcon, SpeechIcon } from "@repo/brand/product-icons"
import type { ShellNavSection, ShellProduct } from "@repo/ui/lib/shell"
import { activeProductId } from "@repo/ui/lib/shell"
import { LANDING_HOMES, START_ROUTE } from "./landing"
import { WEB } from "./web-links"
import { WORKSPACE_ROUTES } from "./workspace-routes"

/**
 * Route constants (every link is built from these, never a guessed URL) and the PRODUCTS (the product rail + each
 * product's sidebar). Links to the public site (docs, legal, about, contact) live in ./web-links.ts - that site is
 * apps/web on its own origin. App URLs carry no hyphens. Plan: plan/main/jawaf/jawaf-v1.md "Names and structure".
 */
export const ROUTES = {
    /**
     * Where "home" goes: `/`, which middleware.ts sends to the LAST product used (cookie, lib/landing.ts) or to /start.
     * Sign-in's default returnTo is the same `/`.
     */
    home: "/",
    /** "Choose where to start" - a browser with no last product. */
    start: START_ROUTE,
    /** The Boli overview (account level: credits and spend across products). */
    dashboard: "/home",

    // Kura
    kura: LANDING_HOMES.kura,
    kuraConversation: (id: string) => `/kura/${id}`,

    // API
    api: LANDING_HOMES.api,
    keys: "/keys",
    usage: "/usage",
    models: "/models",

    // Jawaf (Wave 2 fills these pages)
    jawaf: LANDING_HOMES.jawaf,
    jawafPlayground: "/jawaf/playground",
    jawafKnowledge: "/jawaf/knowledge",
    jawafConversations: "/jawaf/conversations",
    jawafContacts: "/jawaf/contacts",
    jawafShare: "/jawaf/share",
    jawafInsights: "/jawaf/insights",
    jawafSettings: "/jawaf/settings",
    /** Onboarding (full page, skippable); `?new=1` starts a new bot. */
    jawafSetup: "/jawaf/setup",
    /** Where a bot's data lives and who reads it (placeholder until the Data page is written). */
    jawafData: "/jawaf/data",

    // Soon
    documentAi: "/kagaj",
    speech: "/swar",

    // Account
    billing: "/billing",
    profile: "/profile",
    /** Workspace members (owned by lib/workspace-routes.ts). */
    members: WORKSPACE_ROUTES.members,
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

/**
 * The product SIDEBAR state cookie: "1" = COLLAPSED (the icon rail off screen, the sidebar a 64px icon rail), anything
 * else = expanded. Read by the (main) layout so the first frame is right. Each app has its own name: localhost cookies
 * ignore the port.
 */
export const MAIN_RAIL_COOKIE = "boli_rail_hidden"

export type ProductId = "kura" | "api" | "jawaf" | "documentai" | "speech"

/**
 * One product: its rail entry, the paths that belong to it, and its sidebar.
 *
 * - `prefixes`: a path belongs to the product whose prefix matches it (longest wins). A path no product claims is an
 *   ACCOUNT page (/home, /billing, /profile, /members, /settings, /notifications, /start): the rail alone, no sidebar.
 * - `sidebar`: the product's pages in labelled groups (ShellNavSection, as before). `tab: true` puts an item in the
 *   phone bottom bar (four at most); with none marked, the first four go there.
 * - `line`: one short line (the /start card, the Soon page).
 * - `icon`: from @repo/brand/product-icons (one drawn family; lucide stays for the pages inside a product).
 * - `soon`: greyed in the rail with a "Soon" tag; its page says what it will do.
 *
 * To add a page to a product: `app/(main)/<path>/page.tsx` + loading.tsx, a route above, an item in its sidebar.
 * To add a product: an entry here (and in LANDING_HOMES when it is live), plus its prefix pages.
 */
export interface Product {
    id: ProductId
    label: string
    icon: ShellProduct["icon"]
    href: string
    prefixes: readonly string[]
    line: string
    soon?: boolean
    sidebar: ShellNavSection[]
}

export const PRODUCTS: Product[] = [
    {
        id: "kura",
        label: "Kura",
        icon: KuraIcon,
        href: ROUTES.kura,
        prefixes: [ROUTES.kura],
        line: "Chat with Boli's model in Nepali, English or both",
        // Kura's sidebar is New chat + search + the chat history (main-shell.tsx), not page links.
        sidebar: [],
    },
    {
        id: "api",
        label: "API",
        icon: ApiIcon,
        href: ROUTES.api,
        prefixes: [ROUTES.api, ROUTES.keys, ROUTES.models, ROUTES.usage],
        line: "Call Boli's open model from your own code",
        sidebar: [
            {
                id: "api",
                items: [
                    { name: "Home", href: ROUTES.api, icon: House, tab: true },
                    { name: "API keys", href: ROUTES.keys, icon: KeyRound, tab: true },
                    { name: "Models", href: ROUTES.models, icon: Boxes },
                    { name: "Usage", href: ROUTES.usage, icon: ChartNoAxesColumn, tab: true },
                ],
            },
            {
                id: "learn",
                label: "Learn",
                items: [{ name: "Docs", href: WEB.docs, icon: BookOpen }],
            },
        ],
    },
    {
        id: "jawaf",
        label: "Jawaf",
        icon: JawafIcon,
        href: ROUTES.jawaf,
        prefixes: [ROUTES.jawaf],
        line: "Your business answers customers in Nepali and English",
        sidebar: [
            {
                id: "jawaf",
                items: [
                    { name: "Home", href: ROUTES.jawaf, icon: House, tab: true },
                    { name: "Playground", href: ROUTES.jawafPlayground, icon: FlaskConical, tab: true },
                    { name: "Knowledge", href: ROUTES.jawafKnowledge, icon: Library },
                    { name: "Conversations", href: ROUTES.jawafConversations, icon: Inbox, tab: true },
                    { name: "Contacts", href: ROUTES.jawafContacts, icon: Contact, tab: true },
                ],
            },
            {
                id: "jawaf-grow",
                label: "Grow",
                items: [
                    { name: "Share", href: ROUTES.jawafShare, icon: Share2 },
                    { name: "Insights", href: ROUTES.jawafInsights, icon: ChartLine },
                    { name: "Settings", href: ROUTES.jawafSettings, icon: Settings },
                ],
            },
        ],
    },
    {
        id: "documentai",
        label: "Kagaj",
        icon: DocumentAiIcon,
        href: ROUTES.documentAi,
        prefixes: [ROUTES.documentAi],
        line: "Read scanned Nepali documents into text and tables",
        soon: true,
        sidebar: [],
    },
    {
        id: "speech",
        label: "Swar",
        icon: SpeechIcon,
        href: ROUTES.speech,
        prefixes: [ROUTES.speech],
        line: "Speech to text and text to speech in Nepali",
        soon: true,
        sidebar: [],
    },
]

/** The rail's entries (the shell's shape): Home (the account overview, /home) on top, then every product (owner, 2026-11-25). */
export const RAIL_HOME_ID = "home"
export const RAIL_PRODUCTS: ShellProduct[] = [
    { id: RAIL_HOME_ID, label: "Home", icon: HomeIcon, href: ROUTES.dashboard },
    ...PRODUCTS.map((p) => ({ id: p.id, label: p.label, icon: p.icon, href: p.href, soon: p.soon })),
]

/** The product a path belongs to, or null for an account page. */
export function productForPath(pathname: string): Product | null {
    const id = activeProductId(pathname, PRODUCTS)
    return PRODUCTS.find((p) => p.id === id) ?? null
}
