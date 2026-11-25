import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/**
 * The Homes' sky header (owner, 2026-11-25): a soft circular glow of the sky accent behind the page header, fading
 * into the page ground. Decoration only - behind everything, never under text it could hurt (the glow is faint
 * enough for neutral-600 text on top). The page AND its skeleton both wrap in it, so nothing jumps.
 */
export function SkyGlow({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("relative isolate min-w-0", className)}>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden">
                <div className="absolute left-1/2 top-[-14rem] size-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-boli-sky)_22%,transparent)_0%,transparent_62%)] dark:bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-boli-sky-dark)_14%,transparent)_0%,transparent_62%)]" />
                <div className="absolute left-[12%] top-[-10rem] size-[26rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-boli-sky-pale)_55%,transparent)_0%,transparent_65%)] dark:hidden" />
            </div>
            {children}
        </div>
    )
}
