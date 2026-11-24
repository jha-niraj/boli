"use client"

import "./mega-menu.css"
import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import * as NavigationMenu from "@radix-ui/react-navigation-menu"
import { ChevronDown } from "lucide-react"

export type MegaMenuEntry = { id: string; label: string; panel: ReactNode }

/**
 * The desktop mega menu (md and up; Sarvam's pattern): four triggers, each opening ONE full-width panel under the nav
 * (Radix NavigationMenu - hover or focus opens, arrow keys move between triggers, Escape and a click outside close).
 * The panels arrive rendered on the server, art included, so no pixel art ships as client code. A chosen link closes
 * the menu (and a route change does, for links that keep the page, like /#pricing). The viewport hangs off the
 * sticky header, so the panel spans the full width while its inside keeps the page's column.
 */
export function MegaMenu({ menus }: { menus: readonly MegaMenuEntry[] }) {
    const [value, setValue] = useState("")
    const pathname = usePathname()
    useEffect(() => setValue(""), [pathname])

    const closeOnLink = (e: MouseEvent<HTMLElement>) => {
        if ((e.target as Element).closest("a")) setValue("")
    }

    return (
        <NavigationMenu.Root value={value} onValueChange={setValue} delayDuration={80} skipDelayDuration={400} aria-label="Main" className="hidden md:block">
            <NavigationMenu.List className="flex items-center gap-0.5">
                {menus.map((m) => (
                    <NavigationMenu.Item key={m.id} value={m.id}>
                        <NavigationMenu.Trigger className="group inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-2.5 text-sm lg:px-3 text-boli-text outline-none transition-colors hover:bg-boli-ink/[0.05] hover:text-boli-ink focus-visible:ring-2 focus-visible:ring-boli-sky/40 data-[state=open]:bg-boli-ink/[0.05] data-[state=open]:text-boli-ink">
                            {m.label}
                            <ChevronDown
                                aria-hidden
                                strokeWidth={1.75}
                                className="h-3.5 w-3.5 text-boli-muted transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                            />
                        </NavigationMenu.Trigger>
                        <NavigationMenu.Content onClick={closeOnLink} className="mega-content absolute inset-x-[var(--mega-side)] top-[var(--mega-top)]">
                            {m.panel}
                        </NavigationMenu.Content>
                    </NavigationMenu.Item>
                ))}
            </NavigationMenu.List>
            {/* A floating rounded card the width of the nav row (owner, 2026-11-24: not a full-bleed band), its edges under
                the logo and the Sign up button. The Viewport itself is transparent and starts just under the triggers (a
                bridge strip), so the pointer never leaves the menu on its way from a tab down to the card - Radix closes
                150ms after the pointer leaves both. The card look is on each panel (see Panel). */}
            <div className="pointer-events-none absolute inset-x-0 top-full">
                <div className="pointer-events-auto mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
                    <NavigationMenu.Viewport className="mega-viewport relative" />
                </div>
            </div>
        </NavigationMenu.Root>
    )
}
