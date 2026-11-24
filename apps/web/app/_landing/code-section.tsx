import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { HighlightedCodeTabs } from "@repo/brand/code-tabs-server"
import { PillButton } from "@repo/brand/pill-button"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { buildSamples } from "@repo/boli/code-samples"
import { ROUTES } from "@/lib/routes"
import { API_ORIGIN, SIGNUP_URL } from "@/lib/app-links"

/**
 * For developers: the same call in cURL, Python, TypeScript, JavaScript and Go, highlighted on the server. The code
 * panel has a FIXED height (owner, 2026-11-24) and scrolls both ways inside, so switching language never resizes the
 * section or moves the left column; the left column is centred against that fixed height.
 */
export function CodeSection() {
    const samples = buildSamples({ baseUrl: API_ORIGIN })
    return (
        <Band id="api" labelledBy="api-title" innerClassName="grid items-center gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-14">
            <div className="min-w-0">
                <Kicker>For developers</Kicker>
                <SectionTitle>
                    <span id="api-title">Your OpenAI code, a new base URL</span>
                </SectionTitle>
                <Lead>Keep the SDK you know. Point it at Boli&apos;s /v1, set your key as BOLI_API_KEY, and ask in Romanized Nepali.</Lead>
                <div data-reveal="3" className="mt-8 flex flex-wrap gap-3">
                    <PillButton asChild>
                        <a href={SIGNUP_URL}>
                            Get your API key <ArrowRight aria-hidden />
                        </a>
                    </PillButton>
                    <PillButton asChild variant="secondary">
                        <AppLink href={ROUTES.doc("quickstart")}>Quickstart</AppLink>
                    </PillButton>
                </div>
            </div>
            <div data-reveal="2" className="min-w-0">
                <HighlightedCodeTabs samples={samples} className="min-w-0" bodyViewportClassName="h-[19rem] sm:h-[24rem] lg:h-[26rem]" />
            </div>
        </Band>
    )
}
