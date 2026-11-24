import { BoliLogo } from "@repo/brand/boli-logo"
import { cn } from "@repo/ui/lib/utils"

/**
 * The console's lockup: Boli's logo (never redrawn) plus a small neutral "Admin" tag, so the team always knows which
 * app they are in. Used by the shell's rail and the sign-in / join frame. `size` is the logo's size in px.
 */
export function AdminLockup({ size = 19, className }: { size?: number; className?: string }) {
    return (
        <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
            <BoliLogo size={size} />
            <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 text-xs font-medium leading-none text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                Admin
            </span>
        </span>
    )
}
