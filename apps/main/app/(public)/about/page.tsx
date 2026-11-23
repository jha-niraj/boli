import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Ornament } from "@/components/brand/ornament"
import { PixelHimalaya } from "@/components/brand/pixel-himalaya"
import { BOLI_CHAT, BRAND, KURA, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@/lib/boli"
import { ContactForm } from "./_components/contact-form"

export const metadata: Metadata = {
    title: "About",
    description: "Why Boli exists: no Nepal-based company offered a self-serve AI platform, so we built one on open models, priced in rupees, for the way Nepal types.",
    alternates: { canonical: "/about" },
}

const SECTIONS = [
    { id: "why", title: "Why Boli exists" },
    { id: "landscape", title: "What is open, and what is missing" },
    { id: "approach", title: "Our approach" },
    { id: "principles", title: "Principles" },
    { id: "today", title: "Where we are today" },
    { id: "contact", title: "Contact" },
] as const

export default function AboutPage() {
    return (
        <>
            <header className="relative overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_20%_0%,var(--color-boli-crimson-soft),transparent_70%),radial-gradient(50%_60%_at_85%_0%,var(--color-boli-sky),transparent_70%)]"
                />
                <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
                    <Ornament className="mx-auto text-boli-crimson-ink/50" />
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-boli-crimson-ink">About {BRAND.name}</p>
                    <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-tight text-boli-ink sm:text-6xl">
                        AI that speaks the way <em>Nepal types</em>
                    </h1>
                    <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">
                        Boli has one narrow aim: give people and developers in Nepal an open AI model they can use today, in their own
                        words, paid for in rupees.
                    </p>
                </div>
            </header>

            <PixelHimalaya variant="hero" className="h-40 sm:h-64" />

            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[200px_minmax(0,1fr)]">
                <nav aria-label="On this page" className="hidden lg:block">
                    <div className="sticky top-24">
                        <p className="text-xs font-semibold uppercase tracking-wider text-boli-muted">On this page</p>
                        <ul className="mt-4 space-y-2.5 border-l border-boli-line">
                            {SECTIONS.map((s) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`} className="-ml-px block cursor-pointer border-l border-transparent pl-4 text-sm text-boli-text hover:border-boli-ink hover:text-boli-ink">
                                        {s.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <article className="mx-auto w-full max-w-2xl">
                    <Section id="why" title="Why Boli exists">
                        <p>
                            Most people in Nepal write Nepali in Latin letters. They mix it with English in the same sentence: <Quote>Tomorrow ko meeting cancel bhayo</Quote>.
                            That is how support chats, class groups and small businesses actually talk.
                        </p>
                        <p>
                            The AI tools they reach for were not built for this. Ask in Romanized Nepali and a reply can come back in Hindi, in Devanagari, or in
                            English. A developer who wants to fix that has nowhere local to start.
                        </p>
                        <p>
                            In November 2026 we looked properly. We checked nineteen Nepal-based AI companies against a fourteen-point list of what a developer
                            needs: an instant API key, free credits, public prices in local currency, a playground, docs, SDKs and more. The best scored 5 of 14.
                            None offered self-serve keys, free credits, public prices and docs together.
                        </p>
                        <Pull>No company in Nepal offered a self-serve AI platform. So we built one.</Pull>
                    </Section>

                    <Section id="landscape" title="What is open, and what is missing">
                        <p>
                            A lot of good work is already open. Nepal&apos;s small labs publish speech recognition and speech models as open weights, with free
                            demos. Large open models from abroad already read Nepali. The best Nepali speech models of 2026 came from these labs, not from big
                            platforms.
                        </p>
                        <p>What is missing is the part between a model and a product:</p>
                        <ul>
                            <li>A hosted API you can call in the next five minutes, without emailing anyone for a key.</li>
                            <li>Prices you can read before you sign up, in rupees, and a way to pay that works in Nepal.</li>
                            <li>Docs and samples written for the language people type, not only for Devanagari.</li>
                        </ul>
                        <p>
                            India&apos;s leading platform shows how good this can be. It still treats Nepali as Indian Nepali, and leaves it out of its chat model.
                        </p>
                    </Section>

                    <Section id="approach" title="Our approach">
                        <h3>Open models</h3>
                        <p>
                            Boli runs open-weight models and nothing else. Today that is <code>{BOLI_CHAT.id}</code>: {BOLI_CHAT.label}, {BOLI_CHAT.licence}. We
                            picked it by testing small open models on English, Romanized Nepali and mixed prompts, not from a leaderboard - no leaderboard tests
                            Romanized Nepali.
                        </p>
                        <h3>Local pricing</h3>
                        <p>
                            One credit is one rupee. You get {WELCOME_CREDITS} free credits when you verify your email, pay per token after that, and top up with
                            eSewa or Khalti. Credits never expire.
                        </p>
                        <h3>Romanized Nepali first</h3>
                        <p>
                            Our system prompt tells the model to answer in the same language and script you wrote in. In our tests the model we run stayed in the
                            writer&apos;s script 6 times in 8. Another small model we tried managed about 3. That gap is why we chose it - and the misses are what
                            we work on next.
                        </p>
                    </Section>

                    <Section id="principles" title="Principles">
                        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                            {[
                                { t: "Open models only", d: "No closed model behind Boli, ever. If we say open, it is open." },
                                { t: "Privacy by default", d: "API calls keep metadata only - never prompts or answers. Your Kura chats are yours to delete." },
                                { t: "Honest pricing", d: `Per-token prices in rupees, on the page. ${RATE_LIMIT_PER_MIN} requests a minute, stated, not hidden.` },
                            ].map((p) => (
                                <div key={p.t} className="rounded-2xl border border-boli-line bg-white p-5">
                                    <dt className="font-serif text-2xl leading-tight text-boli-ink">{p.t}</dt>
                                    <dd className="mt-2 text-sm leading-6 text-boli-text">{p.d}</dd>
                                </div>
                            ))}
                        </dl>
                    </Section>

                    <Section id="today" title="Where we are today">
                        <p>
                            Boli is new. There is one model, {KURA.name} for chatting with it, and an OpenAI-compatible API for building with it. The model is small
                            and makes mistakes: Hindi words slip in, grammar wobbles, and it can state things that are not true. We would rather say that up front than
                            make a big claim.
                        </p>
                        <p>Next, we want the model to get better at Nepali the way people write it - and we want to hear what you would build with it.</p>
                    </Section>

                    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 border-t border-boli-line pt-14">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-boli-crimson-ink">Contact</p>
                        <h2 id="contact-title" className="mt-3 font-serif text-4xl leading-tight tracking-tight text-boli-ink">
                            Write to us
                        </h2>
                        <p className="mt-4 text-base leading-7 text-boli-text">Questions about the API, a partnership, a privacy request, or just an idea. We read every message.</p>
                        <div className="mt-8">
                            <ContactForm />
                        </div>
                    </section>
                </article>
            </div>
        </>
    )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-title`}
            className="mb-16 scroll-mt-24 text-[17px] leading-8 text-boli-text [&_code]:rounded-md [&_code]:bg-boli-sand [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-boli-ink [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-boli-ink [&_li]:pl-1 [&_p]:mt-5 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
        >
            <h2 id={`${id}-title`} className="font-serif text-4xl leading-tight tracking-tight text-boli-ink">
                {title}
            </h2>
            {children}
        </section>
    )
}

function Quote({ children }: { children: ReactNode }) {
    return <span className="font-serif text-xl italic text-boli-ink">&ldquo;{children}&rdquo;</span>
}

function Pull({ children }: { children: ReactNode }) {
    return (
        <blockquote className="my-10 border-l-2 border-boli-crimson pl-6 font-serif text-3xl leading-snug text-boli-ink">
            {children}
        </blockquote>
    )
}
