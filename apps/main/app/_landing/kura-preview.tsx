import { ArrowUp } from "lucide-react"
import { BoliLogo } from "@/components/brand/boli-logo"
import { BOLI_CHAT, KURA, KURA_SUGGESTIONS } from "@/lib/boli"
import { SectionHeading } from "./section-heading"

const question = KURA_SUGGESTIONS.find((s) => s.label === "Romanized")?.prompt ?? ""

/** A static picture of Kura - labelled as a preview; the reply is written as an example, not captured from the model. */
export function KuraPreview() {
    return (
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <SectionHeading eyebrow={KURA.name} title={<>Ask the way you <em>talk</em></>}>
                <p>
                    {KURA.subtitle}. {KURA.meaning} - type in English, in Romanized Nepali, or both in one line, and the reply comes back the same way.
                </p>
                <p className="mt-4">Tune the system prompt, temperature and length, then open the Code tab to get the same request as cURL, Python or JavaScript.</p>
            </SectionHeading>

            <figure className="min-w-0">
                <div className="overflow-hidden rounded-2xl border border-boli-line bg-white shadow-[0_24px_60px_-32px_rgba(20,20,20,0.35)]">
                    <div className="flex items-center justify-between border-b border-boli-line px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-boli-ink">
                            <BoliLogo wordmark={false} className="text-sm" /> {KURA.name}
                        </span>
                        <span className="rounded-full bg-boli-ground px-2.5 py-1 font-mono text-xs text-boli-muted">{BOLI_CHAT.id}</span>
                    </div>
                    <div className="space-y-5 px-4 py-6 sm:px-6">
                        <div className="flex justify-end">
                            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-boli-ink px-4 py-2.5 text-sm leading-6 text-white">{question}</p>
                        </div>
                        <div className="flex gap-3">
                            <BoliLogo wordmark={false} className="mt-0.5 text-xs" />
                            <div className="max-w-[90%] space-y-2 text-sm leading-6 text-boli-text">
                                <p>Badhai cha! Exam sakiyo bhane aba ali aaram gara - ramro sanga sutnu, sathiharu sanga bhetnu.</p>
                                <p>Result aaunu agadi ko samay ma naya kura sikna sakchau: coding, English, wa kunai short course. Timilai k ma interest cha? Ma euta saano plan banaidinchhu.</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-boli-line p-3">
                        <div className="flex items-center gap-2 rounded-full border border-boli-line bg-boli-ground px-4 py-2">
                            <span className="flex-1 truncate text-sm text-boli-muted">Kehi sodhnus...</span>
                            <span aria-hidden className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-boli-ink text-white">
                                <ArrowUp className="h-4 w-4" />
                            </span>
                        </div>
                    </div>
                </div>
                <figcaption className="mt-3 text-center text-xs text-boli-muted">Preview. The reply is an example of the style, not a live answer.</figcaption>
            </figure>
        </section>
    )
}
