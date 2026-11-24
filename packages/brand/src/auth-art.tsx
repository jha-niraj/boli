import { ArtRoot } from "./art/art-root"
import { VALLEY_GOLD } from "./art/valley/palette"
import { ValleyHero } from "./art/valley/valley"
import type { ComponentPropsWithoutRef } from "react"
import { ArrowLeft } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { BRAND, WELCOME_CREDITS } from "@repo/boli"
import { BoliLogo } from "./boli-logo"
import { DhakaStrip } from "./dhaka-strip"
import { serif } from "./type"

/*
 * The pieces of the auth and onboarding frame (A1, approved 2026-11-24 with the owner's change: ART ON THE LEFT):
 * - left, from `lg`: the golden-hour valley (portrait crop) in an inset rounded panel with ONE line over its sky,
 * - right: the logo top-left, the form, a slim Dhaka band along the bottom edge,
 * - phone: the valley becomes a short band on top and the form takes the screen.
 * Calm on purpose - nothing else on the art. Light only (public pages).
 */

/** Classes for the left panel's box: a little over half the screen, inset so the art sits in a rounded frame. */
export const AUTH_PANEL_CLASS = "w-[52%] max-w-[60rem] p-3"

/** The left panel: the golden valley filling an inset rounded box, the one line set in Fraunces over the sky. */
export function AuthArtPanel() {
    return (
        <ArtRoot className="relative h-full overflow-hidden rounded-[20px]" style={{ background: VALLEY_GOLD.sky0 }}>
            <ValleyHero variant="gold" crop="portrait" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
            <p className="pointer-events-none absolute inset-x-0 top-14 px-8 text-center text-[32px] leading-tight text-boli-ink xl:top-16 xl:text-4xl" style={serif(380, 96, "-0.025em")}>
                {WELCOME_CREDITS} free credits.
                <br />
                Ask the way you talk.
            </p>
        </ArtRoot>
    )
}

/** Below `lg`: the same valley as a short band on top of the form (no words - the form says it). */
export function AuthArtBand() {
    return (
        <ArtRoot className="relative h-28 overflow-hidden sm:h-36" style={{ background: VALLEY_GOLD.sky0 }}>
            <ValleyHero variant="gold" crop="wide" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
        </ArtRoot>
    )
}

/**
 * A link home. The site lives on its own origin (apps/web), so the app passes an absolute URL: that one is a plain anchor
 * in the same tab (next/link cannot navigate across origins); a path on this origin stays an AppLink.
 */
function HomeLink({ href, ...rest }: Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string }) {
    if (/^https?:\/\//.test(href)) return <a href={href} {...rest} />
    return <AppLink href={href} {...rest} />
}

/** The logo at the top of the form column, linking home (`homeHref`: the public site's URL). */
export function AuthLogo({ homeHref = "/" }: { homeHref?: string }) {
    return (
        <HomeLink href={homeHref} aria-label={`${BRAND.name} home`} className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BoliLogo size={26} />
        </HomeLink>
    )
}

/** The top of the form column: the logo, and a plain Back to the site on the right (owner, 2026-11-24). */
export function AuthTop({ homeHref = "/" }: { homeHref?: string }) {
    return (
        <div className="flex w-full items-center justify-between gap-3">
            <AuthLogo homeHref={homeHref} />
            <HomeLink
                href={homeHref}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-neutral-700 outline-none transition-colors hover:bg-neutral-950/[0.05] hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Back
            </HomeLink>
        </div>
    )
}

/** The slim Dhaka band along the bottom of the form column. */
export function AuthDhaka() {
    return <DhakaStrip tone="sky" scale={2} />
}
