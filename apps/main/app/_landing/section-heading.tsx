import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/** Eyebrow + Instrument Serif h2 + lead paragraph, the rhythm every landing section uses. */
export function SectionHeading({ eyebrow, title, children, className, center }: { eyebrow: string; title: ReactNode; children?: ReactNode; className?: string; center?: boolean }) {
    return (
        <div className={cn("max-w-2xl", center && "mx-auto text-center", className)}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-boli-crimson-ink">{eyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.08] tracking-tight text-boli-ink sm:text-5xl">{title}</h2>
            {children ? <div className="mt-5 text-base leading-7 text-boli-text">{children}</div> : null}
        </div>
    )
}
