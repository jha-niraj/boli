import { ArrowRight } from "lucide-react"
import { Suspense } from "react"
import { AppLink } from "@repo/ui/components/app-link"
import { ArtRoot } from "@/components/art/art-root"
import { VALLEY_DAY } from "@/components/art/valley/palette"
import { ValleyHero } from "@/components/art/valley/valley"
import { PillButton } from "@/components/brand/pill-button"
import { DISPLAY } from "@/components/brand/type"
import { SKY_TEXT } from "@/components/public/tokens"
import { BRAND } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"

/*
 * The hero (WF1, approved 2026-11-24): the whole first screen. It slides up under the sticky nav (-mt-16) so nav and
 * hero read as one screen. The P1-V3 day valley fills the bottom - wide from sm up, the portrait crop on a phone - and
 * the ground above it is the valley's own top sky colour, so the two meet without a seam and the headline reads over
 * the sky like a title screen. The headline is the LCP: static, no fade-in, no client JS.
 */
export function Hero() {
    return (
        <section aria-labelledby="hero-title" className="relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden" style={{ background: VALLEY_DAY.sky0 }}>
            <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pt-[4.5rem] text-center sm:px-6 sm:pb-6 sm:pt-24">
                <p className="inline-flex h-7 max-w-full items-center gap-2 truncate rounded-full bg-white/80 px-3 text-xs text-boli-text">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span className="truncate">{BRAND.announcement}</span>
                </p>
                <h1 id="hero-title" className="mt-4 text-[52px] leading-[0.98] text-boli-ink sm:mt-5 sm:text-[68px] sm:leading-[0.95] lg:text-[80px]" style={DISPLAY.display}>
                    Open AI <span className={SKY_TEXT}>for Nepal</span>
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-boli-ink sm:mt-4 sm:text-lg sm:leading-8">
                    Ask the way you talk - English, Romanized Nepali or both. An OpenAI-compatible API, priced in rupees.
                </p>
                <Suspense fallback={<HeroActions signedIn={false} />}>
                    <SessionHeroActions />
                </Suspense>
            </div>
            {/* The valley sits UNDER the copy, never behind it: banner strip from sm up, portrait crop on a phone. */}
            {/* The banner keeps its whole shape (240:70 = the 240x78 scene minus eight rows of empty sky that match the
                hero ground). Extra height on a tall screen goes to the sky above the copy, never into cropping the art. */}
            <ArtRoot className="pointer-events-none relative hidden aspect-[240/70] w-full shrink-0 sm:block">
                <ValleyHero variant="day" crop="banner" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
            </ArtRoot>
            <ArtRoot className="pointer-events-none relative aspect-[96/110] w-full shrink-0 sm:hidden">
                <ValleyHero variant="day" crop="portrait" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
            </ArtRoot>
        </section>
    )
}

async function SessionHeroActions() {
    const session = await getSession()
    return <HeroActions signedIn={!!session} />
}

function HeroActions({ signedIn }: { signedIn: boolean }) {
    return (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6">
            <PillButton asChild size="lg">
                <AppLink href={signedIn ? ROUTES.kura : ROUTES.signUp}>
                    {signedIn ? "Open Kura" : "Sign up free"} <ArrowRight aria-hidden strokeWidth={1.75} />
                </AppLink>
            </PillButton>
            <PillButton asChild size="lg" variant="secondary" className="border-transparent">
                <AppLink href={ROUTES.doc("quickstart")}>Read the docs</AppLink>
            </PillButton>
        </div>
    )
}
