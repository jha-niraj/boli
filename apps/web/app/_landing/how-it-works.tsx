import { ArtRoot } from "@repo/brand/art/art-root"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { StepsPanels } from "@/components/public/steps-panels"

/** PS2, later on the page with its own story: how Boli works for a developer, sign-up to rupees. */
export function HowItWorks() {
    return (
        <Band id="how" tone="white" labelledBy="how-title">
            <Kicker>How it works</Kicker>
            <SectionTitle>
                <span id="how-title">From sign-up to your first answer in a minute</span>
            </SectionTitle>
            <Lead>Four steps for a developer, from your email to your first answer and your first rupee.</Lead>
            <ArtRoot>
                <StepsPanels className="mt-12 sm:mt-14" />
            </ArtRoot>
        </Band>
    )
}
