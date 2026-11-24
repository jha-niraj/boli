import type { CSSProperties, ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/** Inline style that may also carry CSS custom properties (`--art-delay`, `--d`, ...). */
export type ArtStyle = CSSProperties & { [key: `--${string}`]: string | number | undefined }

/** A stable id usable inside `url(#...)` (React ids carry characters that are awkward in SVG references). */
export function svgId(raw: string, suffix: string): string {
    return `art-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}-${suffix}`
}

/** One option: the art in a framed box, then its code (what the owner says back), its name and where it would be used. */
export function ArtFrame({
    code,
    title,
    use,
    children,
    className,
    bodyClassName,
}: {
    code: string
    title: string
    use: string
    children: ReactNode
    className?: string
    bodyClassName?: string
}) {
    return (
        <figure className={cn("flex min-w-0 flex-col gap-3", className)}>
            <div className={cn("relative min-w-0 overflow-hidden rounded-2xl border border-boli-line bg-white", bodyClassName)}>{children}</div>
            <figcaption className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-full bg-boli-ink px-2.5 py-0.5 font-mono text-xs text-white">{code}</span>
                <span className="text-sm font-medium text-boli-ink">{title}</span>
                <span className="text-xs text-boli-muted">{use}</span>
            </figcaption>
        </figure>
    )
}
