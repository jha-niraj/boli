"use client"

import * as React from "react"
import { PanelLeftOpen } from "lucide-react"
import { usePathname } from "next/navigation"

import { AppLink } from "../app-link"
import { NavProgress } from "../nav-progress"
import { useStaggeredPrefetch } from "../use-staggered-prefetch"
import { MobileTabBar } from "../ui/mobile-tab-bar"
import { Button } from "../ui/button"
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet"
import { usePinPeek } from "../../hooks/use-pin-peek"
import { useRailWidth } from "../../hooks/use-rail-width"
import { RAIL_WIDTH, activeHref, tabItems, type ShellNavSection, type ShellProduct, type ShellSidebar, type ShellWorkspace } from "../../lib/shell"
import { SHELL_SHADOW_LEFT, SHELL_SHADOW_RIGHT, SHELL_SHADOW_TOP, SHELL_SURFACE } from "../../lib/surfaces"
import { cn } from "../../lib/utils"
import { ShellRail, type ShellAccount, type ShellAssistant, type ShellBrand, type ShellNotifications } from "./shell-rail"
import { ProductShell } from "./product-shell"

/**
 * THE APP SHELL - one for every app (apps/main, apps/admin). AGENTS.md "The shell".
 *
 * - FLUSH AND SQUARE (owner, 2026-11-23): the rail is fixed to the left edge and the page is one flat canvas - no
 *   rounded frame, no inset, no rounded right column. Chrome separates from the page by a SOFT SHADOW, never a hairline.
 * - PIN OR PEEK: pinned, the rail takes 240px in the flow. Unpinned, it hides and slides in over the page (with its
 *   shadow) when the pointer reaches a 12px strip at the left edge. `Cmd/Ctrl + \` toggles. The choice lives in a
 *   cookie (`cookieName`, "1" = unpinned) that the SERVER layout reads and passes as `initialPinned`, so the first
 *   frame is already right.
 * - The rail carries `data-sheet-boundary`: a resizable right sheet never grows over it, and a press on the rail
 *   closes an open sheet (a rail link navigates and the sheet closes with it).
 * - PHONE (below `lg`): no rail; a bottom tab bar with four links + More (the rail in a left sheet), safe-area padded.
 * - PAGE BOX: `<main data-app-main>` does NOT pad; it publishes `--app-page-h`, the exact height a bound page may take
 *   (100dvh minus, on a phone, the tab bar). Page pads its own header and content column (max-w-7xl, 3xl `reading`,
 *   none `full`), so its scroll area runs to the screen edges.
 * - BLEED: a page whose root carries `data-page-bleed` (Page `bleed`) takes the whole box - no padding, full height,
 *   to the right edge - for a workspace that lays out its own columns (the AI page with its right column).
 * - RIGHT COLUMN: `aside` renders a full-height column at the right edge (desktop only), separated by the same soft
 *   shadow. Most pages that need one (the AI page) draw it inside a bleed page instead.
 * - PRODUCT RAIL (opt-in, `productRail`): a 56px icon rail of products that widens OVER the page on hover, and beside
 *   it a sidebar with only the open product's pages (`nav`). The sidebar is EXPANDED or COLLAPSED (Sarvam): collapsed,
 *   the icon rail goes off screen and the sidebar becomes one 64px icon rail; same cookie (`initialPinned` = expanded)
 *   and Cmd+\, no peek. See product-shell.tsx. apps/main (products) and apps/admin (modules, no workspaces) both use it.
 */

/** The opt-in product rail (apps/main). `nav` then holds only the OPEN product's pages. */
export interface ProductRailConfig {
    products: ShellProduct[]
    /** The product the current path belongs to; null on an account page. */
    activeProductId: string | null
    /** The workspace switcher at the top of the rail. Empty or omitted (apps/admin, which has no workspaces) = no switcher. */
    workspaces?: ShellWorkspace[]
    onSwitchWorkspace?: (id: string) => void
    /** Adds "Create workspace" to the switcher menu; the app opens its own dialog (called after the menu closes). */
    onCreateWorkspace?: () => void
    /** The open product's sidebar; null = an account page (no sidebar, the rail alone). */
    sidebar: ShellSidebar | null
    /** The label under the phone tab bar's last button, which opens the rail as a sheet. Default "Products". */
    phoneMenuLabel?: string
    /** What the rail's entries are called (the rail's aria-label, the collapsed rail's switch menu). Default "Products";
     *  apps/admin says "Modules". */
    productsLabel?: string
}

export interface AppShellProps {
    brand: ShellBrand
    nav: ShellNavSection[]
    account: ShellAccount
    notifications?: ShellNotifications
    /** From the server layout: `railPinnedFromCookie(cookies().get(cookieName)?.value)`. */
    initialPinned: boolean
    /** From the server layout: `railWidthFromCookie(cookies().get(railWidthCookie(cookieName))?.value)`. */
    initialRailWidth?: number
    /** The rail cookie's name; each app its own (localhost cookies ignore the port). */
    cookieName: string
    /** A full-height column at the right edge (desktop). */
    aside?: React.ReactNode
    /** Extra round icons in the rail footer, after the account chip, before the bell. */
    railFooterExtra?: React.ReactNode
    /** A full-width row in the rail footer, above the account row (e.g. a credits balance). */
    railFooterTop?: React.ReactNode
    /** The assistant's own row above the account row (e.g. "Ask AI" -> /ai). */
    assistant?: ShellAssistant
    /** Opt in to the product rail + product sidebar (apps/main). Omit for the classic single rail (apps/admin). */
    productRail?: ProductRailConfig
    children: React.ReactNode
}

export function AppShell(props: AppShellProps) {
    // Two different trees, chosen once per app (the prop is static), so neither one's hooks run conditionally.
    if (props.productRail) return <ProductShell {...props} productRail={props.productRail} />
    return <ClassicShell {...props} />
}

function ClassicShell({
    brand, nav, account, notifications, initialPinned, initialRailWidth, cookieName, aside, railFooterExtra, railFooterTop, assistant, children,
}: AppShellProps) {
    const pp = usePinPeek({ initialPinned, cookieName })
    /*
     * The account menu is portalled OUT of the rail, so moving into it reads as leaving the rail: a peeked rail slid away
     * under its open menu. While the menu is open the rail stays; when it closes, a peeked rail closes with it.
     */
    const [menuOpen, setMenuOpenRaw] = React.useState(false)
    // Whether the pointer is over the rail itself: closing the menu with the pointer back ON the rail keeps the rail.
    const pointerInRail = React.useRef(false)
    const setMenuOpen = React.useCallback((open: boolean) => {
        setMenuOpenRaw(open)
        if (open) pp.holdPeek()
        else if (!pp.isPinned && !pointerInRail.current) pp.unpeek()
    }, [pp])
    const rail = useRailWidth(cookieName, initialRailWidth)
    const isPeeking = pp.peeking && !pp.isPinned
    const hidden = !pp.isPinned && !isPeeking
    const pathname = usePathname() ?? "/"
    const [moreOpen, setMoreOpen] = React.useState(false)

    // A sheet left open on a phone closes when the route changes (a link inside it, or Back).
    React.useEffect(() => { setMoreOpen(false) }, [pathname])

    // Warm every rail destination from idle: the home in full, the rest as shells.
    const hrefs = React.useMemo(() => nav.flatMap((s) => s.items.map((i) => i.href)), [nav])
    useStaggeredPrefetch(hrefs, { home: brand.href })

    const active = activeHref(pathname, nav)
    const tabs = tabItems(nav).map((i) => ({ key: i.href, label: i.name, icon: i.icon, href: i.href, active: active === i.href, badge: i.badge }))

    const asideRef = React.useRef<HTMLElement | null>(null)
    const revealRef = React.useRef<HTMLButtonElement | null>(null)

    return (
        <div
            data-app-shell=""
            className="flex min-h-dvh w-full bg-white dark:bg-[#121314] print:block print:min-h-0"
            style={{ "--rail-w": `${rail.width}px` } as React.CSSProperties}
        >
            <NavProgress />

            {/* Keyboard way back to a hidden rail - hover is pointer-only. Invisible until focused. */}
            {!pp.isPinned && (
                <div className="hidden lg:block print:hidden">
                    <Button variant="ghost"
                        ref={revealRef}
                        type="button"
                        onClick={pp.peek}
                        className="sr-only h-auto cursor-pointer focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[46] focus-visible:flex focus-visible:items-center focus-visible:gap-2 focus-visible:rounded-lg focus-visible:bg-white focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:shadow-md dark:focus-visible:bg-neutral-900"
                    >
                        <PanelLeftOpen className="h-4 w-4" /> Show sidebar
                    </Button>
                </div>
            )}
            {/* The hot edge: an off-screen rail cannot receive pointerenter itself. Absent while pinned. */}
            {!pp.isPinned && (
                <div
                    aria-hidden
                    onPointerEnter={pp.peekSoon}
                    onPointerLeave={pp.unpeek}
                    className="fixed inset-y-0 left-0 z-[45] hidden w-3 lg:block print:hidden"
                />
            )}

            <aside
                ref={asideRef}
                data-sheet-boundary=""
                aria-label="Sidebar"
                className={cn(
                    "fixed inset-y-0 left-0 hidden h-dvh w-[var(--rail-w)] flex-col overflow-hidden lg:flex print:hidden",
                    !rail.dragging && "transition-[transform,box-shadow] duration-200 ease-out will-change-transform motion-reduce:transition-none",
                    SHELL_SURFACE,
                    SHELL_SHADOW_LEFT,
                    // Pinned sits in the layout (z-40). Peeking floats over the page (z-45, under sheets at z-70).
                    pp.isPinned ? "z-40" : "z-[45]",
                )}
                // Off-screen by a little more than its width so the shadow does not bleed. Inline: Tailwind v4
                // translate-x sets `translate`, not `transform`, and the transition is on transform.
                style={{ transform: hidden ? "translateX(calc(-100% - 32px))" : "translateX(0)" }}
                onPointerEnter={() => { pointerInRail.current = true; if (!pp.isPinned) pp.holdPeek() }}
                onPointerLeave={() => { pointerInRail.current = false; if (!pp.isPinned && !menuOpen) pp.unpeek() }}
                onFocusCapture={pp.isPinned ? undefined : pp.peek}
                onPointerDownCapture={pp.isPinned ? undefined : () => pp.lockPeek()}
                onClickCapture={pp.isPinned ? undefined : (e) => {
                    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                    const a = (e.target as HTMLElement).closest("a[href]")
                    if (a && e.currentTarget.contains(a) && a.getAttribute("target") !== "_blank") pp.closePeek()
                }}
                onBlurCapture={pp.isPinned ? undefined : (e) => {
                    const next = e.relatedTarget as Node | null
                    if (!next || e.currentTarget.contains(next)) return
                    // A menu opened from the rail (the account menu) is portalled out; focus moving into it is not leaving.
                    if (next instanceof Element && next.closest("[data-radix-popper-content-wrapper]")) return
                    pp.unpeek()
                }}
                onKeyDown={(e) => {
                    if (pp.isPinned || e.key !== "Escape") return
                    const hadFocus = e.currentTarget.contains(document.activeElement)
                    pp.closePeek()
                    if (hadFocus) revealRef.current?.focus()
                }}
                aria-hidden={hidden ? true : undefined}
                inert={hidden ? true : undefined}
            >
                <ShellRail
                    brand={brand}
                    nav={nav}
                    account={account}
                    notifications={notifications}
                    pin={{ isPinned: pp.isPinned, setPinned: pp.setPinned }}
                    footerExtra={railFooterExtra}
                    footerTop={railFooterTop}
                    assistant={assistant}
                    menu={{ open: menuOpen, onOpenChange: setMenuOpen }}
                />
                {pp.isPinned && (
                    // The drag edge: 200-360px, double-click resets, the width is kept in a cookie (no jump on load).
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize the sidebar"
                        aria-valuemin={RAIL_WIDTH.min}
                        aria-valuemax={RAIL_WIDTH.max}
                        aria-valuenow={rail.width}
                        tabIndex={0}
                        onPointerDown={rail.onPointerDown}
                        onDoubleClick={rail.reset}
                        onKeyDown={rail.onKeyDown}
                        className="group absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none focus-visible:outline-none"
                    >
                        <span className="absolute inset-y-0 right-0 w-px bg-transparent transition-colors group-hover:bg-neutral-300 group-focus-visible:bg-neutral-400 dark:group-hover:bg-neutral-700" />
                    </div>
                )}
            </aside>

            <div
                className={cn(
                    "flex min-w-0 flex-1 print:p-0",
                    !rail.dragging && "transition-[padding] duration-200 ease-out motion-reduce:transition-none",
                    pp.isPinned && "lg:pl-[var(--rail-w)]",
                )}
            >
                <main data-app-main="" className="min-w-0 flex-1 print:p-0">
                    <div data-app-frame="" className="w-full min-w-0">
                        {children}
                    </div>
                </main>
                {aside ? (
                    <aside
                        aria-label="Side panel"
                        className={cn("sticky top-0 hidden h-dvh w-[360px] shrink-0 flex-col overflow-hidden lg:flex print:hidden", SHELL_SURFACE, SHELL_SHADOW_RIGHT)}
                    >
                        {aside}
                    </aside>
                ) : null}
            </div>

            <MobileTabBar
                items={tabs}
                onMore={() => setMoreOpen(true)}
                moreActive={moreOpen}
                linkAs={AppLink}
                className={cn("border-t-0 bg-white/95 dark:bg-[#121314]/95", SHELL_SHADOW_TOP)}
            />
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent side="left" resizable={false} className="flex w-[280px] flex-col gap-0 border-r-0 p-0 sm:max-w-[280px]">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <ShellRail
                        brand={brand}
                        nav={nav}
                        account={account}
                        notifications={notifications ? { ...notifications, onOpen: () => { setMoreOpen(false); notifications.onOpen() } } : undefined}
                        onNavigate={() => setMoreOpen(false)}
                        footerExtra={railFooterExtra}
                        footerTop={railFooterTop}
                        assistant={assistant ? { ...assistant, onClick: assistant.onClick ? () => { setMoreOpen(false); assistant.onClick?.() } : undefined } : undefined}
                    />
                </SheetContent>
            </Sheet>
        </div>
    )
}

export default AppShell
