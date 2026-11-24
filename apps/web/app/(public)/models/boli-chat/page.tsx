import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { HighlightedCodeTabs } from "@repo/brand/code-tabs-server"
import { PillButton } from "@repo/brand/pill-button"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { API_PATHS, BOLI_CHAT, costMicro, DEFAULT_SYSTEM_PROMPT, KURA, KURA_DEFAULTS, MICRO_PER_CREDIT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@repo/boli"
import { buildSamples } from "@repo/boli/code-samples"
import { C, Callout, CodeBlock, DocTable, H2, List, P, type DocHeading } from "@/app/(public)/docs/_components/prose"
import { DocsToc } from "@/app/(public)/docs/_components/docs-toc"
import { PageHero } from "@/components/public/page-hero"
import { JsonLd } from "@/components/json-ld"
import { API_ORIGIN, KEYS_URL, KURA_URL } from "@/lib/app-links"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

const M = BOLI_CHAT

export const metadata: Metadata = pageMeta({
    title: `${M.id} - ${M.label}`,
    description: `${M.id} is ${M.label}, an open model (${M.licence}) that reads English, Romanized Nepali, Devanagari and the mix. Rs ${M.pricePerMillion.input} in, Rs ${M.pricePerMillion.output} out per 1M tokens.`,
    path: ROUTES.model(M.id),
})

const HEADINGS: DocHeading[] = [
    { id: "at-a-glance", title: "At a glance" },
    { id: "languages", title: "Languages and how it answers" },
    { id: "prices", title: "Prices" },
    { id: "examples", title: "Example requests" },
    { id: "thinking", title: "Thinking" },
    { id: "fits", title: "Good fits and poor fits" },
    { id: "limits", title: "Limits" },
]

/** Credits as a plain number with up to 4 decimals (a call costs fractions of a rupee). */
function credits(micro: number): string {
    return (micro / MICRO_PER_CREDIT).toLocaleString("en-US", { maximumFractionDigits: 4 })
}

/**
 * The boli-chat model page: what it is, languages, context, prices, the 5-language example, thinking, fits and limits.
 * Every number is read from @repo/boli. Same reading column + bending contents line as the docs.
 */
export default function BoliChatPage() {
    const p = M.pricePerMillion
    const example = { input: 1000, output: 500 }
    const exampleMicro = costMicro(M, example.input, example.output)
    const perRupee = Math.floor(MICRO_PER_CREDIT / exampleMicro)
    const samples = buildSamples({ baseUrl: API_ORIGIN })
    const thinkSample = JSON.stringify(
        { model: M.id, messages: [{ role: "user", content: "2 kg chamal ko Rs 180, 5 kg ko kati?" }], think: true, max_tokens: KURA_DEFAULTS.maxTokens },
        null,
        2,
    )
    return (
        <>
            <JsonLd
                data={breadcrumbSchema([
                    { name: "Models", path: ROUTES.models },
                    { name: M.id, path: ROUTES.model(M.id) },
                ])}
            />
            <PageHero
                kicker="Models - Live"
                title={M.id}
                line={`${M.blurb} ${M.label}, open weights under ${M.licence}.`}
                art={<PixelVignette id="aboutBench" />}
                artAspect="96 / 60"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <PillButton asChild size="lg">
                        <a href={KURA_URL}>
                            Try in {KURA.name} <ArrowRight aria-hidden />
                        </a>
                    </PillButton>
                    <PillButton asChild size="lg" variant="secondary">
                        <a href={KEYS_URL}>Get API key</a>
                    </PillButton>
                </div>
                <p className="mt-4 text-sm text-boli-muted">{WELCOME_CREDITS} free credits when you verify your email.</p>
            </PageHero>

            <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-24 pt-12 font-sans sm:px-6 lg:px-10 xl:grid-cols-[minmax(0,1fr)_208px]">
                <div className="min-w-0 max-w-3xl">
                    <H2 id="at-a-glance">At a glance</H2>
                    <DocTable
                        head={["Field", "Value"]}
                        rows={[
                            ["Model id", <C key="id">{M.id}</C>],
                            ["Weights", M.base],
                            ["Licence", `${M.licence} - open weights you could run yourself`],
                            ["Context", `${M.contextTokens.toLocaleString("en-US")} tokens (prompt and answer together)`],
                            ["Languages", M.languages.join(", ")],
                            ["Price per 1M tokens", `Rs ${p.input} input, Rs ${p.output} output`],
                            ["Rate limit", `${RATE_LIMIT_PER_MIN} requests a minute per account, shared by every key and ${KURA.name}`],
                            ["Endpoint", <C key="ep">POST {API_PATHS.chatCompletions}</C>],
                            ["Thinking", "Off by default; turn it on per request"],
                        ]}
                    />

                    <H2 id="languages">Languages and how it answers</H2>
                    <P>
                        People in Nepal write English, Nepali in Devanagari, Nepali in Latin letters (Romanized), and most often a mix of all three in one
                        sentence. {M.id} reads all of them. It answers in the language and the script you wrote in: ask in Romanized Nepali and the answer comes
                        back in Romanized Nepali, not Devanagari.
                    </P>
                    <P>
                        That second part is not free. Small models tend to switch to Devanagari when they see Nepali, or to answer English questions in Nepali.
                        In our tests the line that fixes it is an explicit mapping in the system prompt. {KURA.name} uses this prompt by default, and you can send
                        it with your own API calls:
                    </P>
                    <CodeBlock label="System prompt" code={DEFAULT_SYSTEM_PROMPT} wrap />

                    <H2 id="prices">Prices</H2>
                    <P>
                        You pay for the tokens a call uses: Rs {p.input} per million input tokens and Rs {p.output} per million output tokens. 1 credit = Rs 1,
                        and each call is charged to a millionth of a credit, so small calls cost what they use.
                    </P>
                    <Callout title="A worked example">
                        A call with {example.input.toLocaleString("en-US")} input tokens and {example.output.toLocaleString("en-US")} output tokens costs{" "}
                        {credits(exampleMicro)} credits - Rs 1 pays for about {perRupee.toLocaleString("en-US")} calls like it.
                    </Callout>
                    <P>
                        See{" "}
                        <AppLink href={ROUTES.doc("models")} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                            Models, pricing and limits
                        </AppLink>{" "}
                        for credits, packs and what happens at zero.
                    </P>

                    <H2 id="examples">Example requests</H2>
                    <P>
                        The API speaks the OpenAI format, so the official OpenAI SDKs work with Boli&apos;s base URL and your Boli key. The same first call in
                        five languages:
                    </P>
                    <HighlightedCodeTabs className="mt-5" samples={samples} defaultLanguage="python" />
                    <P>
                        A full walkthrough is in the{" "}
                        <AppLink href={ROUTES.doc("quickstart")} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                            quickstart
                        </AppLink>
                        .
                    </P>

                    <H2 id="thinking">Thinking</H2>
                    <P>
                        Send <C>think: true</C> and the model reasons before it answers. It can help with multi-step questions and it costs more: the
                        thinking tokens count as output tokens. It is off unless you ask for it.
                    </P>
                    <CodeBlock label="Request body" code={thinkSample} lang="json" />

                    <H2 id="fits">Good fits and poor fits</H2>
                    <P>Good fits today:</P>
                    <List>
                        <li>Short replies to customers who write Romanized Nepali, English or both.</li>
                        <li>One-line summaries and drafting a message in the user&apos;s own mix.</li>
                        <li>Labelling: sorting a message into one of a few categories.</li>
                        <li>Explaining a term or a step in plain words.</li>
                    </List>
                    <P>Poor fits today:</P>
                    <List>
                        <li>Facts that must be right without checking - it can invent names and details.</li>
                        <li>Long documents: the whole conversation must fit in {M.contextTokens.toLocaleString("en-US")} tokens.</li>
                        <li>Reading images or scanned pages - document reading is next on the roadmap.</li>
                        <li>Polished formal Nepali: it still slips on grammar and sometimes uses Hindi words.</li>
                    </List>

                    <H2 id="limits">Limits</H2>
                    <P>
                        {M.id} is a small model ({M.label}) chosen because it understands Romanized Nepali and runs at a price that makes sense in rupees. It is
                        not a frontier model. Check anything important, keep prompts short, and tell it to say when it is not sure.
                    </P>
                    <Callout title="What is next" tone="info">
                        Document reading and speech are on the{" "}
                        <AppLink href={ROUTES.modelsRoadmap} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                            roadmap
                        </AppLink>
                        . Fine-tuning on Nepali input is how the gaps above get closed.
                    </Callout>

                    <div className="mt-14 flex flex-col gap-4 rounded-2xl border border-boli-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-boli-ink">
                                {M.id} <QuietBadge tone="live">Live</QuietBadge>
                            </p>
                            <p className="mt-1 text-sm text-boli-text">Try it in your own words, then build with it.</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <PillButton asChild variant="secondary">
                                <a href={KEYS_URL}>Get API key</a>
                            </PillButton>
                            <PillButton asChild>
                                <a href={KURA_URL}>Try in {KURA.name}</a>
                            </PillButton>
                        </div>
                    </div>
                </div>
                <nav aria-label="On this page" className="hidden xl:block">
                    <div className="sticky top-[6.5rem]">
                        <DocsToc headings={HEADINGS} />
                    </div>
                </nav>
            </div>
        </>
    )
}
