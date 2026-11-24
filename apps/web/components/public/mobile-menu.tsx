"use client"

import { Fragment, useState } from "react"
import { ArrowRight, Menu, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { PillButton } from "@repo/brand/pill-button"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { NAV_GROUPS, navBadgeTone } from "./links"
import { SIGNIN_URL, SIGNUP_URL } from "@/lib/app-links"
import { SiteLink } from "@/components/site-link"

/**
 * The phone menu (below md): a dropdown under the menu button, not a sheet (owner, 2026-11-24), grouped like the mega
 * menu (Products, Developers, Resources, Company). Radix closes it on a tap outside, on Escape and when a link is
 * chosen. The list scrolls inside itself when the phone is short. The icon is drawn from state (menu / close).
 */
export function MobileMenu() {
    const [open, setOpen] = useState(false)
    return (
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} className="cursor-pointer text-boli-ink hover:bg-boli-ink/[0.05] md:hidden">
                    {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-boli-line bg-boli-ground p-0 font-sans shadow-lg">
                <ScrollArea orientation="vertical" viewportClassName="max-h-[min(34rem,calc(100dvh-7rem))]">
                    <div className="p-2">
                        {NAV_GROUPS.map((g, gi) => (
                            <Fragment key={g.id}>
                                {gi > 0 ? <DropdownMenuSeparator className="my-1.5 bg-boli-line" /> : null}
                                <DropdownMenuLabel className="px-3 pb-1 pt-2 text-xs font-normal text-boli-muted">{g.label}</DropdownMenuLabel>
                                {g.items.map((it) => {
                                    const Icon = it.icon
                                    const row = (
                                        <>
                                            <Icon className="h-4 w-4 shrink-0 text-boli-muted" strokeWidth={1.75} aria-hidden />
                                            <span className="min-w-0 flex-1">{it.label}</span>
                                            {it.badge ? (
                                                <QuietBadge tone={navBadgeTone(it.badge)} className="h-5 px-2">
                                                    {it.badge}
                                                </QuietBadge>
                                            ) : null}
                                        </>
                                    )
                                    return it.href ? (
                                        <DropdownMenuItem key={it.label} asChild className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-[15px] text-boli-ink">
                                            <SiteLink href={it.href}>{row}</SiteLink>
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem key={it.label} disabled className="gap-3 rounded-xl px-3 py-2.5 text-[15px] text-boli-ink">
                                            {row}
                                        </DropdownMenuItem>
                                    )
                                })}
                                {g.more ? (
                                    <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-[15px] text-boli-ink">
                                        <SiteLink href={g.more.href}>
                                            <ArrowRight className="h-4 w-4 shrink-0 text-boli-muted" strokeWidth={1.75} aria-hidden />
                                            <span className="min-w-0 flex-1">{g.more.label}</span>
                                        </SiteLink>
                                    </DropdownMenuItem>
                                ) : null}
                            </Fragment>
                        ))}
                        <DropdownMenuSeparator className="my-1.5 bg-boli-line" />
                        <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-2.5 text-[15px] text-boli-ink">
                            <a href={SIGNIN_URL}>Log in</a>
                        </DropdownMenuItem>
                        <div className="p-1 pt-2">
                            <PillButton asChild size="lg" className="w-full">
                                <a href={SIGNUP_URL} onClick={() => setOpen(false)}>
                                    Sign up free
                                </a>
                            </PillButton>
                        </div>
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
