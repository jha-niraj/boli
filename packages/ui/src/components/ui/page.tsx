"use client"

import * as React from "react"
import { ArrowLeft, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { AppLink, markNavPending } from "../app-link"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { SplitButton } from "./split-button"
import { GrainCover, type GrainTone } from "./grain-cover"
import { ScrollArea } from "./scroll-area"
import { Skeleton } from "./skeleton"
import { Spinner } from "./spinner"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { Tabs, TabsList, TabsTrigger } from "./tabs"
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./dropdown-menu"

/**
 * THE page frame (the owner, 2026-10-26). Every page is the same three things: a header that never moves, a body that
 * scrolls under it, and a width the shell centres. One component so the rules hold by construction:
 *
 * - FIXED HEADER: the page is exactly `--app-page-h` tall (published by the app shell) and only the body scrolls. A
 *   column that is shorter than the shell's page (a module shell with a phone trigger bar or its own padding) publishes
 *   `--app-col-h` and the page takes that instead. A
 *   `sticky` header inside the shell's scroll was tried first and still moved - it travelled the shell's top inset
 *   before pinning and went with the page on a trackpad bounce.
 * - ONE ROW at every width. The left side (icon, title, badges, one line of description) truncates and never wraps.
 *   The right side holds whatever the page needs: tabs (named from `xl`, one dropdown below it), actions, and
 *   `extra` for a custom control such as a period picker. Actions fold by measured space: from `md` as many buttons
 *   as fit beside the title, the rest in one "More" menu; below `md` the primary as an icon plus "More". Never a
 *   second row (the owner, 2026-10-26: Curriculum's four link buttons wrapped to two rows).
 * - BACK: a detail page passes `back` and gets an arrow before the icon.
 * - WIDTH: the shell caps every page at max-w-7xl and centres it. `width="full"` lifts the cap for a page that needs
 *   the room (a wide editor, a board): the shell reads `data-page-width` off the page root.
 * - BODY: `scroll` (default) puts the children in a vertical ScrollArea. `fill` hands the page a bounded flex column
 *   for a page that scrolls its own panes (a split view, a list sized to the screen), so nothing double-scrolls.
 *   `page` is not bounded at all: the whole page, header included, scrolls in the shell like a document - for a
 *   dashboard such as Home (the owner, 2026-10-26: "home should scroll normally and should not be bound").
 * - COVER: a module's first page passes `cover` ({ light, dark } grain tones, the shape of main's `MODULE_COVERS`
 *   entries) and the same one row sits on a rounded grain band - the light tone with dark ink in light mode, the dark
 *   tone with white ink in dark mode. Decorative only (the AGENTS.md green carve-out): never on a form, a detail tab or
 *   a sub-page. `PageSkeleton` takes the same `cover`, so the loading screen paints the same band.
 * - LINK TABS: give every tab an `href` and the tabs navigate instead of switching in place - AppLink tabs from `xl`
 *   (intent prefetch, the active one from `tab`), and the dropdown below `xl` pushes the route (with markNavPending).
 *   `onTabChange` is not called then. All tabs have an `href` or none do: a mixed set is not supported and is treated
 *   as in-place tabs.
 * - PRINT: window.print prints the whole page - the root and the body lose their bound and the scroll viewport prints
 *   its full content; the tabs, the actions and the cover's grain are hidden (the title, description and `extra`
 *   stay). The app shell around the page must not clip in print either.
 */

export interface PageTab {
    value: string
    label: string
    icon?: React.ReactNode
    /** The tab is a route. Give it to every tab or to none (see LINK TABS above). */
    href?: string
}

/** A grain band behind the header. `dark` defaults to `light`. Pass main's `MODULE_COVERS[module]` as is. */
export interface PageCover {
    light: GrainTone
    dark?: GrainTone
    /** Slow drift of the colour layer; off under prefers-reduced-motion. */
    animate?: boolean
}

export interface PageAction {
    key: string
    label: string
    icon?: React.ReactNode
    onClick?: () => void
    href?: string
    /** The one action that stays on the row on a phone. At most one should set it. */
    primary?: boolean
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary"
    disabled?: boolean
    /** Shows a spinner and disables the action while its work is in flight. */
    pending?: boolean
    /** Marks the button `data-sheet-keep-open`, so pressing it while a non-modal sheet is open swaps the sheet
     *  instead of counting as an outside click that closes it. */
    keepSheetOpen?: boolean
    /** A hover hint, e.g. what an export contains. */
    title?: string
    /** `href` opens in a new tab (a live page, an outside site) rather than navigating the app. */
    external?: boolean
    /**
     * 2-4 ways to do this one action ("New note" -> blank / from a template / import): the button becomes a SplitButton
     * that opens them, and `onClick` / `href` are ignored. Folded into More, they list there.
     */
    options?: { key: string; label: string; icon?: React.ReactNode; onClick: () => void }[]
    /** Always the icon alone (a toggle beside the main action): the label goes into a tooltip and the accessible name. */
    iconOnly?: boolean
}

export interface PageProps {
    title: React.ReactNode
    /** A detail page's way back to its list. */
    back?: { href: string; label: string }
    /** One line under the title. Truncates; keep it short. */
    description?: React.ReactNode
    /** A leading icon, or a letter avatar, in the 36px box left of the title. */
    icon?: React.ReactNode
    /** Pills after the title. Hidden on a phone so the title keeps the room. */
    badges?: React.ReactNode
    tabs?: PageTab[]
    tab?: string
    onTabChange?: (value: string) => void
    actions?: PageAction[]
    /** A custom control on the right, before tabs and actions. Always shown; keep it compact. */
    extra?: React.ReactNode
    /** `reading`: header AND body in one centred max-w-3xl column - forms and settings-style pages. */
    width?: "default" | "full" | "reading"
    /**
     * Take the shell's whole page box: no shell padding, the full height, to the right edge (`data-page-bleed`). For a
     * workspace that lays out its own columns (the AI page with its right column). Implies `width="full"`; the page
     * pads its own header and panes.
     */
    bleed?: boolean
    body?: "scroll" | "fill" | "page"
    /** Draw the header on a grain cover - module first pages only. */
    cover?: PageCover
    /** The body's scroll viewport, e.g. to reset it. Tabs reset it on change already. */
    bodyRef?: React.Ref<HTMLDivElement>
    className?: string
    bodyClassName?: string
    children?: React.ReactNode
}

/** The header's left side never narrows past this: 6.5rem of title plus each 36px control and its 10px gap. */
const leftMinWidth = (back: boolean, icon: boolean) =>
    // With a back button the icon tile shows only from sm (see `iconBox`), so below sm it costs nothing.
    back && icon ? "min-w-[calc(6.5rem+46px)] sm:min-w-[calc(6.5rem+92px)]"
        : back || icon ? "min-w-[calc(6.5rem+46px)]"
            : "min-w-[6.5rem]"

/** The icon tile. On a phone a detail page's back button already marks the page, and the 46px the tile costs is what
 *  a section dropdown and two actions need to fit one row at 360px - so with `back` it shows only from sm. */
const iconBox = (cover: boolean, back: boolean) => cn(cover ? ICON_BOX_COVER : ICON_BOX, back && "hidden sm:flex")

const ICON_BOX = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 [&_svg]:size-4"
/** The icon box on a cover: a translucent tile, so the grain shows through instead of a grey square sitting on it. */
const ICON_BOX_COVER = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-sm font-semibold text-neutral-800 dark:bg-white/10 dark:text-white [&_svg]:size-4"
/** The description ink: neutral-600 is too faint on the grain, so a cover uses main's COVER_LINE tones. */
const LINE_INK = "text-neutral-600 dark:text-neutral-300"
const LINE_INK_COVER = "text-neutral-800 dark:text-neutral-200"
/** Skeleton bars on a cover: the grey bar reads as a hole in the grain, a translucent one as a control. */
const COVER_BAR = "bg-white/50 dark:bg-white/10"


/**
 * The column a page's header and body content sit in. The SHELL no longer pads (owner, 2026-11-23: the page area takes
 * all the space): a page pads itself, so its scroll area runs to the screen edges and only the content is inset.
 * `default` max-w-7xl, `reading` max-w-3xl, `full` no cap; a bleed page draws its own layout, so it gets none.
 */
function pageColumn(width: "default" | "full" | "reading", bleed: boolean): string {
    if (bleed) return ""
    return cn("mx-auto w-full px-4", width === "reading" ? "max-w-3xl" : width === "default" ? "max-w-7xl" : "")
}

/**
 * The grain band (main's CoverHeader, moved in): light tone in light mode, night tone in dark mode, and the header row
 * inside it. In print the grain is dropped and the band is plain - the cover is never printed.
 */
function CoverBand({ cover, children }: { cover: PageCover; children: React.ReactNode }) {
    const dark = cover.dark ?? cover.light
    const two = dark !== cover.light
    return (
        <div
            data-page-cover=""
            className="relative isolate min-w-0 shrink-0 overflow-hidden rounded-2xl px-4 py-4 text-neutral-900 sm:px-5 sm:py-5 dark:text-white print:overflow-visible print:rounded-none print:p-0"
        >
            <GrainCover tone={cover.light} animate={cover.animate} className={cn("absolute inset-0 -z-10 print:!hidden", two && "dark:hidden")} />
            {two && <GrainCover tone={dark} animate={cover.animate} className="absolute inset-0 -z-10 hidden dark:block print:!hidden" />}
            {children}
        </div>
    )
}

export function Page({
    title, back, description, icon, badges, tabs, tab, onTabChange, actions, extra,
    width = "default", bleed = false, body = "scroll", cover, bodyRef, className, bodyClassName, children,
}: PageProps) {
    const scroller = React.useRef<HTMLDivElement | null>(null)
    const setScroller = React.useCallback((node: HTMLDivElement | null) => {
        scroller.current = node
        if (typeof bodyRef === "function") bodyRef(node)
        else if (bodyRef) (bodyRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    }, [bodyRef])
    // A new tab starts at its top, not wherever the last one was scrolled to.
    React.useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [tab])

    const row = (
        <div data-page-header="" className="relative flex min-w-0 shrink-0 items-center justify-between gap-3">
            {/* The title TEXT keeps at least 6.5rem: at 360px a back button, an icon, the tabs dropdown and a labelled
                action used to squeeze it to nothing. The right side may shrink instead (the tabs dropdown gives way first). */}
            {/* An explicit minimum (back + icon + 6.5rem of title), not the content's: a truncating title would otherwise
                count its full text, and min-w-0 alone let the title shrink to nothing. So the right side is what shrinks. */}
            <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", leftMinWidth(!!back, !!icon))}>
                {back && (
                    <Button asChild size="sm" variant="ghost" className="h-9 w-9 shrink-0 px-0" aria-label={back.label}>
                        <AppLink href={back.href}><ArrowLeft className="h-4 w-4" /></AppLink>
                    </Button>
                )}
                {icon && <div className={iconBox(!!cover, !!back)}>{icon}</div>}
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <h1 data-page-title="" className="truncate text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
                        {badges && <div data-page-badges="" className="hidden shrink-0 items-center gap-1.5 sm:flex">{badges}</div>}
                    </div>
                    {description && <PageDescription onCover={!!cover}>{description}</PageDescription>}
                </div>
            </div>
            {(extra || tabs?.length || actions?.length) ? (
                <div className="flex min-w-0 shrink items-center gap-2">
                    {(extra || (tabs && tabs.length > 0)) && (
                        <div data-page-other="" className="flex min-w-0 shrink items-center gap-2">
                            {extra}
                            {tabs && tabs.length > 0 && <PageTabs tabs={tabs} tab={tab} onTabChange={onTabChange} />}
                        </div>
                    )}
                    {actions && actions.length > 0 && (
                        <PageActions actions={actions} />
                    )}
                </div>
            ) : null}
        </div>
    )
    const col = pageColumn(width, bleed)
    const header = <div className={cn(col, !bleed && "pt-3")}>{cover ? <CoverBand cover={cover}>{row}</CoverBand> : row}</div>

    // Print: every bound comes off (root, ScrollArea root and viewport - `!` beats the viewport's inline overflow) and
    // the scrollbars go, so the whole body prints instead of the one screen that was showing.
    const content = body === "scroll" ? (
        <ScrollArea
            orientation="vertical"
            className="min-h-0 min-w-0 flex-1 print:!h-auto print:!flex-none print:!overflow-visible print:[&>[data-orientation]]:!hidden"
            viewportClassName="print:!h-auto print:!overflow-visible"
            viewportRef={setScroller}
        >
            <div className={cn(col, "flex min-w-0 flex-col gap-4 pb-4", bodyClassName)}>{children}</div>
        </ScrollArea>
    ) : body === "page" ? (
        <div className={cn(col, "flex min-w-0 flex-col gap-4 pb-4", bodyClassName)}>{children}</div>
    ) : (
        <div className={cn(col, !bleed && "pb-3", "flex min-h-0 min-w-0 flex-1 flex-col gap-4 print:h-auto print:flex-none print:overflow-visible", bodyClassName)}>{children}</div>
    )

    const rootClass = cn(
        "flex w-full min-w-0 flex-col gap-3",
        body !== "page" && "h-[var(--app-col-h,var(--app-page-h))] overflow-hidden print:h-auto print:overflow-visible",
        className,
    )
    // Tabs wrap the whole page so a page's own TabsContent blocks in the body bind to the header's tabs.
    return tabs && tabs.length > 0 ? (
        <Tabs value={tab} onValueChange={onTabChange} className={rootClass} data-page-width={bleed ? "full" : width} data-page-bleed={bleed ? "" : undefined}>
            {header}
            {content}
        </Tabs>
    ) : (
        <div className={rootClass} data-page-width={bleed ? "full" : width} data-page-bleed={bleed ? "" : undefined}>
            {header}
            {content}
        </div>
    )
}

/**
 * One line, never wrapping (the owner, 2026-10-26: a four-line description pushed a phone header down by half a screen).
 * When the line is cut off, a small "..." button beside it opens the whole text in a popover - a popover, not a
 * tooltip, because a tooltip never opens on touch. Measured, so the button only shows when something is hidden.
 */
/**
 * A header's one-line description. Never wraps: when the text is cut, a "..." sits at the cut; hovering the line or
 * the "..." shows the full text in the shadcn Tooltip, and a tap (touch has no hover) opens it in a popover.
 * Exported so other header kits use the same piece (the owner, 2026-10-26: "on small screen we don't need to show the
 * whole description ... show on hover ... on tooltip from shadcn ... across all the pages").
 */
/**
 * `ink`: the text colour when the header picks its own (a cover dark enough for white text - Studio's shelves); it
 * replaces the line's and the "..." button's colour.
 */
export function PageDescription({ children, onCover, ink }: { children: React.ReactNode; onCover?: boolean; ink?: string }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [cut, setCut] = React.useState(false)
    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const check = () => setCut(el.scrollWidth > el.clientWidth + 1)
        check()
        const ro = new ResizeObserver(check)
        ro.observe(el)
        return () => ro.disconnect()
    }, [children])
    return (
        <div className="flex min-w-0 items-center gap-1">
            {/* In print the line is not cut: the whole text wraps, and the "..." button goes. */}
            <Tooltip delayDuration={250}>
                <TooltipTrigger asChild>
                    <div ref={ref} className={cn("min-w-0 truncate text-xs print:overflow-visible print:whitespace-normal", ink ?? (onCover ? LINE_INK_COVER : LINE_INK))}>{children}</div>
                </TooltipTrigger>
                {cut && <TooltipContent side="bottom" align="start" className="max-w-80 text-xs leading-relaxed">{children}</TooltipContent>}
            </Tooltip>
            {cut && (
                <Popover>
                    <Tooltip delayDuration={250}>
                        <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-label="Show the full description"
                            className={cn(
                                "relative inline-flex h-4 shrink-0 items-center rounded px-0.5 hover:text-neutral-900 after:absolute after:-inset-3 after:content-[''] dark:hover:text-white print:hidden",
                                ink ? cn(ink, "hover:bg-white/15") : onCover ? cn(LINE_INK_COVER, "hover:bg-white/50 dark:hover:bg-white/10") : cn(LINE_INK, "hover:bg-neutral-100 dark:hover:bg-neutral-800"),
                            )}
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                    </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-80 text-xs leading-relaxed">{children}</TooltipContent>
                    </Tooltip>
                    <PopoverContent side="bottom" align="start" className="w-72 max-w-[calc(100vw-2rem)] text-xs leading-relaxed text-neutral-700 dark:text-neutral-200">
                        {children}
                    </PopoverContent>
                </Popover>
            )}
        </div>
    )
}

function TabName({ def, compact }: { def: PageTab; compact?: boolean }) {
    // `compact` (the section dropdown's trigger): when the trigger is squeezed under 6rem - a phone header with a back
    // button, an icon and actions - the label hides and the tab's icon stays, instead of a cut-off first letter.
    // A tab without an icon keeps its truncated label.
    const label = compact && def.icon ? "hidden truncate @min-[6rem]:block" : "truncate"
    return <span className="inline-flex min-w-0 max-w-full items-center gap-2 [&_svg]:size-3.5 [&_svg]:shrink-0">{def.icon}<span className={label}>{def.label}</span></span>
}

/**
 * A link tab, drawn like a `TabsTrigger` in the `card`, `sm`, `fit` TabsList beside it (same height, padding, ink and
 * active fill). A plain link row, not a tablist: these are routes, so the active one is `aria-current="page"`.
 */
const LINK_ROW = "flex w-fit max-w-full gap-0.5 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900"
const LINK_TAB = "relative flex min-h-7 min-w-0 flex-none items-center justify-center rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const LINK_TAB_IDLE = "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
const LINK_TAB_ACTIVE = "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white"

/**
 * Named tabs from `xl`; below it one dropdown showing the open tab, so the header never breaks in two. When every tab
 * has an `href` they are routes: AppLinks from `xl`, and the dropdown pushes the route. Hidden in print.
 */
function PageTabs({ tabs, tab, onTabChange }: { tabs: PageTab[]; tab?: string; onTabChange?: (v: string) => void }) {
    const router = useRouter()
    const current = tabs.find((t) => t.value === tab) ?? tabs[0]
    const linked = tabs.every((t) => !!t.href)
    const choose = (v: string) => {
        if (!linked) { onTabChange?.(v); return }
        const href = tabs.find((t) => t.value === v)?.href
        if (!href || v === current?.value) return
        markNavPending(href)
        router.push(href)
    }
    return (
        <>
            {linked ? (
                <nav aria-label="Sections" className={cn(LINK_ROW, "hidden shrink-0 xl:flex print:!hidden")}>
                    {tabs.map((t) => {
                        const active = t.value === current?.value
                        return (
                            <AppLink
                                key={t.value}
                                href={t.href ?? ""}
                                aria-current={active ? "page" : undefined}
                                data-state={active ? "active" : "inactive"}
                                className={cn(LINK_TAB, active ? LINK_TAB_ACTIVE : LINK_TAB_IDLE)}
                            >
                                <span className="inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
                                    {t.icon != null && <span className="inline-flex shrink-0" aria-hidden>{t.icon}</span>}
                                    <span className="min-w-0 truncate leading-tight">{t.label}</span>
                                </span>
                            </AppLink>
                        )
                    })}
                </nav>
            ) : (
                <TabsList fit size="sm" className="hidden shrink-0 xl:flex print:!hidden">
                    {tabs.map((t) => <TabsTrigger key={t.value} value={t.value} icon={t.icon}>{t.label}</TabsTrigger>)}
                </TabsList>
            )}
            <Select value={current?.value} onValueChange={choose}>
                <SelectTrigger className="@container h-9 w-[132px] min-w-16 shrink text-sm sm:w-[160px] xl:hidden print:hidden [&>span]:min-w-0 [&>span]:truncate" aria-label="Section">
                    {current && <TabName def={current} compact />}
                </SelectTrigger>
                <SelectContent align="end">
                    {tabs.map((t) => <SelectItem key={t.value} value={t.value}><TabName def={t} /></SelectItem>)}
                </SelectContent>
            </Select>
        </>
    )
}

function ActionButton({ action, iconOnly }: { action: PageAction; iconOnly?: boolean }) {
    const variant = action.variant ?? (action.primary ? "default" : "outline")
    if (action.options?.length) {
        return (
            <SplitButton
                label={action.label}
                icon={action.icon}
                iconOnly={iconOnly}
                variant={action.primary ? "primary" : "secondary"}
                disabled={action.disabled || action.pending}
                options={action.options.map((o) => ({ label: o.label, icon: o.icon, onSelect: o.onClick }))}
            />
        )
    }
    if (action.iconOnly && action.icon && !action.href) {
        const keepIcon = action.keepSheetOpen ? { "data-sheet-keep-open": "" } : {}
        return (
            <Tooltip delayDuration={250}>
                <TooltipTrigger asChild>
                    <Button
                        size="sm"
                        variant={action.variant ?? "ghost"}
                        className="h-9 w-9 shrink-0 px-0 [&_svg]:size-4"
                        onClick={action.onClick}
                        disabled={action.disabled || action.pending}
                        aria-label={action.label}
                        {...keepIcon}
                    >
                        {action.pending ? <Spinner className="h-4 w-4" /> : action.icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{action.label}</TooltipContent>
            </Tooltip>
        )
    }
    const inner = (
        <>
            {action.pending ? <Spinner className="h-4 w-4" /> : action.icon}
            {iconOnly ? <span className="sr-only sm:not-sr-only">{action.label}</span> : action.label}
        </>
    )
    // iconOnly is "icon alone on a phone": from sm the label comes back.
    const cls = cn("h-9 shrink-0 gap-1.5 [&_svg]:size-4", iconOnly && "w-9 px-0 sm:w-auto sm:px-3")
    const disabled = action.disabled || action.pending
    const keep = action.keepSheetOpen ? { "data-sheet-keep-open": "" } : {}
    if (action.href && !disabled) {
        return (
            <Button asChild size="sm" variant={variant} className={cls} title={action.title} {...keep}>
                {action.external
                    ? <a href={action.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                    : <AppLink href={action.href}>{inner}</AppLink>}
            </Button>
        )
    }
    return (
        <Button size="sm" variant={variant} className={cls} onClick={action.onClick} disabled={disabled} title={action.title} {...keep}>
            {inner}
        </Button>
    )
}

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

/** The title keeps up to this much of its own width before action buttons start folding into "More". */
const TITLE_RESERVE = 320
const GAP = 8
const MORE_W = 36

type Fit = { phone: true } | { phone: false; inline: Set<string> }

/**
 * Header actions fold by SPACE, not by a fixed breakpoint (the owner, 2026-10-26: Home's six links sat behind a lone
 * "..." on a laptop with room for most of them). From `md` the row shows as many buttons as fit beside the title
 * (which keeps up to TITLE_RESERVE of its own width), the primary first, and only the rest go into one "More" menu.
 * Below `md` it is the primary as an icon plus "More" - never a second row. Measured from a hidden copy of the row
 * and re-measured whenever the header resizes; until the first measure it draws the phone form.
 *
 * The header, title, badges and other controls are found from the DOM (data-page-*), not from refs passed down: on
 * mount React runs this child's layout effect BEFORE it attaches the refs of the parent elements around it, so a
 * header ref was still null, the effect bailed out before watching anything, and the row stayed folded for good.
 */
function PageActions({ actions }: { actions: PageAction[] }) {
    const primary = actions.find((a) => a.primary) ?? (actions.length === 1 ? actions[0] : undefined)
    const measureRef = React.useRef<HTMLDivElement>(null)
    const [fit, setFit] = React.useState<Fit>({ phone: true })
    const keysSig = actions.map((a) => a.key + a.label).join("|")

    useIsoLayoutEffect(() => {
        const header = measureRef.current?.closest<HTMLElement>("[data-page-header]")
        if (!header) return
        const h1 = header.querySelector("h1")
        const badges = header.querySelector<HTMLElement>("[data-page-badges]")
        const otherEl = header.querySelector<HTMLElement>("[data-page-other]")
        const compute = () => {
            if (!window.matchMedia("(min-width: 768px)").matches) { setFit((f) => (f.phone ? f : { phone: true })); return }
            const hr = header.getBoundingClientRect()
            let leftNeed = 0
            if (h1) leftNeed = h1.getBoundingClientRect().left - hr.left + Math.min(h1.scrollWidth, TITLE_RESERVE)
            if (badges && badges.offsetWidth) leftNeed += badges.offsetWidth + GAP
            const other = otherEl?.offsetWidth ?? 0
            let avail = hr.width - leftNeed - 12 - (other ? other + GAP : 0)
            const widths = [...(measureRef.current?.children ?? [])].map((c) => (c as HTMLElement).offsetWidth)
            const total = widths.reduce((a, b) => a + b, 0) + GAP * Math.max(0, widths.length - 1)
            let inline: Set<string>
            if (total <= avail) inline = new Set(actions.map((a) => a.key))
            else {
                avail -= MORE_W + GAP
                const order = primary ? [primary, ...actions.filter((a) => a !== primary)] : actions
                inline = new Set()
                let used = 0
                for (const a of order) {
                    const w = (widths[actions.indexOf(a)] ?? 0) + (inline.size ? GAP : 0)
                    if (used + w > avail) break
                    inline.add(a.key)
                    used += w
                }
            }
            setFit((f) => (!f.phone && f.inline.size === inline.size && [...inline].every((k) => f.inline.has(k)) ? f : { phone: false, inline }))
        }
        compute()
        const ro = new ResizeObserver(compute)
        ro.observe(header)
        return () => ro.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keysSig])

    const shown = fit.phone ? actions.filter((a) => a === primary) : actions.filter((a) => fit.inline.has(a.key))
    const folded = actions.filter((a) => !shown.includes(a))
    return (
        <>
            {/* The hidden copy every width is read from: invisible, so it takes no clicks, focus or reading, and held
                in a 0x0 clipping box - laid out loose it counted as scrollable width and pushed a phone page sideways. */}
            <div aria-hidden className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden">
                <div ref={measureRef} className="flex w-max gap-2 whitespace-nowrap">
                    {actions.map((a) => <ActionButton key={a.key} action={a} />)}
                </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
                {shown.map((a) => <ActionButton key={a.key} action={a} iconOnly={fit.phone && !!a.icon} />)}
                {folded.length > 0 && <MoreMenu actions={folded} />}
            </div>
        </>
    )
}

function MoreMenu({ actions }: { actions: PageAction[] }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 w-9 shrink-0 px-0" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {actions.flatMap((a) => a.options?.length
                    ? a.options.map((o): PageAction => ({ key: `${a.key}-${o.key}`, label: o.label, icon: o.icon, onClick: o.onClick }))
                    : [a]).map((a, i) => (
                    <React.Fragment key={a.key}>
                        {i > 0 && a.variant === "destructive" && <DropdownMenuSeparator />}
                        {a.href ? (
                            <DropdownMenuItem asChild disabled={a.disabled || a.pending}>
                                {a.external
                                    ? <a href={a.href} target="_blank" rel="noopener noreferrer" className="gap-2 [&_svg]:size-4">{a.icon}{a.label}</a>
                                    : <AppLink href={a.href} className="gap-2 [&_svg]:size-4">{a.icon}{a.label}</AppLink>}
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                onClick={a.onClick}
                                disabled={a.disabled || a.pending}
                                className={cn("gap-2 [&_svg]:size-4", a.variant === "destructive" && "text-rose-700 dark:text-rose-300")}
                            >
                                {a.pending ? <Spinner className="h-4 w-4" /> : a.icon}{a.label}
                            </DropdownMenuItem>
                        )}
                    </React.Fragment>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/**
 * The action row's placeholder. The real row folds by measured space, which a skeleton cannot know, so this is the
 * likely shape: the phone form below md, up to three bars and a "More" square from md, every bar from 2xl.
 */
function ActionsSkeleton({ count, primary, bar }: { count: number; primary: boolean; bar?: string }) {
    const folds = count > 3
    return (
        <>
            <div className="flex items-center gap-2 md:hidden">
                {primary && <Skeleton className={cn("h-9 w-9 rounded-xl", bar)} />}
                {count > (primary ? 1 : 0) && <Skeleton className={cn("h-9 w-9 rounded-xl", bar)} />}
            </div>
            <div className={cn("hidden items-center gap-2 md:flex", folds && "2xl:hidden")}>
                {Array.from({ length: Math.min(count, 3) }).map((_, i) => <Skeleton key={i} className={cn("h-9 w-24 rounded-xl", bar)} />)}
                {folds && <Skeleton className={cn("h-9 w-9 rounded-xl", bar)} />}
            </div>
            {folds && (
                <div className="hidden items-center gap-2 2xl:flex">
                    {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={cn("h-9 w-24 rounded-xl", bar)} />)}
                </div>
            )}
        </>
    )
}

/**
 * The page frame while its data streams: the same header (pass the real title - it is static) and a body slot for the
 * page's own body skeleton. Right-side controls are drawn as bars of the right width so nothing moves on arrival.
 * Pass the page's `cover` too and the same grain band paints while it loads.
 */
export function PageSkeleton({
    title, back, description, icon, tabs, actions = 0, primaryAction = false, extra, width = "default", bleed = false, body = "scroll", cover, className, children,
}: {
    title?: React.ReactNode
    /** The page shows a back arrow. */
    back?: boolean
    /** The real line, or a grey bar when omitted (data). `false`: the page has no description, so no bar. */
    description?: React.ReactNode | false
    icon?: React.ReactNode
    /** Number of tabs the page will show, or 0. */
    tabs?: number
    /** Number of actions the page will show. */
    actions?: number
    /** One of them is primary (it stays on the collapsed row). */
    primaryAction?: boolean
    /** Width classes of the page's `extra` control, e.g. "w-[132px] sm:w-[148px]". */
    extra?: string
    /** `reading`: header AND body in one centred max-w-3xl column - forms and settings-style pages. */
    width?: "default" | "full" | "reading"
    /** Same as Page's `className` (e.g. header padding on a bleed page). */
    className?: string
    /** Same as Page's `bleed`. */
    bleed?: boolean
    body?: "scroll" | "fill" | "page"
    /** The page's cover, so the loading screen paints the same band. */
    cover?: PageCover
    children?: React.ReactNode
}) {
    const bar = cover ? COVER_BAR : undefined
    const row = (
        <div data-page-header="" className="flex min-w-0 shrink-0 items-center justify-between gap-3">
            <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", leftMinWidth(!!back, true))}>
                {back && <Skeleton className={cn("h-9 w-9 shrink-0 rounded-xl", bar)} />}
                {icon === false ? null : icon ? <div className={iconBox(!!cover, !!back)}>{icon}</div> : <Skeleton className={cn("h-9 w-9 shrink-0 rounded-xl", bar, back && "hidden sm:block")} />}
                <div className="min-w-0 space-y-1">
                    {title
                        ? <h1 data-page-title="" className="truncate text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
                        : <Skeleton data-page-title-bar="" className={cn("h-6 w-48 max-w-full rounded", bar)} />}
                    {description === false ? null : description
                        ? <div className={cn("truncate text-xs", cover ? LINE_INK_COVER : LINE_INK)}>{description}</div>
                        : <Skeleton className={cn("h-3.5 w-64 max-w-full rounded", bar)} />}
                </div>
            </div>
            <div className="flex min-w-0 shrink items-center gap-2">
                {extra && <Skeleton className={cn("h-9 shrink-0 rounded-md", extra, bar)} />}
                {!!tabs && (
                    <>
                        <Skeleton className={cn("hidden h-8 rounded-xl xl:block", bar)} style={{ width: tabs * 92 }} />
                        <Skeleton className={cn("h-9 w-[132px] rounded-md sm:w-[160px] xl:hidden", bar)} />
                    </>
                )}
                {actions > 0 && <ActionsSkeleton count={actions} primary={primaryAction || actions === 1} bar={bar} />}
            </div>
        </div>
    )
    return (
        <div className={cn("flex w-full min-w-0 flex-col gap-3", body !== "page" && "h-[var(--app-col-h,var(--app-page-h))] overflow-hidden", className)} data-page-width={bleed ? "full" : width} data-page-bleed={bleed ? "" : undefined} role="status" aria-busy="true">
            <div className={cn(pageColumn(width, bleed), !bleed && "pt-3")}>{cover ? <CoverBand cover={cover}>{row}</CoverBand> : row}</div>
            {body === "page"
                ? <div className={cn(pageColumn(width, bleed), "flex min-w-0 flex-col gap-4 pb-4")}>{children}</div>
                : body === "scroll"
                ? <div className={cn(pageColumn(width, bleed), "flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden")}>{children}</div>
                : <div className={cn(pageColumn(width, bleed), !bleed && "pb-3", "flex min-h-0 min-w-0 flex-1 flex-col gap-4")}>{children}</div>}
        </div>
    )
}
