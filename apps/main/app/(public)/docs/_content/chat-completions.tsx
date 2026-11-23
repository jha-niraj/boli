import { SITE } from "@repo/core/site"
import { CodeTabs } from "@/components/brand/code-tabs"
import { formatRupeesPreciseFromTokens } from "@/components/public/pricing"
import { API_PATHS, BOLI_CHAT, DEFAULT_MODEL_ID, DEFAULT_SYSTEM_PROMPT, KURA, KURA_DEFAULTS, KURA_LIMITS, KURA_SUGGESTIONS, MODELS } from "@/lib/boli"
import { buildSamples } from "@/lib/code-samples"
import { C, Callout, CodeBlock, DocPage, DocTable, H2, H3, P, type DocHeading } from "../_components/prose"

const HEADINGS: DocHeading[] = [
    { id: "endpoint", title: "Endpoint" },
    { id: "request", title: "Request body" },
    { id: "response", title: "Response" },
    { id: "streaming", title: "Streaming" },
    { id: "thinking", title: "Thinking" },
    { id: "language", title: "Language and script" },
]

const mixed = KURA_SUGGESTIONS.find((s) => s.label === "Mixed")?.prompt ?? ""
const romanized = KURA_SUGGESTIONS.find((s) => s.label === "Romanized")?.prompt ?? ""

/** An example answer body. Token counts are illustrative; the cost line is computed from the real price. */
const EXAMPLE_USAGE = { prompt_tokens: 132, completion_tokens: 58 }

export function ChatCompletions() {
    const url = `${SITE.url}${API_PATHS.chatCompletions}`
    const mixedSamples = buildSamples({
        baseUrl: SITE.url,
        messages: [
            { role: "system", content: DEFAULT_SYSTEM_PROMPT },
            { role: "user", content: mixed },
        ],
    })
    const streamSamples = buildSamples({ baseUrl: SITE.url, stream: true, messages: [{ role: "user", content: romanized }] })
    const thinkSamples = buildSamples({
        baseUrl: SITE.url,
        settings: { think: true },
        messages: [{ role: "user", content: "Ek kilo chamal Rs 95 ho bhane 7 kilo ko kati huncha? Step by step bhana." }],
    })
    const response = JSON.stringify(
        {
            id: "chatcmpl-...",
            object: "chat.completion",
            created: 1764000000,
            model: DEFAULT_MODEL_ID,
            choices: [
                {
                    index: 0,
                    message: { role: "assistant", content: "Team, bholi ko meeting cancel bhayo. Naya samay pachi pathaunchhu. Dhanyabad!" },
                    finish_reason: "stop",
                },
            ],
            usage: { ...EXAMPLE_USAGE, total_tokens: EXAMPLE_USAGE.prompt_tokens + EXAMPLE_USAGE.completion_tokens },
        },
        null,
        2,
    )
    const rows: [string, string, string, string][] = [
        ["model", "string, required", `The model id. Today: ${MODELS.map((m) => m.id).join(", ")}.`, "-"],
        ["messages", "array, required", "The conversation so far: objects with role (system, developer, user or assistant) and content (a string, or text parts). Up to 200.", "-"],
        ["temperature", `number, ${KURA_LIMITS.temperature.min} to ${KURA_LIMITS.temperature.max}`, "Randomness. Lower is steadier, higher is more varied.", `model default (${KURA.name}: ${KURA_DEFAULTS.temperature})`],
        ["max_tokens", `integer, 1 to ${KURA_LIMITS.maxTokens.max}`, "Most tokens the answer may use, thinking included. max_completion_tokens is accepted as a synonym.", String(KURA_DEFAULTS.maxTokens)],
        ["top_p", `number, ${KURA_LIMITS.topP.min} to ${KURA_LIMITS.topP.max}`, "Nucleus sampling: only the most likely tokens that add up to this share are considered.", `model default (${KURA.name}: ${KURA_DEFAULTS.topP})`],
        ["top_k", `integer, ${KURA_LIMITS.topK.min} to ${KURA_LIMITS.topK.max}`, "Only the k most likely next tokens are considered. Not in the OpenAI spec: in the Python SDK pass it in extra_body.", `model default (${KURA.name}: ${KURA_DEFAULTS.topK})`],
        ["stream", "boolean", "Send the answer as server-sent events while it is written.", "false"],
        ["think", "boolean", "Boli extension: let the model think before it answers. Thinking tokens are billed as output.", "false"],
        ["stop, seed, presence_penalty, frequency_penalty, user", "as OpenAI", "Accepted and passed to the model. Other fields are ignored.", "-"],
    ]
    return (
        <DocPage
            slug="chatcompletions"
            headings={HEADINGS}
            lead={
                <p>
                    One endpoint does the work: send a list of messages, get the next one back. It follows the OpenAI Chat Completions format, so the OpenAI
                    SDKs, and most tools built on them, work unchanged.
                </p>
            }
        >
            <H2 id="endpoint">Endpoint</H2>
            <CodeBlock label="POST" code={url} />
            <P>
                Authenticate with <C>Authorization: Bearer $BOLI_API_KEY</C>. Send <C>Content-Type: application/json</C>. The example below asks the
                model to write a message in the mix of English and Romanized Nepali people use at work, with the system prompt {KURA.name} uses.
            </P>
            <CodeTabs className="mt-5" samples={mixedSamples} defaultLanguage="python" />

            <H2 id="request">Request body</H2>
            <DocTable
                head={["Field", "Type", "What it does", "Default"]}
                rows={rows.map(([field, type, what, def]) => [
                    <C key="f">{field}</C>,
                    <span key="t" className="text-xs">
                        {type}
                    </span>,
                    what,
                    <span key="d" className="text-xs">
                        {def}
                    </span>,
                ])}
            />
            <P>
                The model reads up to {BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens in total: the messages plus the answer. A request that does not
                fit returns <C>400 invalid_request</C>; shorten the messages or lower <C>max_tokens</C>.
            </P>

            <H2 id="response">Response</H2>
            <P>A normal answer is a single JSON object. The reply text is in <C>choices[0].message.content</C>.</P>
            <CodeBlock label="200 OK (example)" code={response} />
            <H3>usage</H3>
            <P>
                <C>prompt_tokens</C> is what the model read and <C>completion_tokens</C> what it wrote, thinking included. You are charged for exactly these.
                The example above would cost {formatRupeesPreciseFromTokens(EXAMPLE_USAGE.prompt_tokens, EXAMPLE_USAGE.completion_tokens)}.
            </P>
            <P>
                Each answer also carries an <C>x-boli-request-id</C> header. It matches the row on your Usage page; quote it if you write to us about a call.
            </P>

            <H2 id="streaming">Streaming</H2>
            <P>
                With <C>stream: true</C> the answer arrives as server-sent events: <C>data:</C> lines, each a chunk whose <C>choices[0].delta.content</C>{" "}
                holds the next piece of text, ending with <C>data: [DONE]</C>. The last chunk before it carries <C>usage</C>, so you always see what the
                call cost.
            </P>
            <CodeTabs className="mt-5" samples={streamSamples} defaultLanguage="python" />
            <Callout title="If the connection drops">
                A request keeps running on our side and is charged even if your client disconnects. Stream when answers are long, and set{" "}
                <C>max_tokens</C> to cap what one call can cost.
            </Callout>

            <H2 id="thinking">Thinking</H2>
            <P>
                Set <C>think: true</C> and the model reasons before it answers. It helps with arithmetic and multi-step questions, and makes the answer
                slower and longer. Thinking tokens count as output and are billed at the output price. The thinking text arrives separately from the answer,
                in <C>reasoning_content</C> (<C>delta.reasoning_content</C> when streaming). <C>think</C> is not an OpenAI field: the Python SDK sends it
                through <C>extra_body</C>.
            </P>
            <CodeTabs className="mt-5" samples={thinkSamples} defaultLanguage="python" />

            <H2 id="language">Language and script</H2>
            <P>
                {BOLI_CHAT.id} reads {BOLI_CHAT.languages.join(", ")}. Left alone, a small model can drift: a Romanized question can get an English or
                Devanagari answer. A system prompt that names the rule fixes most of it. This is the one {KURA.name} uses, and the one we tested:
            </P>
            <CodeBlock label="System prompt" code={DEFAULT_SYSTEM_PROMPT} />
            <P>Keep the explicit mapping line. In our tests a shorter prompt without it made the model answer English questions in Devanagari.</P>
        </DocPage>
    )
}
