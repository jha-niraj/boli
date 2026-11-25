"use client"

import * as React from "react"
import { Bell, Check, ChevronUp, ChevronsUpDown, House, LayoutGrid, Plus } from "lucide-react"

import { AppLink } from "../app-link"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { type ShellProduct, type ShellWorkspace } from "../../lib/shell"
import { cn } from "../../lib/utils"
import { AccountRow, type ShellAccount, type ShellBrand, type ShellNotifications } from "./shell-rail"

/**
 * THE PRODUCT RAIL's content (Sarvam-style, plan/main/jawaf/jawaf-v1.md): brand, the workspace switcher, the products,
 * then at the foot the account-wide things (credits, notifications, feedback, the account menu).
 *
 * Every row is drawn on a FIXED inner width with the icon in the first 40px cell, so the frame (product-shell.tsx) only
 * changes the rail's visible width: collapsed it clips to the 56px icon column, hovered it widens over the page and the
 * labels are simply revealed - nothing moves, so a menu anchored to an icon never jumps.
 *
 * `layout="sheet"` is the phone sheet: full width, the products as a compact grid, `children` (the open product's
 * sidebar) between the products and the foot.
 *
 * Every foot row is ONE control the full width of the rail (owner, 2026-11-25): the whole row is the hit area and
 * takes the hover fill, not just its icon. An app's own row (Boli's Send feedback) uses `RailRowButton` and
 * `useProductRail()` so it draws the same and keeps the rail open while its popover is.
 *
 * COMPACT (owner, 2026-11-25, Sarvam): when the person collapses the product sidebar, this rail goes off screen and the
 * sidebar becomes one 64px icon rail; `CompactRailFoot` puts the account-wide essentials at its foot as 40px icons
 * (Products menu, credits, feedback, notifications, account). `useProductRail().compact` is true there, so an app's own
 * row (`RailRowButton`, Boli's credits) draws itself as one icon with a tooltip.
 */

export interface ProductRailProps {
    brand: ShellBrand
    products: ShellProduct[]
    activeProductId: string | null
    /** Empty or omitted = no workspace switcher (apps/admin). */
    workspaces?: ShellWorkspace[]
    onSwitchWorkspace?: (id: string) => void
    /** Adds "Create workspace" at the foot of the switcher menu; the app opens its own dialog. */
    onCreateWorkspace?: () => void
    /** What the entries are called (aria-label of the list). Default "Products". */
    productsLabel?: string
    account: ShellAccount
    notifications?: ShellNotifications
    /** Rows above the notifications row (Boli: credits + Add). Drawn with the icon in the first 40px. */
    footerTop?: React.ReactNode
    /** One more foot row (Boli: Send feedback), drawn by the app with `RailRowButton`. */
    footerExtra?: React.ReactNode
    /** Labels shown (hovered rail, the phone sheet). Collapsed, only the icon column is visible. */
    expanded: boolean
    layout?: "rail" | "sheet"
    /** Called after a link is pressed (the phone sheet closes itself). */
    onNavigate?: () => void
    /** A menu opened from the rail (workspace, account) is portalled out: the frame keeps the rail open meanwhile. */
    onMenuOpenChange?: (open: boolean) => void
    /** The phone sheet: the open product's sidebar, between the products and the foot. */
    children?: React.ReactNode
}

/** Visible label: fades with the rail so a half-open rail never shows cut words. */
const label = (expanded: boolean) =>
    cn("min-w-0 flex-1 truncate text-left transition-opacity duration-150 motion-reduce:transition-none", expanded ? "opacity-100" : "opacity-0")

const ROW =
    "flex h-10 w-full min-w-0 cursor-pointer items-center gap-1 rounded-xl p-0 pr-2 text-sm font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400"
const ROW_IDLE =
    "text-neutral-600 hover:bg-neutral-950/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
const ROW_ON = "bg-neutral-950/[0.06] font-medium text-neutral-900 dark:bg-white/[0.08] dark:text-white"
const CELL = "flex size-10 shrink-0 items-center justify-center [&_svg]:size-[18px]"
/** A menu's trigger keeps the hover fill while its menu is open. */
const ROW_OPEN = "data-[state=open]:bg-neutral-950/[0.05] data-[state=open]:text-neutral-900 dark:data-[state=open]:bg-white/[0.07] dark:data-[state=open]:text-white"
/** The account row's hover intent before its menu opens, so a pointer passing down the rail does not pop it. */
const ACCOUNT_OPEN_DELAY_MS = 120

interface ProductRailState {
    /** Labels visible (hovered rail, the phone sheet). */
    expanded: boolean
    layout: "rail" | "sheet"
    /** Drawn in the collapsed sidebar's 64px icon rail: one 40px icon per control, its name in a tooltip. */
    compact?: boolean
    /** Tell the frame a popover or menu opened from the rail is open (true) or closed (false): it stays wide meanwhile. */
    onMenuOpenChange?: (open: boolean) => void
}

const ProductRailContext = React.createContext<ProductRailState>({ expanded: true, layout: "sheet" })

/** For an app's own rail row (Boli's Send feedback): whether labels show, the layout, and the keep-open hook. */
export function useProductRail(): ProductRailState {
    return React.useContext(ProductRailContext)
}

/**
 * One rail row as a button: `icon` in the 40px icon cell, `label` revealed with the rail. The whole row is the hit area.
 * Forwards its ref and props, so it can sit inside a Radix `...Trigger asChild`.
 */
export const RailRowButton = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button> & { icon: React.ReactNode; label: string }>(
    function RailRowButton({ icon, label: text, className, ...props }, ref) {
        const { expanded, layout, compact } = useProductRail()
        if (compact) return <CompactRailButton ref={ref} icon={icon} label={text} className={className} {...props} />
        return (
            <Button ref={ref} type="button" variant="ghost" aria-label={text} className={cn(ROW, ROW_IDLE, ROW_OPEN, className)} {...props}>
                <span className={CELL}>{icon}</span>
                <span aria-hidden className={label(expanded || layout === "sheet")}>{text}</span>
            </Button>
        )
    },
)

/* ── Compact (the collapsed sidebar's 64px icon rail) ───────────────────────────────────────────────────────────── */

const COMPACT_ITEM =
    "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl p-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400 [&_svg]:size-[18px]"

/** A 40px icon control in the compact rail: the soft pill when `active` (Sarvam), the row hover otherwise. */
export function compactRailItemClass(active = false) {
    return cn(COMPACT_ITEM, active ? ROW_ON : ROW_IDLE, ROW_OPEN)
}

/**
 * One 40px icon button in the compact rail with its name in a tooltip on the right. Forwards its ref and props, so it
 * can sit inside a Radix `...Trigger asChild` (a menu or popover opened from it).
 */
export const CompactRailButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<typeof Button> & { icon: React.ReactNode; label: string; hint?: string; active?: boolean }
>(function CompactRailButton({ icon, label: text, hint, active, className, ...props }, ref) {
    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <Button ref={ref} type="button" variant="ghost" aria-label={text} className={cn(compactRailItemClass(active), className)} {...props}>
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{hint ?? text}</TooltipContent>
        </Tooltip>
    )
})

const COMPACT_STATE: ProductRailState = { expanded: false, layout: "rail", compact: true }

/**
 * The foot of the collapsed sidebar's icon rail: everything account-wide from the product rail, so collapsing loses
 * nothing - a Products menu (switch product, or go to the overview), the app's credits (`footerTop`) and feedback
 * (`footerExtra`) drawn compact through `useProductRail().compact`, the bell with its unread dot, and the account menu.
 */
export function CompactRailFoot({ brand, products, activeProductId, productsLabel = "Products", account, notifications, footerTop, footerExtra }: {
    brand: ShellBrand
    products: ShellProduct[]
    activeProductId: string | null
    /** The switch menu's name. Default "Products"; apps/admin says "Modules". */
    productsLabel?: string
    account: ShellAccount
    notifications?: ShellNotifications
    footerTop?: React.ReactNode
    footerExtra?: React.ReactNode
}) {
    return (
        <ProductRailContext.Provider value={COMPACT_STATE}>
            <div className="flex shrink-0 flex-col items-center gap-1 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
                <ProductsMenu brand={brand} products={products} activeProductId={activeProductId} label={productsLabel} />
                {footerTop}
                {footerExtra}
                {notifications ? (
                    <CompactRailButton
                        onClick={notifications.onOpen}
                        label={notifications.unread > 0 ? `Notifications, ${notifications.unread} unread` : "Notifications"}
                        hint="Notifications"
                        icon={
                            <>
                                <Bell />
                                {notifications.unread > 0 ? (
                                    <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-neutral-900 ring-2 ring-white dark:bg-white dark:ring-[#121314]" />
                                ) : null}
                            </>
                        }
                    />
                ) : null}
                <AccountRow
                    account={account}
                    collapsed
                    openDelay={ACCOUNT_OPEN_DELAY_MS}
                    trigger={
                        <Button type="button" variant="ghost" aria-label={`Account - ${account.user.name}`} className={compactRailItemClass()}>
                            <UserAvatar user={account.user} />
                        </Button>
                    }
                />
            </div>
        </ProductRailContext.Provider>
    )
}

/** The compact rail's way to change product: a menu of the products (Later ones greyed) and the overview. */
function ProductsMenu({ brand, products, activeProductId, label: menuLabel }: { brand: ShellBrand; products: ShellProduct[]; activeProductId: string | null; label: string }) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <CompactRailButton icon={<LayoutGrid />} label={menuLabel} hint={menuLabel === "Products" ? "Switch product" : `Switch ${menuLabel.toLowerCase().replace(/s$/, "")}`} />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-60">
                <DropdownMenuLabel className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{menuLabel}</DropdownMenuLabel>
                {products.map((p) => {
                    const Icon = p.icon
                    const on = p.id === activeProductId
                    return (
                        <DropdownMenuItem key={p.id} asChild className={cn("cursor-pointer gap-2", p.soon && !on && "text-neutral-500 dark:text-neutral-500")}>
                            <AppLink href={p.href} aria-current={on ? "page" : undefined}>
                                <Icon className="size-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{p.label}</span>
                                {p.soon ? <SoonTag /> : null}
                                <span className="flex size-4 shrink-0 items-center justify-center">
                                    {on ? <Check aria-label="Open product" className="size-4" /> : null}
                                </span>
                            </AppLink>
                        </DropdownMenuItem>
                    )
                })}
                <DropdownMenuSeparator className="bg-neutral-950/[0.06] dark:bg-white/[0.07]" />
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <AppLink href={brand.href}>
                        <House className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{brand.name} home</span>
                    </AppLink>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** The person's photo, or their initials, in a 28px circle (the account row's icon cell). */
function UserAvatar({ user }: { user: ShellAccount["user"] }) {
    const letters = user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
    return (
        <Avatar className="size-7">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="text-xs font-medium">{letters}</AvatarFallback>
        </Avatar>
    )
}

function initial(name: string) {
    return name.trim()[0]?.toUpperCase() ?? "?"
}

export function ProductRail({
    brand, products, activeProductId, workspaces = [], onSwitchWorkspace, onCreateWorkspace, productsLabel = "Products", account,
    notifications, footerTop, footerExtra, expanded, layout = "rail", onNavigate, onMenuOpenChange, children,
}: ProductRailProps) {
    const sheet = layout === "sheet"
    const railState = React.useMemo<ProductRailState>(() => ({ expanded, layout, onMenuOpenChange }), [expanded, layout, onMenuOpenChange])
    const [accountOpen, setAccountOpenRaw] = React.useState(false)
    const accountOpenRef = React.useRef(false)
    // Only real changes reach the frame: it COUNTS open menus, and hover re-asserts "open" as the pointer moves.
    const setAccountOpen = React.useCallback((open: boolean) => {
        setAccountOpenRaw(open)
        if (accountOpenRef.current === open) return
        accountOpenRef.current = open
        onMenuOpenChange?.(open)
    }, [onMenuOpenChange])

    return (
        <ProductRailContext.Provider value={railState}>
        <div className={cn("flex h-full min-h-0 flex-col", sheet ? "w-full" : "w-[272px]")}>
            {/* The top (brand + workspace) never widens the rail on hover (`data-rail-no-hover`, product-shell.tsx). */}
            <div data-rail-no-hover="" className="flex shrink-0 flex-col">
            {/* Brand: the mark sits in the icon column; the name is revealed with the rail. */}
            <div className="flex h-14 shrink-0 items-center px-2">
                <AppLink
                    href={brand.href}
                    onClick={onNavigate}
                    aria-label={`${brand.name} - home`}
                    className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                >
                    <span className={CELL}>
                        {brand.mark ?? (
                            <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
                                {initial(brand.name)}
                            </span>
                        )}
                    </span>
                    <span className={cn(label(expanded || sheet), "text-sm font-semibold text-neutral-900 dark:text-white")}>{brand.name}</span>
                </AppLink>
            </div>

            {/* No workspaces (apps/admin) = no switcher. */}
            {workspaces.length > 0 && onSwitchWorkspace ? (
                <div className="shrink-0 px-2 pb-2">
                    <WorkspaceSwitcher
                        workspaces={workspaces}
                        onSwitch={onSwitchWorkspace}
                        onCreate={onCreateWorkspace}
                        expanded={expanded || sheet}
                        onOpenChange={onMenuOpenChange}
                    />
                </div>
            ) : null}
            </div>

            {sheet ? (
                <ProductGrid products={products} activeProductId={activeProductId} onNavigate={onNavigate} label={productsLabel} />
            ) : (
                <nav aria-label={productsLabel} className="flex min-h-0 flex-1 flex-col gap-0.5 px-2 pt-1">
                    {products.map((p) => (
                        <ProductLink key={p.id} product={p} active={p.id === activeProductId} expanded={expanded} onNavigate={onNavigate} />
                    ))}
                </nav>
            )}

            {sheet ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : null}

            {/* The foot: account-wide things (plan: "credits, Add credits, Billing, profile, bell, sign out"). */}
            <div className="flex shrink-0 flex-col gap-0.5 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
                {footerTop}
                {/* Feedback and Notifications share ONE row when the rail is open (owner, 2026-11-25: feedback first),
                    and stack as two icons in the collapsed 56px rail. The bell keeps its unread dot. */}
                <div className={cn("min-w-0", (expanded || sheet) && footerExtra ? "grid grid-cols-2 gap-0.5" : "flex flex-col gap-0.5")}>
                    {footerExtra}
                    {notifications ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={notifications.onOpen}
                            aria-label={notifications.unread > 0 ? `Notifications, ${notifications.unread} unread` : "Notifications"}
                            className={cn(ROW, ROW_IDLE)}
                        >
                            <span className={cn(CELL, "relative")}>
                                <Bell />
                                {notifications.unread > 0 ? (
                                    <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-neutral-900 ring-2 dark:bg-white ring-white dark:ring-[#121314]" />
                                ) : null}
                            </span>
                            <span className={label(expanded || sheet)}>Notifications</span>
                        </Button>
                    ) : null}
                </div>
                {/* The account: ONE row like dashboard.sarvam.ai (owner, 2026-11-25): open, the NAME ONLY and a chevron up;
                    in the closed 56px rail the avatar alone, so the column keeps an icon. Its menu opens JUST ABOVE the
                    row (owner: not to the side), on hover after a short intent delay (with a grace on leave so the
                    pointer can cross into it) and on a click or Enter. */}
                <AccountRow
                    account={account}
                    onNavigate={onNavigate}
                    menu={{ open: accountOpen, onOpenChange: setAccountOpen }}
                    openDelay={ACCOUNT_OPEN_DELAY_MS}
                    trigger={
                        <Button
                            type="button"
                            variant="ghost"
                            aria-label={`Account - ${account.user.name}`}
                            className={cn(ROW, ROW_IDLE, ROW_OPEN, "h-11", (expanded || sheet) && "pl-3")}
                        >
                            {expanded || sheet ? null : <span className={CELL}><UserAvatar user={account.user} /></span>}
                            <span aria-hidden className={cn(label(expanded || sheet), "text-sm font-medium text-neutral-900 dark:text-white")}>
                                {account.user.name}
                            </span>
                            <ChevronUp aria-hidden className={cn("size-4 shrink-0 text-neutral-500 transition-opacity", expanded || sheet ? "opacity-100" : "opacity-0")} />
                        </Button>
                    }
                />
            </div>
        </div>
        </ProductRailContext.Provider>
    )
}

function SoonTag({ className }: { className?: string }) {
    return (
        <span className={cn("shrink-0 rounded-full px-1.5 text-xs text-neutral-600 ring-1 ring-inset ring-neutral-200 dark:text-neutral-400 dark:ring-neutral-700", className)}>
            Later
        </span>
    )
}

function ProductLink({ product, active, expanded, onNavigate }: { product: ShellProduct; active: boolean; expanded: boolean; onNavigate?: () => void }) {
    const Icon = product.icon
    return (
        <AppLink
            href={product.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={product.soon ? `${product.label} - coming soon` : product.label}
            className={cn(ROW, active ? ROW_ON : ROW_IDLE, product.soon && !active && "text-neutral-400 dark:text-neutral-600")}
        >
            <span className={CELL}><Icon className="size-[18px]" /></span>
            <span className={label(expanded)}>{product.label}</span>
            {product.soon && expanded ? <SoonTag /> : null}
        </AppLink>
    )
}

/** The phone sheet's products: a compact grid, so the open product's pages keep the room. */
function ProductGrid({ products, activeProductId, onNavigate, label: gridLabel = "Products" }: { products: ShellProduct[]; activeProductId: string | null; onNavigate?: () => void; label?: string }) {
    return (
        <nav aria-label={gridLabel} className="grid shrink-0 grid-cols-3 gap-1.5 px-2 pb-2">
            {products.map((p) => {
                const Icon = p.icon
                const on = p.id === activeProductId
                return (
                    <AppLink
                        key={p.id}
                        href={p.href}
                        onClick={onNavigate}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                            "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400",
                            on ? ROW_ON : "text-neutral-700 hover:bg-neutral-950/[0.04] dark:text-neutral-300 dark:hover:bg-white/[0.05]",
                            p.soon && !on && "text-neutral-500 dark:text-neutral-500",
                        )}
                    >
                        <Icon className="size-[18px]" />
                        <span className="max-w-full truncate">{p.label}</span>
                        {p.soon ? <SoonTag /> : null}
                    </AppLink>
                )
            })}
        </nav>
    )
}

/**
 * The workspace switcher at the top of the rail: the current workspace's initial in the icon cell, its name and a
 * chevron revealed with the rail. Prop-driven; the app decides what switching does.
 */
export function WorkspaceSwitcher({ workspaces, onSwitch, onCreate, expanded, onOpenChange }: {
    workspaces: ShellWorkspace[]
    onSwitch: (id: string) => void
    /** Adds "Create workspace" at the foot of the menu; called once the menu has closed (so a dialog can take focus). */
    onCreate?: () => void
    expanded: boolean
    onOpenChange?: (open: boolean) => void
}) {
    const current = workspaces.find((w) => w.current) ?? workspaces[0]
    const name = current?.name ?? "Workspace"
    const createNext = React.useRef(false)
    return (
        <DropdownMenu modal={false} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Workspace - ${name}. Switch workspace`}
                    className={cn(ROW, ROW_IDLE, "border border-transparent", expanded && "border-neutral-950/[0.07] bg-neutral-950/[0.02] dark:border-white/[0.08] dark:bg-white/[0.03]")}
                >
                    <span className={CELL}>
                        <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
                            {initial(name)}
                        </span>
                    </span>
                    <span className={cn(label(expanded), "font-medium text-neutral-900 dark:text-white")}>{name}</span>
                    <ChevronsUpDown aria-hidden className={cn("size-3.5 shrink-0 text-neutral-500 transition-opacity", expanded ? "opacity-100" : "opacity-0")} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-64"
                onCloseAutoFocus={(e) => {
                    // "Create workspace" opens the app's dialog only after the menu has closed and let go of focus.
                    if (!createNext.current) return
                    createNext.current = false
                    e.preventDefault()
                    onCreate?.()
                }}
            >
                <DropdownMenuLabel className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Workspaces</DropdownMenuLabel>
                {workspaces.map((w) => (
                    <DropdownMenuItem key={w.id} className="cursor-pointer gap-2" onSelect={() => { if (!w.current) onSwitch(w.id) }}>
                        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                            {initial(w.name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{w.name}</span>
                        {w.detail ? <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{w.detail}</span> : null}
                        <span className="flex size-4 shrink-0 items-center justify-center">
                            {w.current ? <Check aria-label="Current workspace" className="size-4" /> : null}
                        </span>
                    </DropdownMenuItem>
                ))}
                {onCreate ? (
                    <>
                        <DropdownMenuSeparator className="bg-neutral-950/[0.06] dark:bg-white/[0.07]" />
                        <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => { createNext.current = true }}>
                            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                                <Plus className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">Create workspace</span>
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
