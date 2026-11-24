import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

export type QuietBadgeTone = "neutral" | "outline" | "live" | "ink"

/**
 * A small pill label. Neutral sand by default; `live` adds a status dot (the dot is the datum, so it may carry colour);
 * `ink` is the inverted one for the rare thing that must stand out (a "New" on a nav item).
 */
export function QuietBadge({ tone = "neutral", children, className }: { tone?: QuietBadgeTone; children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-[450] tracking-[0.01em]",
                tone === "neutral" && "bg-boli-sand text-boli-text",
                tone === "outline" && "border border-boli-line bg-white text-boli-text",
                tone === "live" && "border border-boli-line bg-white text-boli-ink",
                tone === "ink" && "bg-boli-ink text-white",
                className,
            )}
        >
            {tone === "live" ? (
                <span className="relative flex size-1.5" aria-hidden>
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60 motion-reduce:animate-none" />
                    <span className="relative size-1.5 rounded-full bg-emerald-600" />
                </span>
            ) : null}
            {children}
        </span>
    )
}
