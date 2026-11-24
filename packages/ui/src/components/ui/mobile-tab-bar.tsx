"use client"

import * as React from "react"
import { Menu } from "lucide-react"
import { cn } from "../../lib/utils"

/**
 * The mobile bottom tab bar - the primary navigation surface below `lg`.
 *
 * It replaced a single floating hamburger pinned to the top-right corner, which put
 * EVERY destination one sheet away: reaching Home on a phone meant open sheet ->
 * scroll -> tap -> sheet closes, for the four pages people actually live in. The bar
 * puts those four one tap away and keeps the sheet, unchanged, behind "More".
 *
 * Presentational only - it owns no routing state. Which items appear, which one is
 * active and what "More" opens are all decided by the app that renders it, because
 * the three apps resolve their navigation completely differently (pins, a static
 * client list, permission-filtered admin modules).
 *
 * NOTE ON `linkAs`: this package deliberately does not depend on `next`, so the bar
 * cannot import `next/link` itself. Apps pass Link in and keep prefetching and
 * client-side transitions; the default `"a"` keeps the component usable on its own.
 */

export interface MobileTabItem {
    /** Stable key - the destination path is the natural choice. */
    key: string
    label: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    /** Navigation target. Omit for an item that only runs `onSelect`. */
    href?: string
    active?: boolean
    /** Unread-style count rendered on the icon. Values above 9 render as "9+". */
    badge?: number
    onSelect?: () => void
}

/** The element used for items that carry an `href` - apps pass `next/link`. */
type LinkComponent = React.ElementType<{
    href: string
    className?: string
    onClick?: () => void
    "aria-current"?: "page"
    children?: React.ReactNode
}>

export interface MobileTabBarProps {
    /** Four items reads best at phone widths; five is the practical ceiling with More. */
    items: MobileTabItem[]
    /** Opens the app's existing navigation sheet. */
    onMore: () => void
    /** True while that sheet is open, so More reads as the current surface. */
    moreActive?: boolean
    moreLabel?: string
    /** The last button's icon (default: a menu). */
    moreIcon?: MobileTabItem["icon"]
    linkAs?: LinkComponent
    className?: string
}

/** One cell: the active indicator, the icon (with optional badge) and the label. */
function TabContent({ item }: { item: MobileTabItem }) {
    const Icon = item.icon
    return (
        <>
            {/* The active marker sits ON the top border of the bar, like the reference. */}
            <span
                aria-hidden="true"
                className={cn(
                    "absolute -top-px left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full transition-opacity",
                    item.active ? "bg-foreground opacity-100" : "opacity-0",
                )}
            />
            <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={item.active ? 2.2 : 1.8} />
                {!!item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-xs font-semibold tabular-nums text-background">
                        {item.badge > 9 ? "9+" : item.badge}
                    </span>
                )}
            </span>
            <span className="max-w-full truncate text-xs font-medium leading-none">{item.label}</span>
        </>
    )
}

export function MobileTabBar({
    items,
    onMore,
    moreActive = false,
    moreLabel = "More",
    moreIcon,
    linkAs,
    className,
}: MobileTabBarProps) {
    const Link = (linkAs ?? "a") as LinkComponent
    const cellClass = (active?: boolean) =>
        cn(
            "relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )

    return (
        <nav
            aria-label="Primary"
            className={cn(
                // z-40 keeps it under the sheet overlay (z-200), so opening More covers it.
                "fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md lg:hidden dark:border-neutral-800 dark:bg-neutral-950/95",
                "pb-[env(safe-area-inset-bottom)] print:hidden",
                className,
            )}
        >
            <div className="flex h-[60px] items-stretch">
                {items.map((item) =>
                    item.href ? (
                        <Link
                            key={item.key}
                            href={item.href}
                            onClick={item.onSelect}
                            aria-current={item.active ? "page" : undefined}
                            className={cellClass(item.active)}
                        >
                            <TabContent item={item} />
                        </Link>
                    ) : (
                        <button
                            key={item.key}
                            type="button"
                            onClick={item.onSelect}
                            aria-current={item.active ? "page" : undefined}
                            className={cellClass(item.active)}
                        >
                            <TabContent item={item} />
                        </button>
                    ),
                )}
                <button
                    type="button"
                    onClick={onMore}
                    aria-label={`${moreLabel} - open navigation`}
                    aria-expanded={moreActive}
                    className={cellClass(moreActive)}
                >
                    <TabContent item={{ key: "__more__", label: moreLabel, icon: moreIcon ?? Menu, active: moreActive }} />
                </button>
            </div>
        </nav>
    )
}

export default MobileTabBar
