import type { MDXComponents } from "mdx/types"
import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { AppLink } from "@repo/ui/components/app-link"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"
import { HighlightedCodeTabs } from "@repo/brand/code-tabs-server"
import { DISPLAY } from "@repo/brand/type"
import { ADD_CREDITS_MIN, API_KEY_PREFIX, BOLI_CHAT, costMicro, KURA, KURA_DEFAULTS, MAX_API_KEYS, MICRO_PER_CREDIT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@repo/boli"
import { buildSamples, INSTALL_SAMPLES, type SampleMessage } from "@repo/boli/code-samples"
import type { CodeLang } from "@repo/boli/highlight"
import { Callout, CodeBlock } from "@/app/(public)/docs/_components/prose"
import { API_ORIGIN, appUrl } from "@/lib/app-links"
import { slugify } from "@/lib/content-shared"

/*
 * How MDX in content/ renders, in Boli's editorial style: serif h2, sans h3, 16px body at a 28px line, neutral
 * callouts, GFM tables in a card that scrolls sideways inside itself on a phone, code highlighted on the server.
 *
 * Writing links in MDX:
 *   [Quickstart](/docs/quickstart)  - a page on this site (AppLink)
 *   [API keys](app:/keys)          - a page in the app (app.bolihq.com), built from NEXT_PUBLIC_APP_URL, same tab
 *   [Gemma](https://...)            - anywhere else, new tab
 *
 * Components for MDX: <Callout title="..." tone="warn">, <CodeSamples user="..." system="..." />, <InstallSamples />,
 * <Fact name="..." />, <CostExample input={750} output={120} /> (prices always from @repo/boli).
 */

/** The words inside React children (for heading anchors). */
function textOf(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === "boolean") return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(textOf).join("")
    if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
    return ""
}

const LANGS: Readonly<Record<string, CodeLang>> = {
    bash: "shellscript",
    sh: "shellscript",
    shell: "shellscript",
    shellscript: "shellscript",
    curl: "shellscript",
    python: "python",
    py: "python",
    ts: "typescript",
    typescript: "typescript",
    js: "javascript",
    javascript: "javascript",
    go: "go",
    json: "json",
}

const LABELS: Readonly<Record<CodeLang, string>> = {
    shellscript: "Terminal",
    python: "Python",
    typescript: "TypeScript",
    javascript: "JavaScript",
    go: "Go",
    json: "JSON",
}

function Pre({ children }: ComponentPropsWithoutRef<"pre">) {
    const child = Children.toArray(children)[0]
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return <pre>{children}</pre>
    const lang = /language-(\w+)/.exec(child.props.className ?? "")?.[1]?.toLowerCase()
    const code = textOf(child.props.children).replace(/\n$/, "")
    const hl = lang ? LANGS[lang] : undefined
    return <CodeBlock code={code} lang={hl} label={hl ? LABELS[hl] : lang === "text" ? "Text" : undefined} wrap={!hl} className="my-6" />
}

function A({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
    const cls = "cursor-pointer text-boli-sky-ink underline decoration-boli-sky-ink/40 underline-offset-[3px] transition-colors hover:decoration-boli-sky-ink"
    if (href.startsWith("app:")) {
        return (
            <a href={appUrl(href.slice(4))} className={cls} {...rest}>
                {children}
            </a>
        )
    }
    if (href.startsWith("/")) {
        return (
            <AppLink href={href} className={cls}>
                {children}
            </AppLink>
        )
    }
    if (/^https?:\/\//.test(href)) {
        return (
            <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
                {children}
            </a>
        )
    }
    return (
        <a href={href} className={cls} {...rest}>
            {children}
        </a>
    )
}

function H2({ children }: ComponentPropsWithoutRef<"h2">) {
    const id = slugify(textOf(children))
    return (
        <h2 id={id} className="mt-14 scroll-mt-24 font-serif text-[28px] leading-[1.15] text-boli-ink first:mt-0 sm:text-[32px]" style={DISPLAY.h3}>
            <a href={`#${id}`} className="cursor-pointer hover:underline hover:decoration-boli-line hover:underline-offset-8">
                {children}
            </a>
        </h2>
    )
}

function H3({ children }: ComponentPropsWithoutRef<"h3">) {
    const id = slugify(textOf(children))
    return (
        <h3 id={id} className="mt-9 scroll-mt-24 text-lg font-semibold text-boli-ink">
            {children}
        </h3>
    )
}

/** Every number a piece quotes about Boli, read from @repo/boli - never typed into a post. */
const FACTS = {
    model: BOLI_CHAT.id,
    modelLabel: BOLI_CHAT.label,
    licence: BOLI_CHAT.licence,
    context: BOLI_CHAT.contextTokens.toLocaleString("en-US"),
    inputPrice: `Rs ${BOLI_CHAT.pricePerMillion.input}`,
    outputPrice: `Rs ${BOLI_CHAT.pricePerMillion.output}`,
    welcomeCredits: String(WELCOME_CREDITS),
    rateLimit: String(RATE_LIMIT_PER_MIN),
    keyPrefix: API_KEY_PREFIX,
    maxKeys: String(MAX_API_KEYS),
    minTopUp: `Rs ${ADD_CREDITS_MIN}`,
    kura: KURA.name,
    maxTokensDefault: KURA_DEFAULTS.maxTokens.toLocaleString("en-US"),
    apiBase: `${API_ORIGIN}/v1`,
} as const

function Fact({ name }: { name: keyof typeof FACTS }) {
    return <>{FACTS[name]}</>
}

/** The first call in five languages (cURL, Python, TypeScript, JavaScript, Go), optionally with your own messages. */
async function CodeSamples({ user, system, think }: { user?: string; system?: string; think?: boolean }) {
    const messages: SampleMessage[] | undefined = user
        ? [{ role: "system", content: system ?? KURA_DEFAULTS.systemPrompt }, { role: "user", content: user }]
        : undefined
    return <HighlightedCodeTabs className="my-6" defaultLanguage="python" samples={buildSamples({ baseUrl: API_ORIGIN, messages, settings: think ? { think: true } : undefined })} />
}

/** The OpenAI SDK install line in each language. */
async function InstallSamples() {
    return <HighlightedCodeTabs className="my-6" defaultLanguage="python" samples={INSTALL_SAMPLES} />
}

/** What one call of `input` + `output` tokens costs on boli-chat today, and how many such calls Rs 1 pays for. */
function CostExample({ input, output }: { input: number; output: number }) {
    const micro = costMicro(BOLI_CHAT, input, output)
    const perRupee = micro > 0 ? Math.floor(MICRO_PER_CREDIT / micro) : 0
    const p = BOLI_CHAT.pricePerMillion
    return (
        <MdxCallout title="The math">
            {input.toLocaleString("en-US")} input tokens x Rs {p.input} per million + {output.toLocaleString("en-US")} output tokens x Rs {p.output} per million ={" "}
            <strong className="font-semibold text-boli-ink">{(micro / MICRO_PER_CREDIT).toLocaleString("en-US", { maximumFractionDigits: 5 })} credits</strong> per call. Rs 1 pays
            for about {perRupee.toLocaleString("en-US")} calls like it; the {WELCOME_CREDITS} free credits, about {(perRupee * WELCOME_CREDITS).toLocaleString("en-US")}.
        </MdxCallout>
    )
}

function MdxCallout({ title, tone, children }: { title: string; tone?: "info" | "warn"; children: ReactNode }) {
    return (
        <div className="my-6 [&>div]:mt-0">
            <Callout title={title} tone={tone}>
                {children}
            </Callout>
        </div>
    )
}

export const MDX_COMPONENTS: MDXComponents = {
    h2: H2,
    h3: H3,
    p: ({ className, ...p }) => <p className={cn("mt-5 text-base leading-7 text-boli-text", className)} {...p} />,
    a: A,
    ul: ({ className, ...p }) => <ul className={cn("mt-5 list-disc space-y-2 pl-6 text-base leading-7 text-boli-text marker:text-boli-muted", className)} {...p} />,
    ol: ({ className, ...p }) => <ol className={cn("mt-5 list-decimal space-y-2 pl-6 text-base leading-7 text-boli-text marker:text-boli-muted", className)} {...p} />,
    li: ({ className, ...p }) => <li className={cn("pl-1 [&>p]:mt-0", className)} {...p} />,
    strong: ({ className, ...p }) => <strong className={cn("font-semibold text-boli-ink", className)} {...p} />,
    blockquote: ({ className, ...p }) => (
        <blockquote className={cn("mt-6 rounded-2xl border border-boli-line bg-white px-5 py-1 text-boli-text [&>p]:mt-3 [&>p:last-child]:mb-3", className)} {...p} />
    ),
    hr: () => <hr className="my-12 border-boli-line" />,
    code: ({ className, ...p }) => <code className={cn("rounded-md bg-boli-sand px-1.5 py-0.5 font-mono text-[0.85em] text-boli-ink", className)} {...p} />,
    pre: Pre,
    table: ({ children }) => (
        <ScrollArea orientation="horizontal" className="mt-6 min-w-0 rounded-2xl border border-boli-line bg-white">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">{children}</table>
        </ScrollArea>
    ),
    thead: ({ className, ...p }) => <thead className={cn("border-b border-boli-line bg-boli-ground/60", className)} {...p} />,
    tr: ({ className, ...p }) => <tr className={cn("border-b border-boli-line align-top last:border-0", className)} {...p} />,
    th: ({ className, ...p }) => <th scope="col" className={cn("px-4 py-2.5 text-xs font-semibold text-boli-muted", className)} {...p} />,
    td: ({ className, ...p }) => <td className={cn("px-4 py-3 leading-6 text-boli-text", className)} {...p} />,
    Callout: MdxCallout,
    CodeSamples,
    InstallSamples,
    CostExample,
    Fact,
}

/** @next/mdx picks this up for every MDX file (App Router requires the file). */
export function useMDXComponents(components: MDXComponents): MDXComponents {
    return { ...MDX_COMPONENTS, ...components }
}
