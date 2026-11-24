import { DISPLAY } from "@repo/brand/type"
import type { JawafPublicBot } from "@/types/jawaf-public"

/** The business's logo, else its initial on its accent. Server or client (no art imports: keeps client bundles small). */
export function BusinessLogo({ bot, size = 64, className = "" }: { bot: Pick<JawafPublicBot, "logoHref" | "name">; size?: number; className?: string }) {
    if (bot.logoHref) {
        // eslint-disable-next-line @next/next/no-img-element -- an owner upload on R2 (any size); next/image would need its host configured
        return <img src={bot.logoHref} alt={`${bot.name} logo`} width={size} height={size} className={`shrink-0 rounded-2xl bg-white object-cover ${className}`} style={{ width: size, height: size }} />
    }
    return (
        <span
            aria-hidden
            className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-[var(--jawaf-accent)] text-[var(--jawaf-accent-ink)] ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.44), ...DISPLAY.card }}
        >
            {bot.name.trim().charAt(0).toUpperCase() || "J"}
        </span>
    )
}
