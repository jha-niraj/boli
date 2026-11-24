import { ArtRoot } from "@repo/brand/art/art-root"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { StoryPanels } from "@/components/public/story-panels"

/** Right after the hero: why Boli exists, as the PS1 scroll panels (the gap -> models need running -> Boli runs them -> anyone builds). */
export function Story() {
    return (
        <Band id="why" labelledBy="why-title">
            <Kicker>Why Boli</Kicker>
            <SectionTitle className="max-w-3xl">
                <span id="why-title">AI that speaks the way Nepal types</span>
            </SectionTitle>
            <Lead>Romanized Nepali, English, both in one line - and until now, no open model you could simply call.</Lead>
            <ArtRoot>
                <StoryPanels className="mt-12 sm:mt-14" />
            </ArtRoot>
        </Band>
    )
}
