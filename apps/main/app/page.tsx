import type { Metadata } from "next"
import { PublicShell } from "@/components/public/public-shell"
import { BRAND } from "@/lib/boli"
import { Announcement } from "./_landing/announcement"
import { CodeSection } from "./_landing/code-section"
import { CtaBand } from "./_landing/cta-band"
import { Faq } from "./_landing/faq"
import { Features } from "./_landing/features"
import { Gap } from "./_landing/gap"
import { Hero } from "./_landing/hero"
import { KuraPreview } from "./_landing/kura-preview"
import { Pricing } from "./_landing/pricing"

/**
 * The landing page, in the owner's story order (plan Q16): hero -> the gap -> what Boli does -> live code -> Kura
 * preview -> pricing -> FAQ -> CTA band -> footer. Server Components throughout; the only client code is the code tabs,
 * the FAQ accordion and the phone menu.
 */
export const metadata: Metadata = {
    title: { absolute: `${BRAND.name} - ${BRAND.tagline}` },
    description: BRAND.description,
    alternates: { canonical: "/" },
}

export default function LandingPage() {
    return (
        <PublicShell top={<Announcement />}>
            <Hero />
            <Gap />
            <Features />
            <CodeSection />
            <KuraPreview />
            <Pricing />
            <Faq />
            <CtaBand />
        </PublicShell>
    )
}
