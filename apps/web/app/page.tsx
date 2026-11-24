import type { Metadata } from "next"
import { PublicShell } from "@/components/public/public-shell"
import { BRAND } from "@repo/boli"
import { CodeSection } from "./_landing/code-section"
import { CtaBand } from "./_landing/cta-band"
import { Faq } from "./_landing/faq"
import { Hero } from "./_landing/hero"
import { HowItWorks } from "./_landing/how-it-works"
import { Pricing } from "./_landing/pricing"
import { Products } from "./_landing/products"
import { Story } from "./_landing/story"
import { Who } from "./_landing/who"
import { JsonLd } from "@/components/json-ld"
import { FAQ } from "@/components/public/faq-section"
import { faqSchema, softwareApplicationSchemas } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

/**
 * The landing page in the approved story order (WF1, owner 2026-11-24): full-screen hero with the day valley -> PS1
 * story panels (why Boli) -> PC3 products -> code in five languages -> who it's for -> PS2 (how it works for a
 * developer) -> pricing packs -> FAQ2 -> CTA band -> the F5 footer. Light only. Server Components except the art
 * reveals, the product slices' motion, the custom amount, the FAQ accordion and the code tabs.
 */
export const metadata: Metadata = pageMeta({ title: `${BRAND.name} - ${BRAND.tagline}`, absoluteTitle: true, description: BRAND.description, path: "/" })

export default function LandingPage() {
    return (
        <PublicShell>
            <JsonLd data={[...softwareApplicationSchemas(), faqSchema(FAQ.map((f) => ({ q: f.q, a: typeof f.a === "string" ? f.a : "" })).filter((f) => f.a))]} />
            <Hero />
            <Story />
            <Products />
            <CodeSection />
            <Who />
            <HowItWorks />
            <Pricing />
            <Faq />
            <CtaBand />
        </PublicShell>
    )
}
