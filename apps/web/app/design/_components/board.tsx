import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/** The option code as a small ink tag (L5, T2, C1). */
export function CodeTag({ code, className }: { code: string; className?: string }) {
    return (
        <span className={cn("inline-flex h-6 min-w-9 items-center justify-center rounded-full bg-boli-ink px-2 font-mono text-xs text-white", className)}>
            {code}
        </span>
    )
}

/** A small muted caption over a frame. */
export function FrameLabel({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cn("text-xs tracking-[0.01em] text-boli-muted", className)}>{children}</p>
}
