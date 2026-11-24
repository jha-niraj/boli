import type { Metadata } from "next"
import { pageMeta } from "@/lib/seo"
import { ArrowUpRight, Mail } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { ValleyHero } from "@repo/brand/art/valley/valley"
import { PixelVignette, vignetteAspect } from "@repo/brand/art/vignettes/vignette"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { DISPLAY } from "@repo/brand/type"
import { PageHero } from "@/components/public/page-hero"
import { Band } from "@/components/public/section"
import { SKY_DECORATION, SKY_TEXT } from "@/components/public/tokens"
import { BRAND } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { CONTACT_TOPICS, type ContactTopic } from "@/schemas/contact"
import { ContactForm } from "./_components/contact-form"

/*
 * Contact (round 4, owner 2026-11-24): its own page, moved out of About. Hero with the pasal-and-letter vignette, the
 * form (topic choices first; `?topic=Enterprise` preselects one), the public inbox, "Built in Kathmandu" with a small
 * valley, the reply time and links to the docs and the FAQ. No street address.
 */

export const metadata: Metadata = pageMeta({
    title: "Contact",
    description: `Write to ${BRAND.name} about the API, the Jawaf pilot, billing, Enterprise volumes, a partnership or the press. We reply within 1-2 working days.`,
    path: ROUTES.contact,
})

function isTopic(v: string | undefined): v is ContactTopic {
    return CONTACT_TOPICS.some((t) => t === v)
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const sp = await searchParams
    const raw = Array.isArray(sp.topic) ? sp.topic[0] : sp.topic
    const initialTopic = isTopic(raw) ? raw : undefined
    return (
        <>
            <PageHero
                kicker="Contact"
                title={
                    <>
                        Write to us. <span className={SKY_TEXT}>We read every message.</span>
                    </>
                }
                line="Questions about the API or billing, the Jawaf pilot for your business, Enterprise volumes, a partnership, a story - or just an idea for what Boli should do next."
                artAspect={vignetteAspect("contactPasal")}
                art={<PixelVignette id="contactPasal" />}
            />

            <Band id="write" labelledBy="write-title" className="border-t-0" innerClassName="grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-14 lg:py-20">
                <div className="min-w-0">
                    <h2 id="write-title" className="sr-only">
                        Send a message
                    </h2>
                    <ContactForm initialTopic={initialTopic} />
                </div>

                <aside aria-label="Other ways to reach us" className="grid content-start gap-3 font-sans">
                    <div data-reveal="0" className="rounded-3xl border border-boli-line bg-white p-6">
                        <p className="text-xs text-boli-muted">Email</p>
                        <a
                            href={`mailto:${BRAND.contactEmail}`}
                            className={cn("mt-1 inline-flex cursor-pointer items-center gap-2 break-all text-[22px] leading-tight text-boli-ink underline decoration-1 underline-offset-4", SKY_DECORATION)}
                            style={DISPLAY.card}
                        >
                            <Mail aria-hidden strokeWidth={1.5} className={cn("size-5 shrink-0", SKY_TEXT)} />
                            {BRAND.contactEmail}
                        </a>
                        <p className="mt-3 text-sm leading-6 text-boli-text">We reply within 1-2 working days. English, Nepali or both - write the way you type.</p>
                    </div>

                    <div data-reveal="1" className="overflow-hidden rounded-3xl border border-boli-line bg-white">
                        <ArtRoot>
                            <div className="relative w-full" style={{ aspectRatio: "240 / 78" }}>
                                <ValleyHero variant="day" crop="banner" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
                            </div>
                            <DhakaStrip tone="sky" scale={1} tile="slim" />
                        </ArtRoot>
                        <div className="p-6">
                            <p className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                Built in Kathmandu, Nepal
                            </p>
                            <p className="mt-2 text-sm leading-6 text-boli-text">A small team building open AI for the way Nepal types.</p>
                        </div>
                    </div>

                    <nav data-reveal="2" aria-label="Find an answer yourself" className="rounded-3xl border border-boli-line bg-white p-6">
                        <p className="text-xs text-boli-muted">Maybe answered already</p>
                        <ul className="mt-3 grid gap-1">
                            {(
                                [
                                    { label: "Read the docs", hint: "Quickstart, errors, models and limits", href: ROUTES.docs },
                                    { label: "See the FAQ", hint: "Credits, payments, limits and data", href: "/#faq" },
                                ] as const
                            ).map((l) => (
                                <li key={l.label}>
                                    <AppLink href={l.href} className="group -mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-2 py-2 hover:bg-boli-ground">
                                        <span className="min-w-0">
                                            <span className="block text-sm font-[450] text-boli-ink">{l.label}</span>
                                            <span className="block text-xs text-boli-muted">{l.hint}</span>
                                        </span>
                                        <ArrowUpRight
                                            aria-hidden
                                            strokeWidth={1.75}
                                            className="size-4 shrink-0 text-boli-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                                        />
                                    </AppLink>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
            </Band>
        </>
    )
}
