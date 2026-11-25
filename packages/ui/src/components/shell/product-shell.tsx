"use client"

import * as React from "react"
import { LayoutGrid } from "lucide-react"
import { usePathname } from "next/navigation"

import { AppLink } from "../app-link"
import { NavProgress } from "../nav-progress"
import { useStaggeredPrefetch } from "../use-staggered-prefetch"
import { MobileTabBar } from "../ui/mobile-tab-bar"
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet"
import { useRailWidth } from "../../hooks/use-rail-width"
import { PRODUCT_RAIL, RAIL_WIDTH, activeHref, tabItems } from "../../lib/shell"
import { SHELL_SHADOW_LEFT, SHELL_SHADOW_TOP, SHELL_SURFACE } from "../../lib/surfaces"
import { cn } from "../../lib/utils"
import type { AppShellProps, ProductRailConfig } from "./app-shell"
import { CompactRailFoot, ProductRail } from "./product-rail"
import { CompactSidebar, ProductSidebar } from "./product-sidebar"
import { ShellNavContext } from "./shell-context"

/**
 * THE PRODUCT SHELL (AppShell with `productRail`; apps/main, plan/main/jawaf/jawaf-v1.md "Names and structure"):
 *
 *   EXPANDED   [ icon rail 56px ][ product sidebar (--rail-w, resizable) ][ page ]
 *   COLLAPSED  [ compact sidebar 64px ][ page ]          (the icon rail is off screen)
 *
 * - ICON RAIL: 56px in the layout. On hover (or keyboard focus) it widens to 272px OVER the page - no layout shift -
 *   and reveals its labels. Its rows sit on a fixed inner width (product-rail.tsx), so nothing moves as it widens. A
 *   menu opened from it (workspace, account) keeps it open until the menu closes; choosing from it closes it.
 * - PRODUCT SIDEBAR: only the open product's pages (`nav`), with the product's name and a collapse button. Two states
 *   (owner, 2026-11-25, modelled on dashboard.sarvam.ai), toggled by that button and Cmd/Ctrl + \:
 *   - EXPANDED (default): the icon rail + the full sidebar beside it.
 *   - COLLAPSED: the icon rail slides off screen and the sidebar itself becomes one 64px icon rail at the far left
 *     (CompactSidebar: expand button, the product's compact controls, its pages as icons, then the account-wide
 *     essentials from CompactRailFoot). No hover-peek - the button or the shortcut expands it.
 *   The choice lives in `cookieName` ("1" = collapsed), read by the server layout -> `initialPinned` (true = expanded),
 *   so the first frame is already right; the expanded width lives in `<cookieName>_w`.
 * - ACCOUNT PAGES (`sidebar: null`): the icon rail alone, whatever the cookie says; the shortcut does nothing there.
 * - FLUSH AND SQUARE: chrome separates from the page by the soft shadow (SHELL_SHADOW_LEFT), never a hairline.
 * - PHONE (below lg): no rail; a bottom tab bar with the open product's tab items (or, on an account page, the live
 *   products) + "Products", which opens the rail and the product's sidebar in one left sheet.
 * - PAGE BOX: unchanged - `<main data-app-main>` does not pad and publishes `--app-page-h` (globals.css).
 */
export function ProductShell({
    brand, nav, account, notifications, initialPinned, initialRailWidth, cookieName, railFooterExtra, railFooterTop,
    productRail, children,
}: AppShellProps & { productRail: ProductRailConfig }) {
    const { products, activeProductId, workspaces, onSwitchWorkspace, onCreateWorkspace, sidebar, phoneMenuLabel = "Products", productsLabel } = productRail
    const hasSidebar = sidebar !== null
    const pathname = usePathname() ?? "/"

    // ── The icon rail: collapsed in the layout, widened over the page while hovered / focused / holding a menu. ──
    // ── The product sidebar: expanded or collapsed (cookie), and its expanded width. ──
    const { expanded: expandedPref, setExpanded } = useSidebarCollapse({ initialExpanded: initialPinned, cookieName, enabled: hasSidebar })
    const width = useRailWidth(cookieName, initialRailWidth)
    const collapsed = hasSidebar && !expandedPref
    const expanded = hasSidebar && expandedPref

    const hover = useRailHover(pathname, collapsed)

    // ── Phone sheet ──
    const [navOpen, setNavOpen] = React.useState(false)
    React.useEffect(() => { setNavOpen(false) }, [pathname])
    const navApi = React.useMemo(() => ({ openNav: () => setNavOpen(true) }), [])

    // Warm the products' homes and the open product's pages from idle, one at a time.
    const hrefs = React.useMemo(
        () => [...products.filter((p) => !p.soon).map((p) => p.href), ...nav.flatMap((s) => s.items.map((i) => i.href))],
        [products, nav],
    )
    const activeProduct = products.find((p) => p.id === activeProductId) ?? null
    useStaggeredPrefetch(hrefs, { home: activeProduct?.href ?? brand.href })

    const active = activeHref(pathname, nav)
    const productTabs = tabItems(nav)
    const tabs = productTabs.length
        ? productTabs.map((i) => ({ key: i.href, label: i.name, icon: i.icon, href: i.href, active: active === i.href, badge: i.badge }))
        : products.filter((p) => !p.soon).slice(0, 4).map((p) => ({ key: p.href, label: p.label, icon: p.icon, href: p.href, active: p.id === activeProductId }))

    const collapse = React.useCallback(() => setExpanded(false), [setExpanded])
    const expand = React.useCallback(() => setExpanded(true), [setExpanded])

    return (
        <ShellNavContext.Provider value={navApi}>
            <div
                data-app-shell=""
                className="flex min-h-dvh w-full bg-white dark:bg-[#121314] print:block print:min-h-0"
                style={{
                    "--rail-w": `${width.width}px`,
                    "--product-rail-w": `${PRODUCT_RAIL.collapsed}px`,
                    "--compact-rail-w": `${PRODUCT_RAIL.compact}px`,
                } as React.CSSProperties}
            >
                <NavProgress />

                {/* ── Icon rail: off screen (left) while the sidebar is collapsed ── */}
                <aside
                    data-sheet-boundary=""
                    aria-label="Products and account"
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 hidden h-dvh flex-col overflow-hidden lg:flex print:hidden",
                        "transition-[width,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
                        SHELL_SURFACE,
                        hover.open && !collapsed
                            ? "shadow-[1px_0_0_rgba(0,0,0,0.04),12px_0_40px_-16px_rgba(0,0,0,0.28)] dark:shadow-[1px_0_0_rgba(255,255,255,0.05),16px_0_48px_-18px_rgba(0,0,0,0.7)]"
                            : SHELL_SHADOW_LEFT,
                    )}
                    // Inline transform: Tailwind v4 translate-x sets `translate`, and the transition is on transform. Off by
                    // a little more than its width so its shadow does not bleed onto the compact rail.
                    style={{
                        width: hover.open && !collapsed ? PRODUCT_RAIL.open : PRODUCT_RAIL.collapsed,
                        transform: collapsed ? "translateX(calc(-100% - 32px))" : "translateX(0)",
                    }}
                    aria-hidden={collapsed ? true : undefined}
                    inert={collapsed ? true : undefined}
                    {...hover.handlers}
                >
                    <ProductRail
                        brand={brand}
                        products={products}
                        activeProductId={activeProductId}
                        workspaces={workspaces}
                        onSwitchWorkspace={onSwitchWorkspace}
                        onCreateWorkspace={onCreateWorkspace}
                        productsLabel={productsLabel}
                        account={account}
                        notifications={notifications}
                        footerTop={railFooterTop}
                        footerExtra={railFooterExtra}
                        expanded={hover.open && !collapsed}
                        onMenuOpenChange={hover.onMenuOpenChange}
                    />
                </aside>

                {/* ── Product sidebar: beside the icon rail (expanded) or the 64px icon rail at the far left (collapsed) ── */}
                {sidebar ? (
                    <aside
                        data-sheet-boundary=""
                        aria-label={`${sidebar.title} pages`}
                        className={cn(
                            "fixed inset-y-0 left-0 z-40 hidden h-dvh flex-col overflow-hidden lg:flex print:hidden",
                            !width.dragging && "transition-[transform,width] duration-200 ease-out motion-reduce:transition-none",
                            SHELL_SURFACE,
                            SHELL_SHADOW_LEFT,
                        )}
                        style={{
                            width: collapsed ? "var(--compact-rail-w)" : "var(--rail-w)",
                            transform: collapsed ? "translateX(0)" : "translateX(var(--product-rail-w))",
                        }}
                    >
                        {collapsed ? (
                            <CompactSidebar
                                sidebar={sidebar}
                                nav={nav}
                                onExpand={expand}
                                foot={
                                    <CompactRailFoot
                                        brand={brand}
                                        products={products}
                                        activeProductId={activeProductId}
                                        productsLabel={productsLabel}
                                        account={account}
                                        notifications={notifications}
                                        footerTop={railFooterTop}
                                        footerExtra={railFooterExtra}
                                    />
                                }
                            />
                        ) : (
                            // A fixed inner width while it widens from 64px: the labels are revealed, never reflowed.
                            <div className="flex h-full min-h-0 w-[var(--rail-w)] shrink-0 flex-col">
                                <ProductSidebar sidebar={sidebar} nav={nav} onCollapse={collapse} />
                            </div>
                        )}
                        {expanded ? (
                            <div
                                role="separator"
                                aria-orientation="vertical"
                                aria-label="Resize the sidebar"
                                aria-valuemin={RAIL_WIDTH.min}
                                aria-valuemax={RAIL_WIDTH.max}
                                aria-valuenow={width.width}
                                tabIndex={0}
                                onPointerDown={width.onPointerDown}
                                onDoubleClick={width.reset}
                                onKeyDown={width.onKeyDown}
                                className="group absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none focus-visible:outline-none"
                            >
                                <span className="absolute inset-y-0 right-0 w-px bg-transparent transition-colors group-hover:bg-neutral-300 group-focus-visible:bg-neutral-400 dark:group-hover:bg-neutral-700" />
                            </div>
                        ) : null}
                    </aside>
                ) : null}

                <div
                    className={cn(
                        "flex min-w-0 flex-1 print:p-0",
                        !width.dragging && "transition-[padding] duration-200 ease-out motion-reduce:transition-none",
                        // One padding class at a time: two arbitrary pl-* values would race on stylesheet order.
                        expanded
                            ? "lg:pl-[calc(var(--product-rail-w)+var(--rail-w))]"
                            : collapsed ? "lg:pl-[var(--compact-rail-w)]" : "lg:pl-[var(--product-rail-w)]",
                    )}
                >
                    <main data-app-main="" className="min-w-0 flex-1 print:p-0">
                        <div data-app-frame="" className="w-full min-w-0">
                            {children}
                        </div>
                    </main>
                </div>

                <MobileTabBar
                    items={tabs}
                    onMore={() => setNavOpen(true)}
                    moreActive={navOpen}
                    moreLabel={phoneMenuLabel}
                    moreIcon={LayoutGrid}
                    linkAs={AppLink}
                    className={cn("border-t-0 bg-white/95 dark:bg-[#121314]/95", SHELL_SHADOW_TOP)}
                />
                <Sheet open={navOpen} onOpenChange={setNavOpen}>
                    <SheetContent side="left" resizable={false} className="flex w-[300px] flex-col gap-0 border-r-0 p-0 sm:max-w-[300px]">
                        <SheetTitle className="sr-only">{phoneMenuLabel}</SheetTitle>
                        <ProductRail
                            layout="sheet"
                            expanded
                            brand={brand}
                            products={products}
                            activeProductId={activeProductId}
                            workspaces={workspaces}
                            onSwitchWorkspace={onSwitchWorkspace}
                            onCreateWorkspace={onCreateWorkspace}
                            productsLabel={productsLabel}
                            account={account}
                            notifications={notifications ? { ...notifications, onOpen: () => { setNavOpen(false); notifications.onOpen() } } : undefined}
                            footerTop={railFooterTop}
                            footerExtra={railFooterExtra}
                            onNavigate={() => setNavOpen(false)}
                        >
                            {sidebar ? (
                                <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-950/[0.06] dark:border-white/[0.07]">
                                    <ProductSidebar sidebar={sidebar} nav={nav} onNavigate={() => setNavOpen(false)} />
                                </div>
                            ) : <div className="flex-1" />}
                        </ProductRail>
                    </SheetContent>
                </Sheet>
            </div>
        </ShellNavContext.Provider>
    )
}

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * The product sidebar's expanded / collapsed choice. Kept in the same cookie the classic rail's pin uses ("1" =
 * collapsed), which the server layout reads so the first frame is right. Cmd/Ctrl + \ toggles it - only where there
 * is a sidebar to toggle (`enabled`), so the shortcut never flips a hidden setting on an account page.
 */
function useSidebarCollapse({ initialExpanded, cookieName, enabled }: { initialExpanded: boolean; cookieName: string; enabled: boolean }) {
    const [expanded, setExpandedRaw] = React.useState(initialExpanded)
    const setExpanded = React.useCallback((next: boolean) => {
        setExpandedRaw(next)
        try {
            document.cookie = `${cookieName}=${next ? "0" : "1"}; path=/; max-age=${ONE_YEAR}; samesite=lax`
        } catch { /* cookies blocked - the choice still holds for this session */ }
    }, [cookieName])

    // Cmd/Ctrl + \ (Notion / Linear / Sarvam). Not Cmd+B - that is bold in the editor.
    React.useEffect(() => {
        if (!enabled) return
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key === "\\") {
                e.preventDefault()
                setExpanded(!expanded)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [enabled, expanded, setExpanded])

    return { expanded, setExpanded }
}

/** Intent delay before a hover widens the rail, so a pointer passing by does not flash it. */
const OPEN_MS = 90
/** Grace before it narrows again. */
const CLOSE_MS = 160

/**
 * The icon rail's open state: open while the pointer is over it (after a short intent delay), while focus is inside it,
 * or while a menu opened from it is open (menus are portalled out, so moving into one reads as leaving the rail).
 * A press on a link inside it closes it at once (the page is changing).
 */
function useRailHover(pathname: string, collapsed: boolean) {
    const [open, setOpen] = React.useState(false)
    /**
     * Hover is ignored until the pointer has left the rail once after the sidebar is expanded or collapsed (owner,
     * 2026-11-25: pressing the expand button slid the rail back in UNDER the pointer and it widened at once).
     */
    const suppressed = React.useRef(false)
    const ref = React.useRef<HTMLElement | null>(null)
    const pointerIn = React.useRef(false)
    const menus = React.useRef(0)
    /** When a menu last closed: Radix hands focus back to the menu's trigger INSIDE the rail right after, and that
     *  returned focus must not count as "someone is using the rail" (owner, 2026-11-25: after choosing Members from the
     *  account menu the rail stayed open until the pointer went back over it and out again). */
    const menuClosedAt = React.useRef(0)
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
    React.useEffect(() => clear, [])

    /** Is the pointer really over the rail right now (not what the last enter/leave event said)? */
    const hovered = () => !!ref.current?.matches(":hover")
    /**
     * The theme wipe (startThemeTransition) lays a view-transition snapshot over the whole page for about half a
     * second: no element is :hover and every pointer event targets the document. Read as "the pointer left", that
     * closed the rail the moment Light or Dark was picked in the account menu (owner, 2026-11-25). While it runs,
     * nothing counts as leaving.
     */
    const inThemeWipe = () => typeof document !== "undefined" && !!document.documentElement.dataset.themeTransition

    const closeSoon = React.useCallback(() => {
        clear()
        if (menus.current > 0) return
        timer.current = setTimeout(() => {
            timer.current = null
            if (inThemeWipe()) { closeSoonRef.current(); return }
            if (menus.current === 0 && !hovered()) { pointerIn.current = false; setOpen(false) }
        }, CLOSE_MS)
    }, [])
    const closeSoonRef = React.useRef(closeSoon)
    closeSoonRef.current = closeSoon

    // A page change always closes it and forgets any menu that unmounted without reporting its close.
    React.useEffect(() => { clear(); menus.current = 0; setOpen(false) }, [pathname])

    // Where the mouse last was, so a toggle knows whether the rail is about to slide in under it.
    const lastX = React.useRef<number | null>(null)
    React.useEffect(() => {
        const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") lastX.current = e.clientX }
        window.addEventListener("pointermove", onMove, { passive: true })
        return () => window.removeEventListener("pointermove", onMove)
    }, [])

    // Expanding or collapsing the sidebar closes it; if the mouse sits where the rail lands (the expand button is
    // there), hover waits for the pointer to leave the rail and come back.
    const firstRun = React.useRef(true)
    React.useEffect(() => {
        if (firstRun.current) { firstRun.current = false; return }
        clear(); menus.current = 0; setOpen(false)
        suppressed.current = lastX.current !== null && lastX.current < PRODUCT_RAIL.collapsed
    }, [collapsed])

    /** Hover widens the rail only from its products and foot: the top (brand + workspace, `data-rail-no-hover`) never
     *  does (owner, 2026-11-25) - a press on the workspace switcher still opens it with its menu. */
    const openFromHover = (target: EventTarget | null) => {
        if (suppressed.current || menus.current > 0) return
        const el = target instanceof Element ? target : null
        if (el?.closest("[data-rail-no-hover]")) { if (!open) clear(); return }
        if (open || timer.current) return
        timer.current = setTimeout(() => { timer.current = null; setOpen(true) }, OPEN_MS)
    }

    // Safety net while open: a press outside the rail (and outside its portalled menus) closes it, and so does the
    // pointer moving anywhere outside it once no menu is open - so it can never stay stuck open.
    React.useEffect(() => {
        if (!open) return
        const outside = (t: EventTarget | null) => {
            const el = t instanceof Element ? t : null
            if (!el || !ref.current) return true
            return !ref.current.contains(el) && !el.closest("[data-radix-popper-content-wrapper],[role=dialog]")
        }
        const onDown = (e: PointerEvent) => { if (!inThemeWipe() && outside(e.target) && menus.current === 0) { clear(); setOpen(false) } }
        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" || menus.current > 0 || timer.current || inThemeWipe()) return
            if (outside(e.target) && !hovered()) closeSoon()
        }
        document.addEventListener("pointerdown", onDown, true)
        document.addEventListener("pointermove", onMove, { passive: true })
        return () => { document.removeEventListener("pointerdown", onDown, true); document.removeEventListener("pointermove", onMove) }
    }, [open, closeSoon])

    const onMenuOpenChange = React.useCallback((isOpen: boolean) => {
        menus.current = Math.max(0, menus.current + (isOpen ? 1 : -1))
        if (isOpen) { clear(); setOpen(true); return }
        menuClosedAt.current = Date.now()
        // A menu item was chosen or the menu was dismissed: stay open only if the pointer is actually on the rail.
        requestAnimationFrame(() => { if (!inThemeWipe() && !hovered()) { pointerIn.current = false; closeSoon() } })
    }, [closeSoon])

    const handlers = {
        ref: (el: HTMLElement | null) => { ref.current = el },
        onPointerEnter: (e: React.PointerEvent) => {
            if (e.pointerType !== "mouse") return
            pointerIn.current = true
            if (open) clear()
            openFromHover(e.target)
        },
        onPointerMove: (e: React.PointerEvent) => {
            // Moving down from the top into the products opens it (pointerenter fired once, on the top).
            if (e.pointerType !== "mouse") return
            openFromHover(e.target)
        },
        onPointerLeave: (e: React.PointerEvent) => {
            if (e.pointerType !== "mouse" || inThemeWipe()) return
            pointerIn.current = false
            suppressed.current = false
            closeSoon()
        },
        onFocusCapture: (e: React.FocusEvent) => {
            // Keyboard focus opens it; a mouse press focuses too, and the hover already handles that. Focus handed
            // back by a closing menu is not a person arriving.
            if (Date.now() - menuClosedAt.current < 500) return
            if ((e.target as HTMLElement).matches(":focus-visible")) { clear(); setOpen(true) }
        },
        onBlurCapture: (e: React.FocusEvent<HTMLElement>) => {
            const next = e.relatedTarget as Node | null
            if (next && e.currentTarget.contains(next)) return
            if (next instanceof Element && next.closest("[data-radix-popper-content-wrapper]")) return
            if (!hovered()) closeSoon()
        },
        onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const a = (e.target as HTMLElement).closest("a[href]")
            if (a && e.currentTarget.contains(a) && a.getAttribute("target") !== "_blank") { clear(); menus.current = 0; setOpen(false) }
        },
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Escape" && menus.current === 0) { clear(); setOpen(false) }
        },
    }

    return { open, handlers, onMenuOpenChange }
}
