import { PricingPacks } from "@/components/public/pricing-packs"
import { Band, Kicker, SectionTitle } from "@/components/public/section"
import { BOLI_CHAT } from "@repo/boli"

/** Pricing: the token prices from lib/boli.ts, then the credit packs, a custom amount and Enterprise. */
export function Pricing() {
    const p = BOLI_CHAT.pricePerMillion
    return (
        <Band id="pricing" tone="white" labelledBy="pricing-title">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                    <Kicker>Pricing</Kicker>
                    <SectionTitle>
                        <span id="pricing-title">Pay in rupees, only for what you use</span>
                    </SectionTitle>
                </div>
                <div className="grid gap-1 text-sm text-boli-text lg:text-right">
                    <p>
                        <span className="font-mono text-boli-ink">{BOLI_CHAT.id}</span> - Rs {p.input} per 1M input tokens, Rs {p.output} per 1M output
                    </p>
                    <p className="text-boli-muted">1 credit = Rs 1. Credits never expire. No subscription.</p>
                </div>
            </div>
            <div className="mt-12 sm:mt-14">
                <PricingPacks />
            </div>
        </Band>
    )
}
