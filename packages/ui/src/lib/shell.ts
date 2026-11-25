import type { ComponentType, ReactNode } from "react"

/**
 * The app shell's data model and pure helpers, shared by every app (apps/main, apps/admin).
 *
 * Plain module - no "use client" / "server-only" - so a server layout can import the cookie helpers and read the rail
 * state before the first paint, and the client shell can import the nav helpers.
 */

export interface ShellNavItem {
    name: string
    /** Absolute, with a leading slash: "/users". */
    href: string
    /** The path the link counts as active under, when it differs from `href`. Defaults to `href`. */
    match?: string
    icon: ComponentType<{ className?: string }>
    /** A small count after the label (unread, pending). 0 or undefined draws nothing. */
    badge?: number
    /** Show this item in the phone bottom bar (the first four that set it; with none set, the first four items). */
    tab?: boolean
}

export interface ShellNavSection {
    id: string
    /** A small heading over the group. Omit for the first, unlabeled group. */
    label?: string
    items: ShellNavItem[]
}

export interface ShellUser {
    name: string
    email: string
    image?: string | null
}

/** One extra row in the account menu (Profile and Sign out are always there). */
export interface ShellMenuLink {
    label: string
    href: string
    icon?: ComponentType<{ className?: string }>
}

export const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** The nav item the current path belongs to: the longest match wins (a detail page lights its list). */
export function activeHref(pathname: string, sections: ShellNavSection[]): string | null {
    let best: string | null = null
    let bestLen = -1
    for (const s of sections) for (const it of s.items) {
        const m = it.match ?? it.href
        if (isUnder(pathname, m) && m.length > bestLen) { best = it.href; bestLen = m.length }
    }
    return best
}

/** The phone bottom bar: items marked `tab`, else the first four. */
export function tabItems(sections: ShellNavSection[], max = 4): ShellNavItem[] {
    const all = sections.flatMap((s) => s.items)
    const marked = all.filter((i) => i.tab)
    return (marked.length ? marked : all).slice(0, max)
}

/**
 * The rail cookie: "1" = the person UNPINNED the rail (hidden, peeks on a left-edge hover); anything else = pinned.
 * With the product rail (apps/main) the same cookie means "1" = the product sidebar is COLLAPSED to its 64px icon rail.
 * Each app passes its own name - cookies on localhost ignore the port, so two apps would share one otherwise.
 */
export function railPinnedFromCookie(value: string | undefined | null): boolean {
    return value !== "1"
}

/** The rail's width when pinned: 240px by default, the person can drag it between these. */
export const RAIL_WIDTH = { min: 200, default: 240, max: 360 } as const

/** The width cookie sits beside the pin cookie: `<cookieName>_w`. */
export const railWidthCookie = (cookieName: string) => `${cookieName}_w`

/** Read on the server (no first-frame jump): `railWidthFromCookie(cookies().get(railWidthCookie(name))?.value)`. */
export function railWidthFromCookie(value: string | undefined | null): number {
    const n = Number(value)
    return Number.isFinite(n) && n >= RAIL_WIDTH.min && n <= RAIL_WIDTH.max ? Math.round(n) : RAIL_WIDTH.default
}

/* ── Product rail (opt-in; apps/main's products, apps/admin's modules; plan/main/jawaf/jawaf-v1.md) ──────────────────
 * A thin icon rail at the far left (products, workspace switcher, credits + account at the foot) that slides out OVER
 * the page on hover, and next to it a sidebar with ONLY the open product's pages. An app that passes no `productRail`
 * to AppShell keeps the classic single rail. */

/** One product in the icon rail. */
export interface ShellProduct {
    id: string
    label: string
    icon: ComponentType<{ className?: string }>
    /** The product's home: the rail links here. */
    href: string
    /** Not live yet: drawn greyed with a "Soon" tag (it still links to its "what it will do" page). */
    soon?: boolean
}

/** One workspace in the switcher at the top of the rail. */
export interface ShellWorkspace {
    id: string
    name: string
    current: boolean
    /** A small muted word beside the name in the switcher list (Boli: the person's role there, "Owner" / "Member"). */
    detail?: string
}

/** The open product's sidebar. `null` = an account page (Home, Billing, Profile...): the rail alone, no sidebar. */
export interface ShellSidebar {
    /** The product's name at the top of the sidebar. */
    title: string
    /** Where the title links (the product's home). */
    href?: string
    /** Under the title: a bot switcher, a New chat button and a search. */
    top?: ReactNode
    /** Fills the space under the nav items and scrolls itself (Kura's chat history). */
    body?: ReactNode
    /**
     * The product's own controls in the COLLAPSED sidebar (the 64px icon rail), drawn as 40px icon buttons under the
     * expand button (Kura: New chat + search; Jawaf: the bot switcher as an avatar). `top` and `body` are not shown there.
     */
    compact?: ReactNode
}

/**
 * The icon rail's two widths: always collapsed in the layout, wider only while it floats over the page. `compact` is
 * the product sidebar's width when the person COLLAPSES it (Sarvam-style): the icon rail goes off screen and the
 * sidebar becomes one 64px icon rail at the far left.
 */
export const PRODUCT_RAIL = { collapsed: 56, open: 272, compact: 64 } as const

/** The product a path belongs to: the longest matching prefix wins. */
export function activeProductId(pathname: string, products: { id: string; prefixes: readonly string[] }[]): string | null {
    let best: string | null = null
    let bestLen = -1
    for (const p of products) for (const prefix of p.prefixes) {
        if (isUnder(pathname, prefix) && prefix.length > bestLen) { best = p.id; bestLen = prefix.length }
    }
    return best
}
