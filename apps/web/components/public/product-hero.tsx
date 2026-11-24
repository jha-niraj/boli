import type { ReactNode } from "react"
import { ArtRoot } from "@repo/brand/art/art-root"
import { VALLEY_DAY } from "@repo/brand/art/valley/palette"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { DISPLAY } from "@repo/brand/type"

/*
 * The full-screen hero for landing-type pages (/jawaf, /kura, /products - owner, 2026-11-25: "the hero section should
 * be full screen like the landing page hero"). The landing hero's composition: it slides up under the sticky nav
 * (-mt-16) and fills the first screen; a small pill badge, the Fraunces display headline, one line, the actions; a wide
 * pixel scene along the bottom from sm up (a phone crop below sm) and a Dhaka band on the bottom edge. The ground is the
 * scene's own top sky colour with a soft light glow behind the copy, so copy and art meet without a seam. The headline
 * is the LCP: static, no fade-in, no client JS.
 */
export function ProductHero({
    id,
    badge,
    title,
    line,
    actions,
    note,
    art,
    artAspect,
    phoneArt,
    phoneAspect,
}: {
    id: string
    /** A short status pill above the headline ("In pilot - we set it up with you"). */
    badge: ReactNode
    title: ReactNode
    line: ReactNode
    actions: ReactNode
    /** One small line under the actions. */
    note?: ReactNode
    /** The wide scene (sm and up), filling its box; `artAspect` is its CSS aspect-ratio ("200 / 60"). */
    art: ReactNode
    artAspect: string
    /** The phone crop (below sm). */
    phoneArt: ReactNode
    phoneAspect: string
}) {
    const glow = `radial-gradient(ellipse 60% 50% at 50% 34%, ${VALLEY_DAY.sky3} 0%, ${VALLEY_DAY.sky2} 30%, transparent 72%), ${VALLEY_DAY.sky0}`
    return (
        <section aria-labelledby={`${id}-title`} className="relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden" style={{ background: glow }}>
            <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pb-8 pt-24 text-center sm:px-6 sm:pt-28">
                <div className="inline-flex h-7 max-w-full items-center gap-2 truncate rounded-full bg-white/80 px-3 text-xs text-boli-text">{badge}</div>
                <h1 id={`${id}-title`} className="mt-4 text-[48px] leading-[0.98] text-boli-ink sm:mt-5 sm:text-[68px] sm:leading-[0.95] lg:text-[80px]" style={DISPLAY.display}>
                    {title}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-boli-ink sm:text-lg sm:leading-8">{line}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
                {note ? <p className="mt-4 text-sm text-boli-ink/75">{note}</p> : null}
            </div>
            <ArtRoot className="pointer-events-none relative hidden w-full shrink-0 sm:block" style={{ aspectRatio: artAspect }}>
                <div className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{art}</div>
            </ArtRoot>
            <ArtRoot className="pointer-events-none relative w-full shrink-0 sm:hidden" style={{ aspectRatio: phoneAspect }}>
                <div className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{phoneArt}</div>
            </ArtRoot>
            <DhakaStrip tone="sky" scale={2} />
        </section>
    )
}

/** A Dhaka band between two big sections, like the border of a topi. */
export function DhakaBand() {
    return (
        <ArtRoot className="border-t border-boli-line">
            <DhakaStrip tone="sky" scale={1.5} />
        </ArtRoot>
    )
}
