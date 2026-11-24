import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { PillButton } from "@repo/brand/pill-button"
import { SKY } from "@repo/brand/sky"
import { DISPLAY } from "@repo/brand/type"
import { WELCOME_CREDITS } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { SIGNUP_URL } from "@/lib/app-links"
import { SiteLink } from "@/components/site-link"

type CtaLink = { label: string; href: string }

/**
 * The last ask before the footer: a soft sky wash, the free credits, Sign up and Talk to us. No crimson. A product page
 * passes its own title, line and two links (an app URL from lib/app-links.ts or a site path - SiteLink picks the tag),
 * optionally `children` under the line (the /jawaf pilot's three points) and the band's `tone` to keep the rhythm.
 */
export function CtaBand({
    title = `Start with ${WELCOME_CREDITS} free credits`,
    line = "No card. Verify your email and make your first call in a minute.",
    primary = { label: "Sign up free", href: SIGNUP_URL },
    secondary = { label: "Talk to us", href: ROUTES.contact },
    tone = "ground",
    id = "cta",
    children,
}: {
    title?: string
    line?: string
    primary?: CtaLink
    secondary?: CtaLink
    tone?: "ground" | "white"
    id?: string
    children?: ReactNode
}) {
    return (
        <section id={id === "cta" ? undefined : id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-20 border-t border-boli-line px-4 py-20 sm:px-6 sm:py-24 lg:px-10", tone === "white" ? "bg-white" : "bg-boli-ground")}>
            <div
                data-reveal="0"
                className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-[32px] px-6 py-12 sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:gap-10 lg:px-14"
                style={{ background: `linear-gradient(120deg, ${SKY.wash}, ${SKY.soft})` }}
            >
                <div className="min-w-0">
                    <h2 id={`${id}-title`} className="max-w-xl text-[40px] leading-[1.04] text-boli-ink sm:text-[52px] sm:leading-[1.02]" style={DISPLAY.h2}>
                        {title}
                    </h2>
                    <p className="mt-4 max-w-xl text-[15px] leading-7 text-boli-text">{line}</p>
                    {children}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                    <PillButton asChild size="lg">
                        <SiteLink href={primary.href}>
                            {primary.label} <ArrowRight aria-hidden strokeWidth={1.75} />
                        </SiteLink>
                    </PillButton>
                    <PillButton asChild size="lg" variant="secondary">
                        <SiteLink href={secondary.href}>{secondary.label}</SiteLink>
                    </PillButton>
                </div>
            </div>
        </section>
    )
}
