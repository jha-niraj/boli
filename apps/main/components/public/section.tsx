import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { DISPLAY } from "@/components/brand/type"
import { SKY_TEXT } from "./tokens"

/*
 * The rhythm every public section shares (WF1, approved 2026-11-24): a small sky kicker, a Fraunces Soft headline, an
 * optional lead line. Weights stay light (nothing above 500); sentence case; no uppercase eyebrows.
 */

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cn("font-sans text-sm font-[450] tracking-[0.01em]", SKY_TEXT, className)}>{children}</p>
}

export function SectionTitle({ children, className, as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" }) {
    return (
        <Tag className={cn("mt-3 max-w-3xl font-serif text-[40px] leading-[1.04] text-boli-ink sm:text-[56px] sm:leading-[1.02]", className)} style={DISPLAY.h2}>
            {children}
        </Tag>
    )
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cn("mt-5 max-w-2xl font-sans text-[15px] leading-7 text-boli-text", className)}>{children}</p>
}

/** A full-width band with the page's column inside. `tone` alternates the warm ground and white, as in WF1. */
export function Band({
    id,
    tone = "ground",
    className,
    innerClassName,
    children,
    labelledBy,
}: {
    id?: string
    tone?: "ground" | "white"
    className?: string
    innerClassName?: string
    children: ReactNode
    labelledBy?: string
}) {
    return (
        <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-20 border-t border-boli-line", tone === "white" ? "bg-white" : "bg-boli-ground", className)}>
            <div className={cn("mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-10 lg:py-32", innerClassName)}>{children}</div>
        </section>
    )
}
