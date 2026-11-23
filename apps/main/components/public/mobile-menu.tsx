"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { BoliLogo } from "@/components/brand/boli-logo"
import { BRAND } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { PUBLIC_NAV } from "./links"

/** The phone menu (below md): the same links as the header in a right sheet, plus Log in when signed out. */
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button type="button" variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)} className="text-boli-ink hover:bg-boli-sand md:hidden">
                <Menu className="h-5 w-5" />
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" resizable={false} className="w-[85vw] max-w-sm bg-boli-ground">
                    <SheetHeader>
                        <SheetTitle>
                            <BoliLogo />
                        </SheetTitle>
                        <SheetDescription>{BRAND.tagline}</SheetDescription>
                    </SheetHeader>
                    <nav aria-label="Menu" className="mt-2 flex flex-col px-4">
                        {PUBLIC_NAV.map((l) => (
                            <AppLink key={l.label} href={l.href} onClick={() => setOpen(false)} className="cursor-pointer border-b border-boli-line py-3 text-base text-boli-ink">
                                {l.label}
                            </AppLink>
                        ))}
                        {signedIn ? null : (
                            <AppLink href={ROUTES.signIn} onClick={() => setOpen(false)} className="cursor-pointer border-b border-boli-line py-3 text-base text-boli-ink">
                                Log in
                            </AppLink>
                        )}
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    )
}
