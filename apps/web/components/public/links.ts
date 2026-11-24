import { AudioLines, BookOpen, Boxes, Braces, Briefcase, Coins, Compass, FileText, History, Mail, MessageCircleQuestionMark, MessagesSquare, Mountain, Newspaper, Rocket, SquareTerminal, type LucideIcon } from "lucide-react"
import { KURA } from "@repo/boli"
import { ROUTES } from "@/lib/routes"

/**
 * The public nav and footer links - one list, so the mega menu, the phone menu and the footer never disagree. Kura and
 * Jawaf link to their own pages (/kura, /jawaf); any app link is absolute (lib/app-links.ts), so render these with SiteLink. An item without `href` is shown but not linked ("Later").
 * Badges: "Pilot" = being tried with a few businesses (Jawaf), "Soon" = a product on the roadmap, "Later" = not yet.
 */
export type NavItem = {
    label: string
    subtitle: string
    icon: LucideIcon
    href?: string
    badge?: NavBadge
}

export type NavBadge = "Pilot" | "Soon" | "Later"

/** Pilot reads as an outlined pill (something you can join); Soon and Later are quiet sand. */
export function navBadgeTone(badge: NavBadge): "outline" | "neutral" {
    return badge === "Pilot" ? "outline" : "neutral"
}

export type NavGroupId = "products" | "developers" | "resources" | "company"
/** `more` is one quiet link under a group's items ("All products"). */
export type NavGroup = { id: NavGroupId; label: string; items: readonly NavItem[]; more?: { label: string; href: string } }

export const NAV_GROUPS: readonly NavGroup[] = [
    {
        id: "products",
        label: "Products",
        items: [
            { label: KURA.name, subtitle: "Chat in Nepali, English or both", icon: MessagesSquare, href: ROUTES.kura },
            { label: "API", subtitle: "OpenAI-compatible, priced in rupees", icon: SquareTerminal, href: ROUTES.doc("quickstart") },
            { label: "Jawaf", subtitle: "Answers your customers, day and night", icon: MessageCircleQuestionMark, href: ROUTES.jawaf, badge: "Pilot" },
            { label: "Kagaj", subtitle: "Reads bills, forms and notices", icon: FileText, href: ROUTES.modelsRoadmap, badge: "Later" },
            { label: "Swar", subtitle: "Talk and listen in Nepali", icon: AudioLines, href: ROUTES.modelsRoadmap, badge: "Later" },
        ],
        more: { label: "All products", href: ROUTES.products },
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
            { label: "All products", href: ROUTES.products },
            { label: KURA.name, href: ROUTES.kura },
            { label: "Jawaf", href: ROUTES.jawaf },
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
