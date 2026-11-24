import { AudioLines, BookOpen, Boxes, Braces, Briefcase, Coins, Compass, FileText, History, Mail, MessagesSquare, Mountain, Newspaper, Rocket, SquareTerminal, type LucideIcon } from "lucide-react"
import { KURA } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { KURA_URL } from "@/lib/app-links"

/**
 * The public nav and footer links - one list, so the mega menu, the phone menu and the footer never disagree. Kura is in
 * the app (an absolute URL); render these with SiteLink. An item without `href` is shown but not linked ("Later").
 */
export type NavItem = {
    label: string
    subtitle: string
    icon: LucideIcon
    href?: string
    badge?: "Next" | "Later"
}

export type NavGroupId = "products" | "developers" | "resources" | "company"
export type NavGroup = { id: NavGroupId; label: string; items: readonly NavItem[] }

export const NAV_GROUPS: readonly NavGroup[] = [
    {
        id: "products",
        label: "Products",
        items: [
            { label: KURA.name, subtitle: "Chat in Nepali, English or both", icon: MessagesSquare, href: KURA_URL },
            { label: "Chat API", subtitle: "OpenAI-compatible, priced in rupees", icon: SquareTerminal, href: ROUTES.doc("quickstart") },
            { label: "Document intelligence", subtitle: "Read bills, forms and notices", icon: FileText, href: ROUTES.modelsRoadmap, badge: "Next" },
            { label: "Speech", subtitle: "Talk and listen in Nepali", icon: AudioLines, href: ROUTES.modelsRoadmap, badge: "Later" },
        ],
    },
    {
        id: "developers",
        label: "Developers",
        items: [
            { label: "Docs", subtitle: "Everything about the API", icon: BookOpen, href: ROUTES.docs },
            { label: "Quickstart", subtitle: "Your first call in five minutes", icon: Rocket, href: ROUTES.doc("quickstart") },
            { label: "API reference", subtitle: "Chat completions, every field", icon: Braces, href: ROUTES.doc("chatcompletions") },
            { label: "Models", subtitle: "What runs today and what is next", icon: Boxes, href: ROUTES.models },
            { label: "Pricing", subtitle: "Per token, in NPR", icon: Coins, href: ROUTES.pricing },
        ],
    },
    {
        id: "resources",
        label: "Resources",
        items: [
            { label: "Blog", subtitle: "Launches, product notes and research", icon: Newspaper, href: ROUTES.blog },
            { label: "Guides", subtitle: "Step-by-step builds with code", icon: Compass, href: ROUTES.guides },
            { label: "Changelog", subtitle: "Every change as it ships", icon: History, href: ROUTES.changelog },
        ],
    },
    {
        id: "company",
        label: "Company",
        items: [
            { label: "About", subtitle: "Why Boli exists and what is next", icon: Mountain, href: ROUTES.about },
            { label: "Contact", subtitle: "API, billing, partnerships, press", icon: Mail, href: ROUTES.contact },
            { label: "Careers", subtitle: "Not hiring yet", icon: Briefcase, badge: "Later" },
        ],
    },
]

export const FOOTER_COLUMNS = [
    {
        title: "Product",
        links: [
            { label: KURA.name, href: KURA_URL },
            { label: "API", href: ROUTES.doc("quickstart") },
            { label: "Models", href: ROUTES.models },
            { label: "Pricing", href: ROUTES.pricing },
        ],
    },
    {
        title: "Developers",
        links: [
            { label: "Docs", href: ROUTES.docs },
            { label: "Quickstart", href: ROUTES.doc("quickstart") },
            { label: "Chat completions", href: ROUTES.doc("chatcompletions") },
            { label: "Guides", href: ROUTES.guides },
            { label: "Changelog", href: ROUTES.changelog },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", href: ROUTES.about },
            { label: "Blog", href: ROUTES.blog },
            { label: "Contact", href: ROUTES.contact },
            { label: "Terms", href: ROUTES.terms },
            { label: "Privacy", href: ROUTES.privacy },
        ],
    },
] as const
