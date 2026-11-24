"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu"
import { PillButton } from "@/components/brand/pill-button"
import { ROUTES } from "@/lib/navigation"
import { PUBLIC_NAV } from "./links"

/**
 * The phone menu (below md): a dropdown under the menu button, not a sheet (owner, 2026-11-24). Radix closes it on a
 * tap outside, on Escape and when a link is chosen. The icon is drawn from state (menu / close).
 */
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
    const [open, setOpen] = useState(false)
    return (
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} className="cursor-pointer text-boli-ink hover:bg-boli-ink/[0.05] md:hidden">
                    {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="w-[min(18rem,calc(100vw-2rem))] rounded-2xl border-boli-line bg-boli-ground p-2 font-sans shadow-lg">
                {PUBLIC_NAV.map((l) => (
                    <DropdownMenuItem key={l.label} asChild className="cursor-pointer rounded-xl px-3 py-2.5 text-base text-boli-ink">
                        <AppLink href={l.href}>{l.label}</AppLink>
                    </DropdownMenuItem>
                ))}
                {signedIn ? null : (
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-2.5 text-base text-boli-ink">
                        <AppLink href={ROUTES.signIn}>Log in</AppLink>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-2 bg-boli-line" />
                <div className="p-1">
                    <PillButton asChild size="lg" className="w-full">
                        <AppLink href={signedIn ? ROUTES.kura : ROUTES.signUp} onClick={() => setOpen(false)}>
                            {signedIn ? "Open Kura" : "Sign up free"}
                        </AppLink>
                    </PillButton>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
