import { ArtRoot } from "@/components/art/art-root"
import type { VignetteId } from "@/components/art/vignettes/scenes"
import { PixelVignette, vignetteAspect } from "@/components/art/vignettes/vignette"
import { DhakaStrip } from "@/components/brand/dhaka-strip"
import { DISPLAY } from "@/components/brand/type"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { SKY_TEXT } from "@/components/public/tokens"
import { WELCOME_CREDITS } from "@/lib/boli"

/*
 * Who it's for (round 4, owner 2026-11-24): four pixel portraits in Dhaka frames. Each person stands in a small scene
 * of their own, says one line in their own words (Romanized Nepali and English, the way they would type it), and the
 * card closes with the one-line value. The Dhaka band runs along the top and the bottom of each picture, like the
 * border of a topi.
 */

const WHO: readonly { id: VignetteId; title: string; quote: string; gloss: string; line: string }[] = [
    {
        id: "whoDeveloper",
        title: "Developers",
        quote: "API key liyera ek din mai feature ship garen.",
        gloss: "Took a key, shipped the feature the same day.",
        line: "Swap the base URL in the OpenAI SDK and ship a Nepali feature today.",
    },
    {
        id: "whoStudent",
        title: "Students",
        quote: "Project ko lagi free credits le pugyo.",
        gloss: "The free credits were enough for my project.",
        line: `${WELCOME_CREDITS} free credits go a long way on a small open model.`,
    },
    {
        id: "whoStartup",
        title: "Startups",
        quote: "Rupees ma budget banauna sajilo bhayo.",
        gloss: "Budgeting in rupees got easy.",
        line: "Rupee pricing you can put in a budget, and no closed model underneath.",
    },
    {
        id: "whoShop",
        title: "Shops and teams",
        quote: "Customer le jasari lekhchha, tei bhashama jawaf.",
        gloss: "We answer in the language the customer wrote in.",
        line: "Answer customers in the language they wrote in - Romanized, Devanagari or mixed.",
    },
]

export function Who() {
    return (
        <Band id="who" tone="white" labelledBy="who-title">
            <Kicker>Who it&apos;s for</Kicker>
            <SectionTitle>
                <span id="who-title">Built for people building in Nepal</span>
            </SectionTitle>
            <Lead>Four kinds of people we built Boli for, in their own words.</Lead>
            <ul className="mt-12 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
                {WHO.map((w, i) => (
                    <li key={w.id} data-reveal={String(i)} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-boli-ground">
                        <ArtRoot className="bg-white">
                            <DhakaStrip tone="sky" scale={1.5} />
                            <div className="relative w-full" style={{ aspectRatio: vignetteAspect(w.id) }}>
                                <PixelVignette id={w.id} className="absolute inset-0 block h-full w-full" />
                            </div>
                            <DhakaStrip tone="sky" scale={1} tile="slim" />
                        </ArtRoot>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                            <h3 className="text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                                {w.title}
                            </h3>
                            <figure className="grid gap-1">
                                <blockquote className="text-[17px] leading-snug text-boli-ink" style={DISPLAY.card}>
                                    <span aria-hidden className={SKY_TEXT}>
                                        &ldquo;
                                    </span>
                                    {w.quote}
                                    <span aria-hidden className={SKY_TEXT}>
                                        &rdquo;
                                    </span>
                                </blockquote>
                                <figcaption className="text-xs text-boli-muted">{w.gloss}</figcaption>
                            </figure>
                            <p className="mt-auto border-t border-boli-line pt-3 text-sm leading-6 text-boli-text">{w.line}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </Band>
    )
}
