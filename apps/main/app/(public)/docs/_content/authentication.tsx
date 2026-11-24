import { SITE } from "@repo/core/site"
import { HighlightedCodeTabs as CodeTabs } from "@/components/brand/code-tabs-server"
import {
    API_ERRORS,
    API_KEY_DISPLAY_LENGTH,
    API_KEY_PREFIX,
    API_KEY_RANDOM_LENGTH,
    API_PATHS,
    DEFAULT_MODEL_ID,
    KURA,
    MAX_API_KEYS,
    RATE_LIMIT_PER_MIN,
    maskKey,
    type ApiErrorCode,
} from "@/lib/boli"
import { buildModelsSamples, buildRetrySamples } from "@/lib/code-samples"
import { C, Callout, CodeBlock, DocPage, DocTable, H2, H3, List, P, type DocHeading } from "../_components/prose"

const HEADINGS: DocHeading[] = [
    { id: "headers", title: "Sending your key" },
    { id: "keys", title: "How keys work" },
    { id: "errors", title: "Error format" },
    { id: "codes", title: "Error codes" },
    { id: "credits", title: "Out of credits (402)" },
    { id: "rate-limit", title: "Rate limit (429)" },
    { id: "retrying", title: "Retrying", depth: 3 },
]

/** Meaning and fix for every code in API_ERRORS - a Record, so adding a code there without a row here fails typecheck. */
const ERROR_HELP: Record<ApiErrorCode, { meaning: string; fix: string }> = {
    invalid_request: {
        meaning: "The body is not valid JSON, a field is missing or out of range, or the messages are longer than the context.",
        fix: "Read the message - it names the field. Check the model id, the message roles and the number ranges; shorten the messages or lower max_tokens.",
    },
    invalid_api_key: {
        meaning: "No key was sent, or the key is wrong or revoked.",
        fix: "Send Authorization: Bearer <key>. Check you copied the whole key. If it was revoked or lost, create a new one.",
    },
    insufficient_quota: {
        meaning: "Your account has no credits left.",
        fix: "Add credits on the Billing page, then retry. Retrying without credits will not help.",
    },
    not_found: {
        meaning: "The path or the model does not exist.",
        fix: `Use POST ${API_PATHS.chatCompletions} or GET ${API_PATHS.models}, and a model id from the models list.`,
    },
    rate_limit_exceeded: {
        meaning: `More than ${RATE_LIMIT_PER_MIN} requests in a minute on your account (all keys and ${KURA.name} together).`,
        fix: "Wait the number of seconds in the Retry-After header, then retry. Spread requests out or queue them.",
    },
    model_unavailable: {
        meaning: "The model is not reachable right now. Nothing was charged.",
        fix: "Wait a short while and retry with backoff. If it lasts, tell us.",
    },
}

export function Authentication() {
    const exampleKey = `${API_KEY_PREFIX}${"x".repeat(API_KEY_RANDOM_LENGTH)}`
    const display = maskKey(exampleKey.slice(0, API_KEY_DISPLAY_LENGTH))
    const codes = Object.keys(API_ERRORS) as ApiErrorCode[]
    return (
        <DocPage
            slug="authentication"
            headings={HEADINGS}
            lead={<p>Every request carries your API key. When something goes wrong, the API answers with an HTTP status and an OpenAI-shaped error that says what to fix.</p>}
        >
            <H2 id="headers">Sending your key</H2>
            <P>
                Send the key as a Bearer token in the <C>Authorization</C> header. This is what the OpenAI SDKs do, so with an SDK you only pass the key
                to the client. Listing the models is a quick way to check a key works:
            </P>
            <CodeTabs
                className="mt-5"
                samples={buildModelsSamples(SITE.url)}
            />
            <P>
                Tools that cannot set a Bearer token can send the key in an <C>x-api-key</C> header instead. If both are sent, <C>Authorization</C>{" "}
                wins.
            </P>
            <CodeBlock
                label="The same key in x-api-key"
                lang="shellscript"
                code={`curl ${SITE.url}${API_PATHS.chatCompletions} \\\n  -H "x-api-key: $BOLI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "${DEFAULT_MODEL_ID}", "messages": [{"role": "user", "content": "namaste"}]}'`}
            />

            <H2 id="keys">How keys work</H2>
            <List>
                <li>
                    A key is <C>{API_KEY_PREFIX}</C> followed by {API_KEY_RANDOM_LENGTH} random characters.
                </li>
                <li>
                    It is <strong className="font-semibold text-boli-ink">shown once</strong>, when you create it. We store only its SHA-256 hash, so it
                    cannot be shown again. The list shows the first {API_KEY_DISPLAY_LENGTH} characters, like <C>{display}</C>.
                </li>
                <li>You can have up to {MAX_API_KEYS} active keys. Use one per app or environment, so you can revoke one without touching the rest.</li>
                <li>Revoking a key stops it at once. Its usage history stays, under its name.</li>
                <li>
                    Every key spends the same account balance and shares the same rate limit with {KURA.name}.
                </li>
            </List>
            <Callout title="Keep keys on the server" tone="warn">
                Never put a key in a web page, a mobile app or a public repository - anyone who finds it can spend your credits. Call Boli from your server
                and keep the key in an environment variable.
            </Callout>

            <H2 id="errors">Error format</H2>
            <P>Errors use the OpenAI shape, so SDKs raise their usual exceptions. The message is written for a person: it says what went wrong and what to do.</P>
            <CodeBlock
                label="401 Unauthorized"
                lang="json"
                code={JSON.stringify(
                    {
                        error: {
                            message: "That API key is not valid or was revoked. Check you copied the whole key, or create a new one on the API keys page.",
                            type: API_ERRORS.invalid_api_key.type,
                            code: "invalid_api_key",
                        },
                    },
                    null,
                    2,
                )}
            />

            <H2 id="codes">Error codes</H2>
            <DocTable
                head={["Status", "code", "type", "What it means", "How to fix it"]}
                rows={codes.map((code) => [
                    <span key="s" className="font-mono text-boli-ink">
                        {API_ERRORS[code].status}
                    </span>,
                    <C key="c">{code}</C>,
                    <span key="t" className="font-mono text-xs">
                        {API_ERRORS[code].type}
                    </span>,
                    ERROR_HELP[code].meaning,
                    ERROR_HELP[code].fix,
                ])}
            />

            <H2 id="credits">Out of credits (402)</H2>
            <P>
                Before each request we check your balance. At zero, the API answers <C>{API_ERRORS.insufficient_quota.status}</C> with code{" "}
                <C>insufficient_quota</C>, and nothing is sent to the model. A request that is already running when you reach zero finishes and is charged.
                Retrying does not help until you add credits - so do not retry 402 automatically.
            </P>

            <H2 id="rate-limit">Rate limit (429)</H2>
            <P>
                Each account can make {RATE_LIMIT_PER_MIN} requests per minute, counted across all its keys and {KURA.name}. Over the limit, the API answers{" "}
                <C>{API_ERRORS.rate_limit_exceeded.status}</C> with code <C>rate_limit_exceeded</C> and a <C>Retry-After</C> header: the number of seconds
                to wait.
            </P>
            <H3 id="retrying">Retrying</H3>
            <P>
                The OpenAI SDKs already retry 429 and 5xx answers a couple of times and respect <C>Retry-After</C>. You can raise the number of retries
                when you create the client:
            </P>
            <CodeTabs
                className="mt-5"
                defaultLanguage="python"
                samples={buildRetrySamples(SITE.url)}
            />
        </DocPage>
    )
}
