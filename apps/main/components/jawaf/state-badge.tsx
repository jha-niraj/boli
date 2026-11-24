import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/**
 * A small neutral pill naming a state ("Approved", "Draft", "Included", "New"). Words carry the state; only the dot
 * may carry colour (sky = good / live, amber = needs you, red = failed). Light and dark (QuietBadge is light only).
 */
export function StateBadge({ children, dot, className }: { children: ReactNode; dot?: "sky" | "amber" | "red" | "neutral"; className?: string }) {
    return (
        <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300", className)}>
            {dot ? (
                <span
                    aria-hidden
                    className={cn(
                        "size-1.5 rounded-full",
                        dot === "sky" && "bg-boli-sky dark:bg-boli-sky-dark",
                        dot === "amber" && "bg-amber-500",
                        dot === "red" && "bg-red-600 dark:bg-red-400",
                        dot === "neutral" && "bg-neutral-400",
                    )}
                />
            ) : null}
            {children}
        </span>
    )
}
