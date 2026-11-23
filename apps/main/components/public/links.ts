import { ROUTES } from "@/lib/navigation"

/** The public nav and footer links - one list, so the header, the phone menu and the footer never disagree. */
export const PUBLIC_NAV = [
    { label: "Kura", href: ROUTES.kura },
    { label: "API", href: ROUTES.doc("quickstart") },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: ROUTES.docs },
] as const

export const FOOTER_COLUMNS = [
    {
        title: "Product",
        links: [
            { label: "Kura", href: ROUTES.kura },
            { label: "Pricing", href: "/#pricing" },
            { label: "Models", href: ROUTES.doc("models") },
        ],
    },
    {
        title: "Developers",
        links: [
            { label: "Docs", href: ROUTES.docs },
            { label: "Quickstart", href: ROUTES.doc("quickstart") },
            { label: "API reference", href: ROUTES.doc("chatcompletions") },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", href: ROUTES.about },
            { label: "Contact", href: `${ROUTES.about}#contact` },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Terms", href: ROUTES.terms },
            { label: "Privacy", href: ROUTES.privacy },
        ],
    },
] as const
