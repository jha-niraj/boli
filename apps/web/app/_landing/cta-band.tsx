import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { PillButton } from "@repo/brand/pill-button"
import { SKY } from "@repo/brand/sky"
import { DISPLAY } from "@repo/brand/type"
import { WELCOME_CREDITS } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { SIGNUP_URL } from "@/lib/app-links"

/** The last ask before the footer: a soft sky wash, the free credits, Sign up and Talk to us. No crimson. */
export function CtaBand() {
    return (
        <section aria-labelledby="cta-title" className="border-t border-boli-line bg-boli-ground px-4 py-20 sm:px-6 sm:py-24 lg:px-10">
            <div
                data-reveal="0"
                className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-[32px] px-6 py-12 sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:gap-10 lg:px-14"
                style={{ background: `linear-gradient(120deg, ${SKY.wash}, ${SKY.soft})` }}
            >
                <div className="min-w-0">
                    <h2 id="cta-title" className="max-w-xl text-[40px] leading-[1.04] text-boli-ink sm:text-[52px] sm:leading-[1.02]" style={DISPLAY.h2}>
                        Start with {WELCOME_CREDITS} free credits
                    </h2>
                    <p className="mt-4 text-[15px] leading-7 text-boli-text">No card. Verify your email and make your first call in a minute.</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                    <PillButton asChild size="lg">
                        <a href={SIGNUP_URL}>
                            Sign up free <ArrowRight aria-hidden strokeWidth={1.75} />
                        </a>
                    </PillButton>
                    <PillButton asChild size="lg" variant="secondary">
                        <AppLink href={ROUTES.contact}>Talk to us</AppLink>
                    </PillButton>
                </div>
            </div>
        </section>
    )
}
