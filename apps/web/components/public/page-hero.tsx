import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { DISPLAY } from "@repo/brand/type"
import { Kicker } from "./section"

/*
 * The hero every public page shares (owner, 2026-11-24): an editorial kicker, a Fraunces title, one line, and the
 * page's OWN pixel vignette in a framed card with a Dhaka edge. Shorter than the landing hero; light; on a phone the
 * art sits under the text. The title is the likely LCP element, so nothing here fades in (no `data-reveal`).
 */
export function PageHero({
    kicker,
    title,
    line,
    art,
    artAspect,
    children,
    inset = false,
    className,
}: {
    kicker: ReactNode
    title: ReactNode
    line: ReactNode
    /** The vignette (any pixel scene); it fills the frame. */
    art: ReactNode
    /** CSS aspect-ratio of the art, e.g. "96 / 60". */
    artAspect: string
    /** Actions or a small note under the line. */
    children?: ReactNode
    /** Inside a page that already has its own column (the docs): no band, no outer padding, the two columns from xl. */
    inset?: boolean
    className?: string
}) {
    return (
        <header className={cn(inset ? "border-b border-boli-line pb-10" : "border-b border-boli-line bg-boli-ground", className)}>
            <div
                className={cn(
                    "grid w-full items-center gap-10",
                    inset
                        ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-12"
                        : "mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:px-10 lg:pb-20 lg:pt-16",
                )}
            >
                <div className="min-w-0">
                    <Kicker reveal={false}>{kicker}</Kicker>
                    <h1
                        className={cn(
                            "mt-4 max-w-2xl text-[42px] leading-[1.02] text-boli-ink",
                            inset ? "sm:text-[52px] sm:leading-[1.0]" : "sm:text-[56px] sm:leading-[0.99] lg:text-[62px]",
                        )}
                        style={DISPLAY.display}
                    >
                        {title}
                    </h1>
                    <p className="mt-5 max-w-xl font-sans text-base leading-7 text-boli-text sm:text-lg sm:leading-8">{line}</p>
                    {children ? <div className="mt-7">{children}</div> : null}
                </div>
                <ArtRoot className="min-w-0 overflow-hidden rounded-3xl border border-boli-line bg-white shadow-[0_1px_2px_rgba(20,20,20,0.04),0_12px_32px_-18px_rgba(20,20,20,0.18)]">
                    <div className="relative w-full" style={{ aspectRatio: artAspect }}>
                        <div className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{art}</div>
                    </div>
                    <DhakaStrip tone="sky" scale={1.5} />
                </ArtRoot>
            </div>
        </header>
    )
}
