import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ArrowRight, Check } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { ValleyHero } from "@repo/brand/art/valley/valley"
import { KuraScene } from "@repo/brand/art/kura/kura-scene"
import { KURA_H, KURA_W } from "@repo/brand/art/kura/scene"
import { PixelVignette, vignetteAspect } from "@repo/brand/art/vignettes/vignette"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { PillButton } from "@repo/brand/pill-button"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { DISPLAY } from "@repo/brand/type"
import { BOLI_CHAT, KURA, WELCOME_CREDITS } from "@repo/boli"
import { JAWAF_LIMITS } from "@repo/boli/jawaf"
import { CtaBand } from "@/app/_landing/cta-band"
import { JsonLd } from "@/components/json-ld"
import { DhakaBand, ProductHero } from "@/components/public/product-hero"
import { DocSlice, SpeechSlice } from "@/components/public/product-slices"
import { JAWAF_PRICE_LINE } from "@/components/public/pricing"
import { Band, Kicker, Lead, revealStep, SectionTitle } from "@/components/public/section"
import { SKY_DECORATION, SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

/*
 * /products (owner, 2026-11-25): the index of what Boli makes. Two large cards - Kura (live) and Jawaf (in pilot) - each
 * with its pixel scene, a one-line promise, three bullets and a button to its own page (/kura, /jawaf). Kagaj and Swar
 * sit below, smaller and quieter, as "Later" with a link to the roadmap on About. The API is one line under the cards
 * (it has the Docs). Nothing here says Jawaf is live or has customers. Round 2 (owner, 2026-11-25): the full-screen
 * ProductHero with the day valley banner, and a Dhaka band between Today and Later, like the landing.
 */

const DESCRIPTION = `Kura, a chat in Nepali, Romanized Nepali and English, is live. Jawaf, answers for your customers from your own website and facts, is in pilot.`

export const metadata: Metadata = pageMeta({ title: "Products", description: DESCRIPTION, path: ROUTES.products })

type Main = {
    id: "kura" | "jawaf"
    name: string
    gloss: string
    stage: "Live" | "In pilot"
    promise: string
    bullets: readonly string[]
    cta: { label: string; href: string }
    art: ReactNode
    aspect: string
}

const MAIN: readonly Main[] = [
    {
        id: "kura",
        name: KURA.name,
        gloss: "कुरा - conversation",
        stage: "Live",
        promise: "Ask in the words you already use - Nepali, Romanized Nepali, English or all three in one line.",
        bullets: [
            "Replies in the script you wrote in, on Boli's own open model",
            "Think mode, settings, and your chats saved to come back to",
            `${WELCOME_CREDITS} free credits to start, then pay per use in rupees`,
        ],
        cta: { label: `See ${KURA.name}`, href: ROUTES.kura },
        art: <KuraScene className="block h-full w-full" />,
        aspect: `${KURA_W} / ${KURA_H}`,
    },
    {
        id: "jawaf",
        name: "Jawaf",
        gloss: "जवाफ - answer, for your business",
        stage: "In pilot",
        promise: "Answers your customers day and night, from your own website, files and prices - and says so when it does not know.",
        bullets: [
            `Learns your website (up to ${JAWAF_LIMITS.pagesPerBot} pages), your files and the facts you approve`,
            "A link and QR poster, a chat bubble for your website, or the API",
            `Planned price: ${JAWAF_PRICE_LINE}`,
        ],
        cta: { label: "See how Jawaf works", href: ROUTES.jawaf },
        art: <PixelVignette id="jawafCounter" className="block h-full w-full" />,
        aspect: vignetteAspect("jawafCounter"),
    },
]

const LATER = [
    {
        name: "Kagaj",
        gloss: "Images and PDFs to text and JSON",
        line: "Read scanned bills, forms and notices in Nepali, English or both, and get the text back - or the fields as JSON.",
        slice: <DocSlice />,
    },
    {
        name: "Swar",
        gloss: "Speech to text and text to speech",
        line: "Talk in Nepali and get text back; hear answers read aloud in a Nepali voice.",
        slice: <SpeechSlice />,
    },
] as const

export default function ProductsPage() {
    return (
        <>
            <JsonLd
                data={[
                    collectionPageSchema({
                        name: "Boli products",
                        description: DESCRIPTION,
                        path: ROUTES.products,
                        items: MAIN.map((m) => ({ name: m.name, path: m.cta.href })),
                    }),
                    breadcrumbSchema([{ name: "Products", path: ROUTES.products }]),
                ]}
            />
            <ProductHero
                id="products-hero"
                badge={
                    <>
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
                        <span className="truncate">
                            {KURA.name} live - Jawaf in pilot
                        </span>
                    </>
                }
                title={
                    <>
                        One open model, <span className={SKY_TEXT}>put to work</span>
                    </>
                }
                line={`Everything Boli makes runs on ${BOLI_CHAT.id}, our open model that reads the way Nepal types.`}
                actions={
                    <>
                        <PillButton asChild size="lg">
                            <AppLink href={ROUTES.kura}>
                                Meet {KURA.name} <ArrowRight aria-hidden strokeWidth={1.75} />
                            </AppLink>
                        </PillButton>
                        <PillButton asChild size="lg" variant="secondary" className="border-transparent">
                            <AppLink href={ROUTES.jawaf}>See Jawaf</AppLink>
                        </PillButton>
                    </>
                }
                art={<ValleyHero variant="day" crop="banner" preserve="xMidYMax slice" />}
                artAspect="240 / 70"
                phoneArt={<ValleyHero variant="day" crop="portrait" preserve="xMidYMax slice" />}
                phoneAspect="96 / 110"
            />

            <Band id="now" tone="white" labelledBy="now-title">
                <Kicker>Today</Kicker>
                <SectionTitle>
                    <span id="now-title">Two products, one for you and one for your business</span>
                </SectionTitle>
                <div className="mt-12 grid gap-3 sm:mt-14 lg:grid-cols-2">
                    {MAIN.map((m, i) => (
                        <article key={m.id} data-reveal={revealStep(i)} className="group/pc relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white">
                            <ArtRoot className="border-b border-boli-line">
                                <DhakaStrip tone="sky" scale={1.5} />
                                <div className={cn("relative w-full", SKY_SOFT_BG)} style={{ aspectRatio: m.aspect }}>
                                    <div className="absolute inset-0">{m.art}</div>
                                </div>
                            </ArtRoot>
                            <div className="flex flex-1 flex-col gap-3 p-6 sm:p-8">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h3 className="text-[40px] leading-[1.02] text-boli-ink sm:text-[44px]" style={DISPLAY.h2}>
                                        {m.name}
                                    </h3>
                                    <QuietBadge tone={m.stage === "Live" ? "live" : "outline"}>{m.stage}</QuietBadge>
                                </div>
                                <p className="font-sans text-xs text-boli-muted">{m.gloss}</p>
                                <p className="text-[22px] leading-snug text-boli-ink" style={DISPLAY.card}>
                                    {m.promise}
                                </p>
                                <ul className="mt-1 grid gap-2">
                                    {m.bullets.map((b) => (
                                        <li key={b} className="flex min-w-0 items-start gap-2.5 font-sans text-sm leading-6 text-boli-text">
                                            <Check aria-hidden strokeWidth={1.75} className={cn("mt-1 size-4 shrink-0", SKY_TEXT)} />
                                            <span className="min-w-0">{b}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto pt-4">
                                    <PillButton asChild>
                                        <AppLink href={m.cta.href}>
                                            {m.cta.label} <ArrowRight aria-hidden />
                                        </AppLink>
                                    </PillButton>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                <p data-reveal="2" className="mt-6 font-sans text-sm leading-6 text-boli-text">
                    Building your own app?{" "}
                    <AppLink href={ROUTES.doc("quickstart")} className={cn("cursor-pointer text-boli-ink underline decoration-1 underline-offset-4", SKY_DECORATION)}>
                        The same model is an OpenAI-compatible API
                    </AppLink>
                    , priced per token in rupees.
                </p>
            </Band>

            <DhakaBand />

            <Band id="later" labelledBy="later-title" className="border-t-0">
                <Kicker>Later</Kicker>
                <SectionTitle className="sm:text-[48px]">
                    <span id="later-title">On the roadmap</span>
                </SectionTitle>
                <Lead>Not built yet. We will say so here, and in the changelog, when they are.</Lead>
                <div className="mt-10 grid gap-3 md:grid-cols-2">
                    {LATER.map((l, i) => (
                        <article key={l.name} data-reveal={revealStep(i)} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white">
                            <DhakaStrip tone="tonal" scale={1} />
                            <div className="grid flex-1 gap-4 p-5 sm:p-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[28px] leading-tight text-boli-ink" style={DISPLAY.h3}>
                                        {l.name}
                                    </h3>
                                    <QuietBadge tone="neutral">Later</QuietBadge>
                                </div>
                                <p className="-mt-2 font-sans text-xs text-boli-muted">{l.gloss}</p>
                                <p className="font-sans text-sm leading-6 text-boli-text">{l.line}</p>
                                <div className="min-w-0 rounded-2xl bg-boli-sand p-4">
                                    <div className="opacity-85 saturate-[0.6]">{l.slice}</div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                <AppLink
                    href={ROUTES.aboutRoadmap}
                    className={cn("mt-6 inline-flex cursor-pointer items-center gap-1.5 font-sans text-sm font-[450] text-boli-ink underline decoration-1 underline-offset-4", SKY_DECORATION)}
                >
                    See the roadmap <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                </AppLink>
            </Band>

            <CtaBand />
        </>
    )
}
