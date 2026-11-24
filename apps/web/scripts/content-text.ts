/**
 * Text helpers for scripts/build-content.ts: the facts a piece may quote, and an MDX body turned into plain markdown
 * for machines (public/llms-full.txt and the per-page /md/*.md files that answer `Accept: text/markdown`).
 *
 * Kept apart from the build script so it can be imported on its own (a preview, a test) without running the build.
 * Node-only, framework-free.
 */

import { ADD_CREDITS_MIN, API_KEY_PREFIX, BOLI_CHAT, costMicro, KURA, KURA_DEFAULTS, MAX_API_KEYS, MICRO_PER_CREDIT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "../../../packages/boli/src/boli"

/*
 * Hardcoded on purpose (as gurukulhq's llms script does): lib reads NEXT_PUBLIC_SITE_URL, and a shell with a localhost
 * value exported would bake localhost into a committed file.
 */
export const SITE = "https://bolihq.com"
export const APP = "https://app.bolihq.com"

/**
 * Every number a piece quotes about Boli, read from @repo/boli. The SAME names as FACTS in mdx-components.tsx (which
 * renders `<Fact name="..." />` on the page); frontmatter writes them as `{{name}}` (faqs, takeaways).
 */
export const FACTS: Readonly<Record<string, string>> = {
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
    apiBase: `${APP}/v1`,
}

/** `{{welcomeCredits}}` -> "100". An unknown name throws (the caller adds the file and field). */
export function fillFacts(text: string): string {
    return text.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (_, name: string) => {
        const v = FACTS[name]
        if (v === undefined) throw new Error(`unknown fact "{{${name}}}" - one of ${Object.keys(FACTS).join(", ")}`)
        return v
    })
}

/** The same sentence <CostExample> shows on the page. */
function costSentence(input: number, output: number): string {
    const micro = costMicro(BOLI_CHAT, input, output)
    const perRupee = micro > 0 ? Math.floor(MICRO_PER_CREDIT / micro) : 0
    const p = BOLI_CHAT.pricePerMillion
    const credits = (micro / MICRO_PER_CREDIT).toLocaleString("en-US", { maximumFractionDigits: 5 })
    return `**The math:** ${input.toLocaleString("en-US")} input tokens x Rs ${p.input} per million + ${output.toLocaleString("en-US")} output tokens x Rs ${p.output} per million = ${credits} credits per call. Rs 1 pays for about ${perRupee.toLocaleString("en-US")} calls like it.`
}

/**
 * An MDX body as plain markdown: import/export lines dropped, `<Fact>` replaced by its value, `<CostExample>` by its
 * sentence, `<CodeSamples>` / `<InstallSamples>` by a link to the quickstart, `<Callout title>` by a bold lead, other
 * components dropped; in-site links made absolute and `app:/` links pointed at the app. Code blocks are kept as they are.
 */
export function agentMarkdown(body: string): string {
    const out: string[] = []
    let fenced = false
    for (const line of body.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) {
            fenced = !fenced
            out.push(line)
            continue
        }
        if (fenced) {
            out.push(line)
            continue
        }
        if (/^(import|export)\s/.test(line)) continue
        const l = line
            .replace(/<Fact\s+name="([A-Za-z]+)"\s*\/>/g, (_, n: string) => FACTS[n] ?? "")
            .replace(/<CostExample\s+input=\{(\d+)\}\s+output=\{(\d+)\}\s*\/>/g, (_, i: string, o: string) => costSentence(Number(i), Number(o)))
            .replace(/<CodeSamples[^>]*\/>/g, `(The same call in cURL, Python, TypeScript, JavaScript and Go: ${SITE}/docs/quickstart)`)
            .replace(/<InstallSamples[^>]*\/>/g, `(The OpenAI SDK install line for each language: ${SITE}/docs/quickstart)`)
            .replace(/<Callout[^>]*title="([^"]*)"[^>]*>/g, "**$1:** ")
            .replace(/<\/?[A-Z][^>]*>/g, "")
            .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
            .replace(/\]\(app:(\/[^)]*)\)/g, `](${APP}$1)`)
            .replace(/\]\((\/[^)]*)\)/g, `](${SITE}$1)`)
        out.push(l)
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** Rough token count (about 4 characters per token) for the x-markdown-tokens header (gurukulhq's estimate). */
export function estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4))
}
