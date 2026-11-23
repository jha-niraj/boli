import { PixelHimalaya } from "@/components/brand/pixel-himalaya"
import { KURA_SUGGESTIONS } from "@/lib/boli"
import { SectionHeading } from "./section-heading"

const romanized = KURA_SUGGESTIONS.find((s) => s.label === "Romanized")?.prompt ?? ""
const mixed = KURA_SUGGESTIONS.find((s) => s.label === "Mixed")?.prompt ?? ""

/**
 * "The gap", told from our own research (reports/Nepal Sarvam style AI platforms.md, November 2026) and our model
 * tests (docs/inference/02-choose-a-model.md). Every number here is from those two documents.
 */
export function Gap() {
    return (
        <section className="border-y border-boli-line bg-white">
            <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                <div>
                    <SectionHeading eyebrow="The gap" title="Nepal types in its own way. AI has not caught up.">
                        <p>
                            Open a chat app in Kathmandu and you will see Nepali written in Latin letters, mixed with English, mid-sentence. Nobody switches
                            keyboards to ask a quick question.
                        </p>
                        <p className="mt-4">
                            In November 2026 we checked nineteen Nepal-based AI companies against what a developer needs to start: an instant API key, free
                            credits, public prices and docs. The best scored 5 of 14. None offered all four.
                        </p>
                        <p className="mt-4">
                            The big platforms do not fill it either. India&apos;s leading one supports Nepali only as Indian Nepali (ne-IN), and not in its chat
                            model. Small open models often answer Romanized Nepali in Hindi or in Devanagari: in our tests, one stayed in the writer&apos;s script
                            only about 3 times in 8.
                        </p>
                    </SectionHeading>
                </div>
                <div className="space-y-4">
                    <Typed who="How people ask" text={romanized} />
                    <Typed who="How people mix" text={mixed} />
                    <div className="grid grid-cols-2 gap-4">
                        <Fact value="0" label="Nepal-based companies with self-serve keys, free credits, public prices and docs together (Nov 2026)" />
                        <Fact value="6 of 8" label="replies in the writer's script from the model Boli runs, in our tests" />
                    </div>
                    <PixelHimalaya variant="strip" className="h-14 rounded-xl" />
                </div>
            </div>
        </section>
    )
}

function Typed({ who, text }: { who: string; text: string }) {
    return (
        <figure className="rounded-2xl border border-boli-line bg-boli-ground p-5">
            <figcaption className="text-xs text-boli-muted">{who}</figcaption>
            <blockquote className="mt-2 font-serif text-2xl leading-snug text-boli-ink">&ldquo;{text}&rdquo;</blockquote>
        </figure>
    )
}

function Fact({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-2xl border border-boli-line bg-white p-5">
            <p className="font-serif text-4xl text-boli-ink">{value}</p>
            <p className="mt-2 text-xs leading-5 text-boli-muted">{label}</p>
        </div>
    )
}
