import { SITE } from "@repo/core/site"
import { HighlightedCodeTabs as CodeTabs } from "@/components/brand/code-tabs-server"
import { exampleTurn, millionsFor } from "@/components/public/pricing"
import {
    ADD_CREDITS_MAX,
    ADD_CREDITS_MIN,
    API_PATHS,
    BOLI_CHAT,
    CURRENCY,
    KURA,
    MICRO_PER_CREDIT,
    MODELS,
    RATE_LIMIT_PER_MIN,
    WELCOME_CREDITS,
    costMicro,
} from "@/lib/boli"
import { buildModelsSamples } from "@/lib/code-samples"
import { C, Callout, DocPage, DocTable, H2, H3, List, P, type DocHeading } from "../_components/prose"

const HEADINGS: DocHeading[] = [
    { id: "models", title: "Models" },
    { id: "pricing", title: "Pricing" },
    { id: "example", title: "A worked example" },
    { id: "free-credits", title: "What the free credits buy", depth: 3 },
    { id: "credits", title: "Credits" },
    { id: "limits", title: "Limits" },
]

export function Models() {
    const p = BOLI_CHAT.pricePerMillion
    const turn = exampleTurn()
    // A longer job, to show the per-token sum: summarising a page of text.
    const job = { input: 3_000, output: 400 }
    const jobMicro = costMicro(BOLI_CHAT, job.input, job.output)
    return (
        <DocPage
            slug="models"
            headings={HEADINGS}
            lead={
                <p>
                    What runs behind the API, what each call costs, and how fast you can call it. Prices are in {CURRENCY}; one credit is one rupee.
                </p>
            }
        >
            <H2 id="models">Models</H2>
            <P>Boli serves open-weight models only. Today there is one.</P>
            {MODELS.map((m) => (
                <div key={m.id} className="mt-5 overflow-hidden rounded-2xl border border-boli-line bg-white">
                    <div className="flex flex-col gap-2 border-b border-boli-line p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-mono text-lg text-boli-ink">{m.id}</p>
                            <p className="mt-0.5 text-sm text-boli-muted">{m.label}</p>
                        </div>
                        <span className="w-fit rounded-full bg-boli-sand px-2.5 py-1 text-xs font-medium text-boli-text">{m.licence}</span>
                    </div>
                    <p className="px-5 pt-4 text-sm leading-6 text-boli-text">{m.blurb}</p>
                    <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-boli-muted">Base model</dt>
                            <dd className="mt-0.5 text-boli-ink">{m.base}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-boli-muted">Context</dt>
                            <dd className="mt-0.5 text-boli-ink">{m.contextTokens.toLocaleString("en-US")} tokens (prompt + answer)</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-boli-muted">Languages</dt>
                            <dd className="mt-0.5 text-boli-ink">{m.languages.join(", ")}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-boli-muted">Price per 1M tokens</dt>
                            <dd className="mt-0.5 text-boli-ink">
                                Rs {m.pricePerMillion.input} input, Rs {m.pricePerMillion.output} output
                            </dd>
                        </div>
                    </dl>
                </div>
            ))}
            <P>
                The model id stays the same when we improve the weights behind it, so your code does not change. The live list is at{" "}
                <C>GET {API_PATHS.models}</C>:
            </P>
            <CodeTabs
                className="mt-5"
                samples={buildModelsSamples(SITE.url)}
            />

            <H2 id="pricing">Pricing</H2>
            <DocTable
                head={["Model", "Input, per 1M tokens", "Output, per 1M tokens"]}
                rows={MODELS.map((m) => [<C key="m">{m.id}</C>, `Rs ${m.pricePerMillion.input}`, `Rs ${m.pricePerMillion.output}`])}
            />
            <List>
                <li>Input is everything the model reads: the system prompt, the earlier messages and the new one. Output is what it writes.</li>
                <li>Thinking tokens (<C>think: true</C>) are output.</li>
                <li>
                    {KURA.name} costs the same as the API. A failed call that never reached the model costs nothing.
                </li>
            </List>

            <H2 id="example">A worked example</H2>
            <P>
                A call costs <C>input tokens x input price + output tokens x output price</C>, divided by a million. For {BOLI_CHAT.id}:
            </P>
            <DocTable
                head={["Call", "Input", "Output", "Cost"]}
                rows={[
                    ["A short chat turn", turn.input.toLocaleString("en-US"), turn.output.toLocaleString("en-US"), turn.rupees],
                    [
                        "Summarise a page of text",
                        job.input.toLocaleString("en-US"),
                        job.output.toLocaleString("en-US"),
                        `Rs ${(jobMicro / MICRO_PER_CREDIT).toLocaleString("en-US", { maximumFractionDigits: 4 })}`,
                    ],
                ]}
            />
            <H3 id="free-credits">What the free Rs {WELCOME_CREDITS} buys</H3>
            <List>
                <li>{millionsFor(WELCOME_CREDITS, p.input)} million input tokens, or</li>
                <li>about {millionsFor(WELCOME_CREDITS, p.output)} million output tokens, or</li>
                <li>
                    about {turn.perWelcome.toLocaleString("en-US")} short chat turns like the one above.
                </li>
            </List>
            <P>Token counts here are examples. Every real call shows its own counts in the response and on your Usage page.</P>

            <H2 id="credits">Credits</H2>
            <List>
                <li>1 credit = Rs 1. Balances are kept to a millionth of a credit, so even a tiny call is charged exactly.</li>
                <li>{WELCOME_CREDITS} free credits arrive once, when you verify your email.</li>
                <li>
                    Add credits any time from the Billing page, from Rs {ADD_CREDITS_MIN.toLocaleString("en-US")} to Rs {ADD_CREDITS_MAX.toLocaleString("en-US")}{" "}
                    at a time, with eSewa or Khalti.
                </li>
                <li>Credits never expire.</li>
                <li>
                    At zero, API calls return <C>402 insufficient_quota</C> until you add more. A call already running finishes.
                </li>
            </List>

            <H2 id="limits">Limits</H2>
            <DocTable
                head={["Limit", "Value"]}
                rows={[
                    ["Requests per minute, per account", `${RATE_LIMIT_PER_MIN} (all keys and ${KURA.name} together)`],
                    ["Context per call", `${BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens, prompt + answer`],
                    ["Messages per request", "200"],
                ]}
            />
            <Callout title="Need more?">
                If {RATE_LIMIT_PER_MIN} requests a minute is not enough for what you are building, write to us from the About page and tell us about it.
            </Callout>
        </DocPage>
    )
}
