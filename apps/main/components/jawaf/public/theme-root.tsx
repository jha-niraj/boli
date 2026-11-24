import type { CSSProperties, ReactNode } from "react"
import type { JawafTheme } from "@repo/boli/jawaf"
import { cn } from "@repo/ui/lib/utils"

/**
 * The root of a Jawaf public page. The page belongs to the business, so it follows the BOT's theme, not the visitor's
 * Boli preference: app/providers.tsx keeps <html> light on /j, and this root adds `dark` itself (the app's dark variant
 * is `.dark *`). "system" is resolved by a tiny inline script before paint (no flash), then kept in step with the OS.
 *
 * The accent (the business's colour) is published as --jawaf-accent / --jawaf-accent-ink for the visitor's bubbles and
 * the primary buttons only; everything else stays neutral.
 */
export function JawafThemeRoot({ theme, accent, accentInk, children, className }: { theme: JawafTheme; accent: string; accentInk: string; children: ReactNode; className?: string }) {
    const style = { "--jawaf-accent": accent, "--jawaf-accent-ink": accentInk } as CSSProperties
    const script = `(function(){var r=document.getElementById("jawaf-root");if(!r)return;var m=window.matchMedia("(prefers-color-scheme: dark)");function s(){r.classList.toggle("dark",m.matches);r.style.colorScheme=m.matches?"dark":"light"}s();m.addEventListener&&m.addEventListener("change",s)})()`
    return (
        <div
            id="jawaf-root"
            suppressHydrationWarning
            style={{ ...style, colorScheme: theme === "dark" ? "dark" : "light" }}
            className={cn(
                theme === "dark" && "dark",
                "min-h-dvh bg-boli-ground font-sans text-neutral-900 antialiased dark:bg-[#121314] dark:text-neutral-100",
                className,
            )}
        >
            {theme === "system" ? <script dangerouslySetInnerHTML={{ __html: script }} /> : null}
            {children}
        </div>
    )
}
