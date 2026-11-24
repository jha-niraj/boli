import { SITE } from "@repo/core/site"
import { AppLink } from "@repo/ui/components/app-link"
import { HighlightedCodeTabs as CodeTabs } from "@/components/brand/code-tabs-server"
import { API_KEY_PREFIX, API_PATHS, DEFAULT_MODEL_ID, KURA, WELCOME_CREDITS } from "@/lib/boli"
import { INSTALL_SAMPLES, buildSamples, codingAgentPrompt } from "@/lib/code-samples"
import { ROUTES } from "@/lib/navigation"
import { C, Callout, CodeBlock, DocPage, H2, List, P, type DocHeading } from "../_components/prose"

const HEADINGS: DocHeading[] = [
    { id: "account", title: "1. Create an account" },
    { id: "key", title: "2. Create an API key" },
    { id: "env", title: "3. Set BOLI_API_KEY" },
    { id: "sdk", title: "4. Install the OpenAI SDK" },
    { id: "first-call", title: "5. Make your first call" },
    { id: "coding-agent", title: "Use a coding agent" },
    { id: "next", title: "Next steps" },
]

export function Quickstart() {
    const baseUrl = `${SITE.url}/v1`
    const samples = buildSamples({ baseUrl: SITE.url })
    return (
        <DocPage
            slug="quickstart"
            headings={HEADINGS}
            lead={
                <p>
                    Boli speaks the OpenAI API. If you have called OpenAI before, you change two things: the base URL and the key. This page gets you from
                    nothing to a working call in about five minutes.
                </p>
            }
        >
            <H2 id="account">1. Create an account</H2>
            <P>
                <AppLink href={ROUTES.signUp} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                    Sign up
                </AppLink>{" "}
                with email or Google. When your email is verified you get {WELCOME_CREDITS} free credits (1 credit = Rs 1). You can try the model in{" "}
                {KURA.name} straight away.
            </P>

            <H2 id="key">2. Create an API key</H2>
            <P>
                Open{" "}
                <AppLink href={ROUTES.keys} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                    API keys
                </AppLink>{" "}
                and choose Create key. Give it a name you will recognise later, like <C>my-laptop</C> or <C>production</C>. The key starts with{" "}
                <C>{API_KEY_PREFIX}</C>.
            </P>
            <Callout title="Copy the key now" tone="warn">
                The key is shown once. We store only a fingerprint of it, so nobody - including us - can show it again. If you lose it, revoke it and create
                a new one.
            </Callout>

            <H2 id="env">3. Set BOLI_API_KEY</H2>
            <P>Keep the key out of your code. Put it in an environment variable, or in a <C>.env</C> file that is listed in <C>.gitignore</C>.</P>
            <CodeBlock label="Terminal (macOS, Linux)" code={`export BOLI_API_KEY="${API_KEY_PREFIX}..."`} lang="shellscript" />
            <CodeBlock label="Windows PowerShell" code={`$env:BOLI_API_KEY = "${API_KEY_PREFIX}..."`} />

            <H2 id="sdk">4. Install the OpenAI SDK</H2>
            <P>Boli does not need its own SDK. Use the official OpenAI library for your language (Python, TypeScript and JavaScript, Go), or plain HTTP.</P>
            <CodeTabs
                className="mt-5"
                defaultLanguage="python"
                samples={INSTALL_SAMPLES}
            />
            <P>
                Point the client at this base URL: <C>{baseUrl}</C>
            </P>

            <H2 id="first-call">5. Make your first call</H2>
            <P>
                This sends a question in Romanized Nepali to <C>{DEFAULT_MODEL_ID}</C> through <C>POST {API_PATHS.chatCompletions}</C> and prints the reply.
            </P>
            <CodeTabs className="mt-5" samples={samples} defaultLanguage="python" />
            <P>
                The answer comes back in the OpenAI shape, with a <C>usage</C> block that says how many tokens the call used. That is what you are charged
                for. See{" "}
                <AppLink href={ROUTES.doc("chatcompletions")} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                    Chat completions
                </AppLink>{" "}
                for every field.
            </P>

            <H2 id="coding-agent">Use a coding agent</H2>
            <P>
                Working with Cursor, Claude Code, Codex or a similar tool? Paste this prompt into it. It installs the SDK, reads the key from <C>.env</C>{" "}
                without printing it, and stops for you to paste your key before it runs anything.
            </P>
            <CodeBlock label="Prompt for your coding agent" code={codingAgentPrompt(SITE.url)} wrap />

            <H2 id="next">Next steps</H2>
            <List>
                <li>
                    <AppLink href={ROUTES.doc("authentication")} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                        Authentication and errors
                    </AppLink>{" "}
                    - the two key headers, and what to do with each error.
                </li>
                <li>
                    <AppLink href={ROUTES.doc("chatcompletions")} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                        Chat completions
                    </AppLink>{" "}
                    - request fields, the response, streaming and thinking.
                </li>
                <li>
                    <AppLink href={ROUTES.doc("models")} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
                        Models, pricing and limits
                    </AppLink>{" "}
                    - what the model is, what it costs, how fast you can call it.
                </li>
            </List>
        </DocPage>
    )
}
