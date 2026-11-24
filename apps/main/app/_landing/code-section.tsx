import { ArrowRight } from "lucide-react"
import { SITE } from "@repo/core/site"
import { AppLink } from "@repo/ui/components/app-link"
import { HighlightedCodeTabs } from "@/components/brand/code-tabs-server"
import { PillButton } from "@/components/brand/pill-button"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { buildSamples } from "@/lib/code-samples"
import { ROUTES } from "@/lib/navigation"

/** For developers: the same call in cURL, Python, TypeScript, JavaScript and Go, highlighted on the server. */
export function CodeSection() {
    const samples = buildSamples({ baseUrl: SITE.url })
    return (
        <Band id="api" labelledBy="api-title" innerClassName="grid items-center gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-14">
            <div className="min-w-0">
                <Kicker>For developers</Kicker>
                <SectionTitle>
                    <span id="api-title">Your OpenAI code, a new base URL</span>
                </SectionTitle>
                <Lead>Keep the SDK you know. Point it at Boli&apos;s /v1, set your key as BOLI_API_KEY, and ask in Romanized Nepali.</Lead>
                <div className="mt-8 flex flex-wrap gap-3">
                    <PillButton asChild>
                        <AppLink href={ROUTES.signUp}>
                            Get your API key <ArrowRight aria-hidden />
                        </AppLink>
                    </PillButton>
                    <PillButton asChild variant="secondary">
                        <AppLink href={ROUTES.doc("quickstart")}>Quickstart</AppLink>
                    </PillButton>
                </div>
            </div>
            <HighlightedCodeTabs samples={samples} className="min-w-0" />
        </Band>
    )
}
