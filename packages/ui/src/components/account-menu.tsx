"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ArrowUpRight, Coins, LogOut, Moon, Sun, Volume2 } from "lucide-react"
import { cn } from "../lib/utils"
import { AppLink } from "./app-link"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"
import { Switch } from "./ui/switch"
import { startThemeTransition } from "./themeprovider"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { useSoundEnabled } from "./ui/sounds"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"

/**
 * The sidebar's account row as ONE chip that opens one menu (Niraj, 2026-11-23, after runable.com): who you are, the
 * credits box with its two buttons, the occasional things (help, appearance, sounds, settings, what's new), then Sign
 * out. It replaced rows of loose footer buttons - the rail keeps its room for navigation. Things used every hour
 * (notifications, the inbox, the assistant) stay as icon buttons beside the chip, passed in by the app.
 *
 * App-agnostic: the app passes the person, the credits and its own items; theme (next-themes) and sounds are built in.
 */
export interface AccountMenuItem {
    key: string
    label: string
    icon: React.ReactNode
    href?: string
    onSelect?: () => void
    /** A small pill on the right ("3 new", "Earn credits"). */
    badge?: string
    /** `href` opens in a new tab; the row shows an outward arrow. */
    external?: boolean
}

export interface AccountMenuAction {
    label: string
    href?: string
    onSelect?: () => void
}

export interface AccountMenuProps {
    name: string
    /** Under the name: the email, or the person's job. */
    subtitle?: string
    /** An avatar element (the app owns image signing). Falls back to the first letter. */
    avatar?: React.ReactNode
    credits?: {
        label: string
        /** "186 left", "2,400 of 5,000". Leave it out while loading rather than show 0. */
        value?: string
        secondary?: AccountMenuAction
        primary?: AccountMenuAction
    }
    items?: AccountMenuItem[]
    /** The theme row (Light / Dark, inline). On by default. */
    appearance?: boolean
    /** The notification-sounds switch. On by default. */
    sounds?: boolean
    onSignOut: () => void
    signingOut?: boolean
    /** Spread on the Sign out row (the app's sign-out prefetch). */
    signOutProps?: Omit<React.HTMLAttributes<HTMLElement>, "onSelect">
    /** Icon rail: the chip is the avatar alone and the menu opens to the right. */
    collapsed?: boolean
    /**
     * Your own trigger in place of the chip (apps/main's product rail: one full-width row, name over email). One element
     * that forwards its ref and props (a `Button`); the hover and press handlers are merged onto it.
     */
    trigger?: React.ReactElement
    /** Hover intent before the menu opens, in ms (0 = at once, the chip's behaviour). A press still opens it at once. */
    openDelay?: number
    /** Controlled open state - a hover rail stays out while its menu is open. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
}

export function AccountMenu({
    name,
    subtitle,
    avatar,
    credits,
    items = [],
    appearance = true,
    sounds = true,
    onSignOut,
    signingOut = false,
    signOutProps,
    collapsed = false,
    trigger,
    openDelay = 0,
    open,
    onOpenChange,
    className,
}: AccountMenuProps) {
    /*
     * Opens on HOVER as well as on a press (Niraj, 2026-11-23). A short grace on leave lets the pointer cross the gap
     * from the chip to the menu. Touch and keyboard
     * still open it with a press; only a mouse hovers.
     */
    const [own, setOwn] = React.useState(false)
    const isOpen = open ?? own
    const setOpen = React.useCallback((v: boolean) => {
        if (open === undefined) setOwn(v)
        onOpenChange?.(v)
    }, [open, onOpenChange])
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const openRef = React.useRef(isOpen)
    openRef.current = isOpen
    const hover = React.useMemo(() => ({
        onPointerEnter: (e: React.PointerEvent) => {
            if (e.pointerType !== "mouse") return
            if (timer.current) clearTimeout(timer.current)
            // Already open (the pointer came back from the menu) or no intent delay: open / keep open now.
            if (openRef.current || openDelay <= 0) { timer.current = null; setOpen(true); return }
            timer.current = setTimeout(() => { timer.current = null; setOpen(true) }, openDelay)
        },
        onPointerLeave: (e: React.PointerEvent) => {
            if (e.pointerType !== "mouse") return
            if (timer.current) clearTimeout(timer.current)
            timer.current = null
            // Left before the intent delay opened it: nothing to close.
            if (!openRef.current) return
            // The theme wipe (Light / Dark in this menu) covers the page with a snapshot for a moment: the pointer
            // "leaves" without moving. That is not someone leaving the menu (owner, 2026-11-25).
            if (document.documentElement.dataset.themeTransition) return
            timer.current = setTimeout(() => { timer.current = null; setOpen(false) }, 180)
        },
    }), [setOpen, openDelay])
    React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
    const face = avatar ?? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-white dark:bg-neutral-600">
            {name.trim()[0]?.toUpperCase() ?? "?"}
        </span>
    )
    return (
        <DropdownMenu modal={false} open={isOpen} onOpenChange={setOpen}>
            <DropdownMenuTrigger
                asChild
                {...hover}
                // Hover already opened it: a click on the chip must not toggle it shut again.
                onPointerDown={(e) => {
                    if (e.pointerType !== "mouse") return
                    // A press during the hover delay opens it now; the pending hover open is dropped.
                    if (timer.current) { clearTimeout(timer.current); timer.current = null }
                    if (isOpen) e.preventDefault()
                }}
            >
                {/* No focus ring (owner, 2026-11-25): focus returns to the chip when the menu closes, and Button's offset ring
                    drew a hard outline round it. Keyboard focus shows as the hover fill instead. */}
                {trigger ?? <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Account - ${name}`}
                    className={cn(
                        "h-10 min-w-0 gap-2 rounded-xl border border-neutral-950/[0.07] bg-neutral-950/[0.04] p-1 font-medium hover:bg-neutral-950/[0.07] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-neutral-950/[0.07] dark:focus-visible:bg-white/[0.08] data-[state=open]:bg-neutral-950/[0.08] dark:border-white/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:data-[state=open]:bg-white/[0.1]",
                        collapsed ? "w-10 justify-center" : "flex-1 justify-start pl-1.5 pr-3",
                        className,
                    )}
                >
                    <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full [&>*]:size-7">{face}</span>
                    {/* The first name on the chip (Niraj, 2026-11-23); the menu's header carries the full name. */}
                    {!collapsed ? <span className="truncate text-sm text-neutral-800 dark:text-neutral-100">{name.trim().split(/\s+/)[0] || name}</span> : null}
                </Button>}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side={collapsed ? "right" : "top"}
                align={collapsed ? "end" : "start"}
                sideOffset={8}
                // Opening ABOVE the row it is exactly the row's width, so it lines up with the sidebar (owner,
                // 2026-11-25); beside a collapsed rail it keeps its own width.
                className={collapsed ? "w-72" : "w-[var(--radix-dropdown-menu-trigger-width)] min-w-60"}
                {...hover}
            >
                <div className="flex items-center gap-3 px-2.5 pb-2 pt-1.5">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full [&>*]:size-10">{face}</span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{name}</span>
                        {subtitle ? <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</span> : null}
                    </span>
                </div>
                {credits ? <CreditsBox credits={credits} /> : null}
                <div className="mt-1.5 flex flex-col">
                    {items.map((it) => <Row key={it.key} item={it} />)}
                    {appearance ? <AppearanceRow /> : null}
                    {sounds ? <SoundsRow /> : null}
                </div>
                <DropdownMenuSeparator className="mx-2 my-1.5 bg-neutral-950/[0.06] dark:bg-white/[0.07]" />
                <DropdownMenuItem
                    {...signOutProps}
                    variant="destructive"
                    disabled={signingOut}
                    onSelect={(e) => { e.preventDefault(); onSignOut() }}
                >
                    {signingOut ? <Spinner className="size-4" /> : <LogOut />}
                    {signingOut ? "Signing out" : "Sign out"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function CreditsBox({ credits }: { credits: NonNullable<AccountMenuProps["credits"]> }) {
    /*
     * The two buttons ARE menu items (so the arrow keys reach them), styled on the item itself. They used to be a
     * Button inside an `asChild` item: the item's focus fill and grey text were concatenated onto the button rather than
     * merged, so hovering the dark "Get more" turned it transparent with black text and a focus outline (Niraj,
     * 2026-11-23). Every class here goes through the item's own cn(), so the button's colours win.
     */
    const btn = (a: AccountMenuAction, primary: boolean) => {
        const cls = cn(
            "h-9 min-h-9 min-w-0 flex-1 basis-0 justify-center whitespace-nowrap rounded-xl px-2 text-sm font-medium outline-none",
            primary
                ? "bg-neutral-900 text-neutral-50 focus:bg-neutral-700 focus:text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 dark:focus:bg-white dark:focus:text-neutral-900"
                : "border border-neutral-950/[0.08] bg-white text-neutral-800 focus:bg-neutral-100 focus:text-neutral-900 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-neutral-100 dark:focus:bg-white/[0.1] dark:focus:text-neutral-50",
        )
        return a.href ? (
            <DropdownMenuItem asChild className={cls}>
                <AppLink href={a.href}>{a.label}</AppLink>
            </DropdownMenuItem>
        ) : (
            <DropdownMenuItem className={cls} onSelect={a.onSelect}>{a.label}</DropdownMenuItem>
        )
    }
    return (
        <div className="rounded-xl bg-neutral-950/[0.035] p-3 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2.5 text-sm">
                <Coins aria-hidden className="size-4 text-neutral-500 dark:text-neutral-400" />
                <span className="flex-1 font-medium text-neutral-800 dark:text-neutral-100">{credits.label}</span>
                {credits.value ? <span className="tabular-nums text-neutral-700 dark:text-neutral-200">{credits.value}</span> : null}
            </div>
            {credits.primary || credits.secondary ? (
                <div className="mt-3 flex gap-2">
                    {credits.secondary ? btn(credits.secondary, false) : null}
                    {credits.primary ? btn(credits.primary, true) : null}
                </div>
            ) : null}
        </div>
    )
}

function Row({ item }: { item: AccountMenuItem }) {
    const inner = (
        <>
            {item.icon}
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge ? (
                <span className="rounded-full bg-neutral-950/[0.06] px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-200">
                    {item.badge}
                </span>
            ) : null}
            {item.external ? <ArrowUpRight aria-hidden className="text-neutral-400" /> : null}
        </>
    )
    if (item.href) {
        return (
            <DropdownMenuItem asChild>
                {item.external
                    ? <a href={item.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                    : <AppLink href={item.href}>{inner}</AppLink>}
            </DropdownMenuItem>
        )
    }
    return <DropdownMenuItem onSelect={item.onSelect}>{inner}</DropdownMenuItem>
}

const THEMES = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
] as const

/**
 * The theme as ONE row with Light and Dark side by side (owner, 2026-11-25): no sub-menu to open. The two halves are
 * menu items, so the arrow keys reach them; choosing one runs the same
 * wipe as the sidebar's ThemeSwitch, from the pressed button. "System" is gone from here: a press is an explicit choice,
 * and before one the active half follows the resolved theme.
 */
function AppearanceRow() {
    const { resolvedTheme, setTheme } = useTheme()
    const active = resolvedTheme === "dark" ? "dark" : "light"
    const Icon = active === "dark" ? Moon : Sun
    return (
        <div className="flex min-h-9 items-center gap-3 py-1 pl-3 pr-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">
            <Icon aria-hidden className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
            {/* "Theme", not "Appearance": the menu is the rail row's width, and the longer word truncated to "A..." beside the pill (owner, 2026-11-25). */}
            <span className="flex-1 whitespace-nowrap">Theme</span>
            <div role="group" aria-label="Theme" className="flex shrink-0 items-center gap-0.5 rounded-full bg-neutral-950/[0.05] p-0.5 dark:bg-white/[0.07]">
                {THEMES.map((t) => {
                    const on = active === t.value
                    return (
                        <DropdownMenuItem
                            key={t.value}
                            aria-checked={on}
                            role="menuitemradio"
                            onSelect={(e) => {
                                e.preventDefault()
                                if (on) return
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                startThemeTransition(() => setTheme(t.value), { x: r.left + r.width / 2, y: r.top + r.height / 2 })
                            }}
                            className={cn(
                                "min-h-7 h-7 gap-1 rounded-full px-1.5 py-0 text-xs [&_svg]:size-3.5",
                                on
                                    ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-neutral-950/[0.06] focus:bg-white dark:bg-neutral-700 dark:text-neutral-50 dark:ring-white/[0.08] dark:focus:bg-neutral-700 [&_svg]:text-neutral-900 dark:[&_svg]:text-neutral-50"
                                    : "text-neutral-500 focus:bg-neutral-950/[0.05] focus:text-neutral-900 dark:text-neutral-400 dark:focus:bg-white/[0.08] dark:focus:text-neutral-50",
                            )}
                        >
                            <t.icon aria-hidden />
                            {t.label}
                        </DropdownMenuItem>
                    )
                })}
            </div>
        </div>
    )
}

function SoundsRow() {
    const [on, setOn] = useSoundEnabled()
    return (
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOn(!on) }}>
            <Volume2 />
            <span className="flex-1">Sounds</span>
            <Switch checked={on} tabIndex={-1} aria-hidden className="pointer-events-none scale-90" />
        </DropdownMenuItem>
    )
}


/** A round 40px icon button beside the account chip (the assistant, the inbox, notifications), with a count and a tooltip. Pass `href` to make it a link. */
export function AccountMenuIcon({ label, active = false, count = 0, onClick, href, side = "top", children }: {
    label: string
    active?: boolean
    count?: number
    onClick?: () => void
    href?: string
    side?: "top" | "right"
    children: React.ReactNode
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    asChild={!!href}
                    onClick={onClick}
                    aria-label={label}
                    aria-pressed={active}
                    className={cn(
                        "relative size-10 shrink-0 rounded-xl p-0 text-neutral-600 [&_svg]:size-[18px] dark:text-neutral-300",
                        active
                            ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                            : "border border-neutral-950/[0.07] hover:bg-neutral-950/[0.05] dark:border-white/[0.08] dark:hover:bg-white/[0.07]",
                    )}
                >
                    {href ? <AppLink href={href}>{children}{badge(count)}</AppLink> : <>{children}{badge(count)}</>}
                </Button>
            </TooltipTrigger>
            <TooltipContent side={side} className="border-neutral-800 bg-neutral-900 text-white dark:bg-white dark:text-black">{label}</TooltipContent>
        </Tooltip>
    )
}

function badge(count: number) {
    return count > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold tabular-nums text-white">
                            {count > 9 ? "9+" : count}
                        </span>
    ) : null
}
