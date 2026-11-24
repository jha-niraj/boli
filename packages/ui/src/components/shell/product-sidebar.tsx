"use client"

import * as React from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { usePathname } from "next/navigation"

import { AppLink } from "../app-link"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { activeHref, type ShellNavSection, type ShellSidebar } from "../../lib/shell"
import { cn } from "../../lib/utils"
import { CompactRailButton, compactRailItemClass } from "./product-rail"

/**
 * THE PRODUCT SIDEBAR's content: the open product's name and a collapse button, an optional `top` (a bot switcher, New
 * chat + search), the product's pages, and an optional `body` that fills the rest and scrolls itself (Kura's history).
 * With a `body` the page links stay put above it; without one they scroll. The frame (expanded / collapsed, shadow,
 * width) is product-shell.tsx's job; the phone sheet renders the same content. Collapsed, the frame draws
 * `CompactSidebar` instead (below).
 */
export function ProductSidebar({ sidebar, nav, onCollapse, onNavigate }: {
    sidebar: ShellSidebar
    nav: ShellNavSection[]
    /** The collapse button (desktop only; the phone sheet has its own close). */
    onCollapse?: () => void
    onNavigate?: () => void
}) {
    const items = nav.some((s) => s.items.length > 0)
    const list = items ? <SidebarNav nav={nav} onNavigate={onNavigate} /> : null
    return (
        <div className="flex h-full min-h-0 w-full flex-col">
            <div className="flex h-14 shrink-0 items-center gap-1 pl-4 pr-2">
                {sidebar.href ? (
                    <AppLink
                        href={sidebar.href}
                        onClick={onNavigate}
                        className="min-w-0 flex-1 cursor-pointer truncate rounded-md text-sm font-semibold text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-white"
                    >
                        {sidebar.title}
                    </AppLink>
                ) : (
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-white">{sidebar.title}</p>
                )}
                {onCollapse ? (
                    <Tooltip delayDuration={400}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={onCollapse}
                                aria-label="Collapse sidebar"
                                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                            >
                                <PanelLeftClose className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">Collapse sidebar (Ctrl/Cmd + \)</TooltipContent>
                    </Tooltip>
                ) : null}
            </div>

            {sidebar.top ? <div className="shrink-0 px-3 pb-2">{sidebar.top}</div> : null}

            {sidebar.body ? (
                <>
                    {list ? <div className="shrink-0 px-3 pb-2">{list}</div> : null}
                    <div className="flex min-h-0 flex-1 flex-col">{sidebar.body}</div>
                </>
            ) : (
                <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                    <div className="px-3 pb-3 pt-1">{list}</div>
                </ScrollArea>
            )}
        </div>
    )
}

/** The product's pages, in its labelled groups. Active is neutral: a subtle fill and full ink (no colour in chrome). */
export function SidebarNav({ nav, onNavigate }: { nav: ShellNavSection[]; onNavigate?: () => void }) {
    const pathname = usePathname() ?? "/"
    const active = activeHref(pathname, nav)
    return (
        <nav aria-label="Pages" className="flex flex-col gap-4">
            {nav.map((section) => (
                <div key={section.id} className="flex flex-col gap-0.5">
                    {section.label ? (
                        <p className="truncate px-2.5 pb-1 text-xs font-medium text-neutral-500">{section.label}</p>
                    ) : null}
                    {section.items.map((item) => {
                        const on = active === item.href
                        const Icon = item.icon
                        return (
                            <AppLink
                                key={item.href}
                                href={item.href}
                                onClick={onNavigate}
                                aria-current={on ? "page" : undefined}
                                className={cn(
                                    "flex h-9 min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400",
                                    on
                                        ? "bg-neutral-950/[0.05] font-medium text-neutral-900 dark:bg-white/[0.07] dark:text-white"
                                        : "text-neutral-600 hover:bg-neutral-950/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                {item.badge ? (
                                    <span className="shrink-0 rounded-full bg-neutral-200 px-1.5 text-xs font-medium tabular-nums text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                                        {item.badge > 99 ? "99+" : item.badge}
                                    </span>
                                ) : null}
                            </AppLink>
                        )
                    })}
                </div>
            ))}
        </nav>
    )
}

/**
 * THE COLLAPSED SIDEBAR (owner, 2026-11-25, dashboard.sarvam.ai): one 64px icon rail at the far left - the expand
 * button, the product's own compact controls (`sidebar.compact`: Kura's New chat + search, Jawaf's bot), the product's
 * pages as icons (name in a tooltip, the active one on a soft pill, the gaps between groups kept), and at the foot the
 * account-wide essentials (`foot`, CompactRailFoot from product-rail.tsx). No hover-peek: the button or Cmd/Ctrl + \
 * expands it.
 */
export function CompactSidebar({ sidebar, nav, onExpand, foot }: {
    sidebar: ShellSidebar
    nav: ShellNavSection[]
    onExpand: () => void
    foot?: React.ReactNode
}) {
    const items = nav.some((s) => s.items.length > 0)
    return (
        <div className="flex h-full min-h-0 w-full flex-col">
            <div className="flex h-14 shrink-0 items-center justify-center">
                <CompactRailButton icon={<PanelLeftOpen />} label="Expand sidebar" hint="Expand sidebar (Ctrl/Cmd + \)" onClick={onExpand} />
            </div>
            {sidebar.compact ? <div className="flex shrink-0 flex-col items-center gap-1 px-3 pb-2">{sidebar.compact}</div> : null}
            <ScrollArea orientation="vertical" className="min-h-0 flex-1">
                {items ? <div className="flex flex-col items-center px-3 pb-3 pt-1"><CompactNav nav={nav} /></div> : null}
            </ScrollArea>
            {foot}
        </div>
    )
}

/** The product's pages as 40px icons, group by group (a 16px gap between groups, as in the full sidebar). */
function CompactNav({ nav }: { nav: ShellNavSection[] }) {
    const pathname = usePathname() ?? "/"
    const active = activeHref(pathname, nav)
    return (
        <nav aria-label="Pages" className="flex flex-col items-center gap-4">
            {nav.map((section) => section.items.length ? (
                <div key={section.id} role="group" aria-label={section.label} className="flex flex-col items-center gap-1">
                    {section.items.map((item) => {
                        const on = active === item.href
                        const Icon = item.icon
                        return (
                            <Tooltip key={item.href} delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <AppLink
                                        href={item.href}
                                        aria-label={item.badge ? `${item.name}, ${item.badge}` : item.name}
                                        aria-current={on ? "page" : undefined}
                                        className={compactRailItemClass(on)}
                                    >
                                        <Icon className="size-[18px]" />
                                        {item.badge ? (
                                            <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-neutral-900 ring-2 ring-white dark:bg-white dark:ring-[#121314]" />
                                        ) : null}
                                    </AppLink>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">{item.name}</TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
            ) : null)}
        </nav>
    )
}
