import { SITE } from "@repo/core/site"
import { API_PATHS, BOLI_CHAT, BRAND, CREDIT_PACKS, KURA, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@repo/boli"
import { entryHref, publishedEntries, publishedTopics, TOPICS } from "@/lib/content"
import { DOCS_PAGES, ROUTES } from "@/lib/routes"
import { APP_URL } from "@/lib/app-links"

/**
 * /llms.txt - a short markdown map of the site for AI crawlers (learned from gurukulhq). Built at build time (static);
 * published posts and guides only. The full text is the generated static file /llms-full.txt
 * (scripts/build-content.ts), served from assets without touching the Worker.
 */
export const dynamic = "force-static"

export function GET() {
    const u = (path: string) => `${SITE.url}${path}`
    const list = (kind: "blog" | "guides") =>
        publishedEntries(kind)
            .map((e) => `- [${e.title}](${u(entryHref(e))}): ${e.summary}`)
            .join("\n") || "- None published yet."
    const p = BOLI_CHAT.pricePerMillion
    const body = `# ${BRAND.name} - ${BRAND.tagline}

> ${BRAND.description}

${u(ROUTES.llmsFull)} has the full published text of this site in one file.

## What Boli is

- ${KURA.name}: a chat app (${KURA.subtitle.toLowerCase()}).
- An OpenAI-compatible API: base URL ${APP_URL}/v1, \`POST ${API_PATHS.chatCompletions}\`, \`GET ${API_PATHS.models}\`.
- Model: \`${BOLI_CHAT.id}\` (${BOLI_CHAT.label}; ${BOLI_CHAT.licence}, open weights). Context ${BOLI_CHAT.contextTokens} tokens. Languages: ${BOLI_CHAT.languages.join(", ")}.
- Prices per 1M tokens: Rs ${p.input} input, Rs ${p.output} output (NPR). 1 credit = Rs 1. ${WELCOME_CREDITS} free credits on email verification. Packs: ${CREDIT_PACKS.map((c) => `Rs ${c.rupees} -> ${c.credits} credits`).join("; ")}.
- Rate limit: ${RATE_LIMIT_PER_MIN} requests per minute per account.
- Boli runs only open models. API calls store metadata only, never prompts or answers.

## Docs

${DOCS_PAGES.map((d) => `- [${d.title}](${u(ROUTES.doc(d.slug))})`).join("\n")}
- [Models](${u(ROUTES.models)}) and [${BOLI_CHAT.id}](${u(ROUTES.model(BOLI_CHAT.id))})

## Blog

${list("blog")}

## Guides

${list("guides")}

## Topics

${publishedTopics().map((t) => `- [${TOPICS[t].title}](${u(ROUTES.blogTopic(t))}): ${TOPICS[t].description}`).join("\n") || "- None published yet."}

## Feeds and markdown

- [Blog RSS](${u(ROUTES.blogRss)}) and [changelog RSS](${u(ROUTES.changelogRss)})
- Every published post and guide is also available as markdown: send \`Accept: text/markdown\` to its URL.

## Company

- [About](${u(ROUTES.about)})
- [Changelog](${u(ROUTES.changelog)})
- [Contact](${u(ROUTES.contact)}): ${BRAND.contactEmail}
`
    return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } })
}
