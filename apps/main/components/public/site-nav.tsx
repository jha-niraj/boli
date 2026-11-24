import { Suspense } from "react"
import { AppLink } from "@repo/ui/components/app-link"
import { BoliLogo } from "@/components/brand/boli-logo"
import { PillButton } from "@/components/brand/pill-button"
import { getSession } from "@/lib/session"
import { ROUTES } from "@/lib/navigation"
import { PUBLIC_NAV } from "./links"
import { MobileMenu } from "./mobile-menu"

/**
 * The public header (landing, About, Docs, legal): the logo, Kura / API / Pricing / Docs / About, then "Log in" (quiet
 * pill) and "Sign up free" (near-black pill). A signed-in visitor sees "Open Kura". Translucent white over a blur, so it
 * reads over the landing hero's sky as well as the warm ground. The session is read in its own Suspense boundary: the
 * header paints at once with the signed-out pills and swaps when the cookie check returns.
 */
export function SiteNav() {
    return (
        <header className="sticky top-0 z-40 border-b border-boli-ink/[0.06] bg-white/60 font-sans backdrop-blur-md supports-[backdrop-filter]:bg-white/50">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
                <div className="flex min-w-0 items-center gap-8">
                    <AppLink href={ROUTES.landing} aria-label="Boli home" className="cursor-pointer rounded-lg">
                        <BoliLogo size={22} />
                    </AppLink>
                    <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
                        {PUBLIC_NAV.map((l) => (
                            <AppLink
                                key={l.label}
                                href={l.href}
                                className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-boli-text transition-colors hover:bg-boli-ink/[0.05] hover:text-boli-ink"
                            >
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
        <div className="flex shrink-0 items-center gap-2">
            {signedIn ? null : (
                <PillButton asChild variant="ghost" size="sm" className="hidden h-9 sm:inline-flex">
                    <AppLink href={ROUTES.signIn}>Log in</AppLink>
                </PillButton>
            )}
            <PillButton asChild size="sm" className="h-9 px-4">
                <AppLink href={signedIn ? ROUTES.kura : ROUTES.signUp}>{signedIn ? "Open Kura" : "Sign up free"}</AppLink>
            </PillButton>
            <MobileMenu signedIn={signedIn} />
        </div>
    )
}
