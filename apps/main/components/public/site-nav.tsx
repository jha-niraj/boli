import { Suspense } from "react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { BoliLogo } from "@/components/brand/boli-logo"
import { getSession } from "@/lib/session"
import { ROUTES } from "@/lib/navigation"
import { PUBLIC_NAV } from "./links"
import { MobileMenu } from "./mobile-menu"

/**
 * The public header: logo, Kura / API / Pricing / Docs, then "Log in" (light pill) and "Get API key" (dark pill). A
 * signed-in visitor sees "Open Kura" instead. The session is read in its own Suspense boundary, so the header paints
 * at once with the signed-out pills and swaps when the cookie check returns.
 */
export function SiteNav() {
    return (
        <header className="sticky top-0 z-40 border-b border-boli-line/70 bg-boli-ground/85 backdrop-blur supports-[backdrop-filter]:bg-boli-ground/70">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <div className="flex items-center gap-8">
                    <AppLink href={ROUTES.landing} aria-label="Boli home" className="cursor-pointer rounded-lg text-base">
                        <BoliLogo />
                    </AppLink>
                    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
                        {PUBLIC_NAV.map((l) => (
                            <AppLink key={l.label} href={l.href} className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-boli-text transition-colors hover:bg-boli-sand hover:text-boli-ink">
                                {l.label}
                            </AppLink>
                        ))}
                    </nav>
                </div>
                <Suspense fallback={<NavActions signedIn={false} />}>
                    <SessionActions />
                </Suspense>
            </div>
        </header>
    )
}

async function SessionActions() {
    const session = await getSession()
    return <NavActions signedIn={!!session} />
}

function NavActions({ signedIn }: { signedIn: boolean }) {
    return (
        <div className="flex items-center gap-2">
            {signedIn ? null : (
                <Button asChild variant="outline" className="hidden h-9 border-boli-line bg-white px-4 text-boli-ink hover:bg-boli-sand sm:inline-flex">
                    <AppLink href={ROUTES.signIn}>Log in</AppLink>
                </Button>
            )}
            <Button asChild className="h-9 bg-boli-ink px-4 text-white hover:bg-boli-ink/90">
                <AppLink href={signedIn ? ROUTES.kura : ROUTES.signUp}>{signedIn ? "Open Kura" : "Get API key"}</AppLink>
            </Button>
            <MobileMenu signedIn={signedIn} />
        </div>
    )
}
