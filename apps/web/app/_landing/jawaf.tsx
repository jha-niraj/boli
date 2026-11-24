import type { LucideIcon } from "lucide-react"
import { ArrowRight, Globe, PhoneCall, QrCode, SquareTerminal } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelVignette, vignetteAspect } from "@repo/brand/art/vignettes/vignette"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { PillButton } from "@repo/brand/pill-button"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { DISPLAY } from "@repo/brand/type"
import { API_PATHS } from "@repo/boli"
import { Band, Kicker, Lead, revealStep, SectionTitle } from "@/components/public/section"
import { JAWAF_PRICE_LINE } from "@/components/public/pricing"
import { SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { APP_HOST } from "@/lib/app-links"
import { ROUTES } from "@/lib/routes"

/*
 * Jawaf on the landing (plan/main/jawaf/jawaf-v1.md, 2026-11-25): the business answer product, IN PILOT - nothing here
 * says it is live or has customers. The pasal scene (a customer asks at the QR stand, the counter answers) beside the
 * pitch, then the three ways in (link + QR, website widget, API) and the honesty promise. "Join the pilot" opens the
 * contact form with the Jawaf topic picked. The price line is read from @repo/boli/jawaf.
 */

const WAYS: readonly { icon: LucideIcon; title: string; line: string; detail: string }[] = [
    {
        icon: QrCode,
        title: "A link and a QR poster",
        line: "A page of your own that customers open without an app or a login. Print the QR poster for the counter - they can type or hold to speak.",
        detail: `${APP_HOST}/j/your-name`,
    },
    {
        icon: Globe,
        title: "A chat bubble on your website",
        line: "One script tag adds a chat bubble to your site. It answers from the same knowledge as your page.",
        detail: "One <script> tag - only on the sites you allow",
    },
    {
        icon: SquareTerminal,
        title: "The API",
        line: "Call your Jawaf from your own app with the same keys and SDKs - the chat completions endpoint you already know.",
        detail: `POST ${API_PATHS.chatCompletions}  model: "jawaf:your-name"`,
    },
]

export function Jawaf() {
    return (
        <Band id="jawaf" labelledBy="jawaf-title">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
                <div className="min-w-0">
                    <Kicker>Jawaf - for businesses</Kicker>
                    <SectionTitle>
                        <span id="jawaf-title">Answers for your customers, in the words they use</span>
                    </SectionTitle>
                    <Lead>
                        Give Jawaf your website, your files, your prices and the questions people always ask. It answers your customers in Nepali, Romanized
                        Nepali or English - whichever they wrote in - from what you gave it and nothing else.
                    </Lead>
                    <div data-reveal="3" className="mt-8 flex flex-wrap items-center gap-3">
                        <PillButton asChild size="lg">
                            <AppLink href={ROUTES.jawafPilot}>
                                Join the pilot <ArrowRight aria-hidden strokeWidth={1.75} />
                            </AppLink>
                        </PillButton>
                        <PillButton asChild size="lg" variant="secondary">
                            <AppLink href={ROUTES.jawaf}>See how Jawaf works</AppLink>
                        </PillButton>
                        <QuietBadge tone="outline">In pilot</QuietBadge>
                    </div>
                    <p data-reveal="3" className="mt-4 max-w-xl text-sm leading-6 text-boli-muted">
                        We are setting it up with a small group of businesses first. Planned price: {JAWAF_PRICE_LINE}, from the same credits as the rest of Boli.
                    </p>
                </div>
                <ArtRoot className="min-w-0 overflow-hidden rounded-3xl border border-boli-line bg-white">
                    <div data-reveal="1">
                        <DhakaStrip tone="sky" scale={1.5} />
                        <div className="relative w-full" style={{ aspectRatio: vignetteAspect("jawafCounter") }}>
                            <PixelVignette id="jawafCounter" className="absolute inset-0 block h-full w-full" />
                        </div>
                        <DhakaStrip tone="sky" scale={1} tile="slim" />
                    </div>
                </ArtRoot>
            </div>

            <div className="mt-12 sm:mt-14">
                <h3 data-reveal="0" className="text-2xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                    Three ways in, one set of answers
                </h3>
                <ul className="mt-5 grid gap-3 md:grid-cols-3">
                    {WAYS.map((w, i) => {
                        const Icon = w.icon
                        return (
                            <li key={w.title} data-reveal={revealStep(i)} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-boli-line bg-white p-5 sm:p-6">
                                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-boli-ground text-boli-ink ring-1 ring-boli-line">
                                    <Icon aria-hidden strokeWidth={1.6} className="size-[18px]" />
                                </span>
                                <p className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                    {w.title}
                                </p>
                                <p className="text-sm leading-6 text-boli-text">{w.line}</p>
                                <p className="mt-auto break-words rounded-xl bg-boli-ground px-3 py-2 font-mono text-xs leading-5 text-boli-ink">{w.detail}</p>
                            </li>
                        )
                    })}
                </ul>

                <div data-reveal="2" className={cn("mt-3 grid gap-4 rounded-3xl p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8", SKY_SOFT_BG)}>
                    <span className={cn("inline-flex size-12 items-center justify-center rounded-full bg-white", SKY_TEXT)}>
                        <PhoneCall aria-hidden strokeWidth={1.6} className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[26px] leading-tight text-boli-ink sm:text-[30px]" style={DISPLAY.h3}>
                            If it does not know, it says so and takes a number.
                        </p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-boli-text">
                            Jawaf never guesses. Prices come only from the facts you write down, and every answer shows where it came from. When the answer is not
                            there, it tells the customer plainly and asks for a name and a phone number, so you can call them back.
                        </p>
                    </div>
                </div>
            </div>
        </Band>
    )
}
