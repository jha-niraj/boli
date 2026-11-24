/**
 * Builds the content index for the Blog, Guides and Changelog - run before `next dev` and `next build` (see
 * package.json), or on its own with `pnpm --filter web content`.
 *
 * Why a generated file and not `fs` in the pages: the site runs as a Cloudflare Worker, which has no file system at
 * request time. Reading `content/*.mdx` from disk would work at build and break the first time a page re-renders on the
 * Worker. So this script reads every file once, checks its frontmatter, works out the reading time and the "On this page"
 * headings, and writes plain TypeScript the site imports like any module:
 *
 *   content/generated/manifest.ts - every entry's checked frontmatter + reading time + headings (drafts included; the
 *                                   site hides them in production, lib/content.ts)
 *   content/generated/bodies.ts   - one lazy `import()` per MDX file (compiled by @next/mdx at build, never at runtime)
 *   content/generated/markdown-pages.ts - page path -> its /md/*.md file and token estimate (middleware.ts reads it)
 *   public/llms-full.txt          - the site's published text in one file for AI crawlers (drafts never)
 *   public/md/{blog,guides}/<slug>.md - each PUBLISHED post and guide as markdown, for `Accept: text/markdown`
 *
 * The output is committed, so a reviewer sees the content diff and a fresh clone type-checks without running anything.
 * A bad frontmatter field fails loudly with the file and the field.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { compile } from "@mdx-js/mdx"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { BLOG_CATEGORIES, CHANGELOG_TAGS, CONTENT_KINDS, COVER_NAMES, plainInline, slugify, TAKEAWAYS_MAX, TAKEAWAYS_MIN, type ContentEntry, type ContentFaq, type ContentKind, type TocItem } from "../lib/content-shared"
import { DOCS_PAGES } from "../lib/routes"
import { AUTHORS, DEFAULT_AUTHOR, isAuthorId, type AuthorId } from "../content/authors"
import { isTopicId, TOPICS, TOPIC_IDS, type TopicId } from "../content/topics"
import { BOLI_CHAT, BRAND, CREDIT_PACKS, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "../../../packages/boli/src/boli"
import { agentMarkdown, APP, estimateTokens, fillFacts, SITE } from "./content-text"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const CONTENT = join(WEB, "content")
const OUT = join(CONTENT, "generated")

/** Words read per minute for the "N min read" line. */
const WPM = 220

/** A block-list item: `- text` or `- q: ...` followed by indented `a: ...` lines. */
type Item = string | Record<string, string>
type Raw = Record<string, string | boolean | string[] | Item[]>

/* ---------------------------------------------------------------------------------------------------------------- */
/* Frontmatter: a tiny YAML subset - key: value, quoted strings, true/false, [a, b] lists, and block lists:          */
/*   takeaways:                                                                                                      */
/*     - "One line"                                                                                                  */
/*   faqs:                                                                                                           */
/*     - q: A question?                                                                                              */
/*       a: The answer.                                                                                              */
/* ---------------------------------------------------------------------------------------------------------------- */

function unquote(v: string): string {
    const t = v.trim()
    if (t.startsWith('"') && t.endsWith('"')) return JSON.parse(t) as string
    if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
    return t
}

function parseValue(v: string): string | boolean | string[] {
    const t = v.trim()
    if (t === "true") return true
    if (t === "false") return false
    if (t.startsWith("[") && t.endsWith("]")) {
        const inner = t.slice(1, -1).trim()
        return inner ? inner.split(",").map((s) => unquote(s)).filter(Boolean) : []
    }
    return unquote(t)
}

const ITEM_KEY = /^([a-z]+):\s+(.*)$/

function splitFrontmatter(file: string, src: string): { data: Raw; body: string } {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src)
    if (!m) throw new Error(`${file}: no frontmatter (the file must start with a --- block)`)
    const data: Raw = {}
    let block: { key: string; items: Item[] } | null = null
    for (const line of (m[1] ?? "").split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith("#")) continue
        if (/^\s/.test(line)) {
            // An indented line belongs to the block list opened by the last `key:` with no value.
            if (!block) throw new Error(`${file}: indented line outside a list: "${line.trim()}"`)
            const t = line.trim()
            if (t.startsWith("- ")) {
                const rest = t.slice(2).trim()
                const kv = /^["']/.test(rest) ? null : ITEM_KEY.exec(rest)
                block.items.push(kv ? { [kv[1] ?? ""]: unquote(kv[2] ?? "") } : unquote(rest))
                continue
            }
            const kv = ITEM_KEY.exec(t)
            const last = block.items.at(-1)
            if (!kv || last === undefined || typeof last === "string") throw new Error(`${file}: "${block.key}" - cannot read "${t}" (each item starts with "- ")`)
            last[kv[1] ?? ""] = unquote(kv[2] ?? "")
            continue
        }
        block = null
        const i = line.indexOf(":")
        if (i < 0) throw new Error(`${file}: frontmatter line without a colon: "${line}"`)
        const key = line.slice(0, i).trim()
        const value = line.slice(i + 1)
        if (!value.trim()) {
            block = { key, items: [] }
            data[key] = block.items
            continue
        }
        data[key] = parseValue(value)
    }
    return { data, body: src.slice(m[0].length) }
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Checks                                                                                                            */
/* ---------------------------------------------------------------------------------------------------------------- */

const DATE = /^\d{4}-\d{2}-\d{2}$/

function str(file: string, d: Raw, key: string, required: boolean): string | undefined {
    const v = d[key]
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
        if (required) throw new Error(`${file}: "${key}" is required`)
        return undefined
    }
    if (typeof v !== "string") throw new Error(`${file}: "${key}" must be text`)
    if (/[–—]/.test(v)) throw new Error(`${file}: "${key}" has an en or em dash - use a plain hyphen`)
    return v
}

function date(file: string, d: Raw, key: string, required: boolean): string | undefined {
    const v = str(file, d, key, required)
    if (v !== undefined && !DATE.test(v)) throw new Error(`${file}: "${key}" must be YYYY-MM-DD (got "${v}")`)
    return v
}

function oneOf<T extends string>(file: string, key: string, v: string | undefined, allowed: readonly T[]): T | undefined {
    if (v === undefined) return undefined
    if (!(allowed as readonly string[]).includes(v)) throw new Error(`${file}: "${key}" must be one of ${allowed.join(", ")} (got "${v}")`)
    return v as T
}

const DASH = /[–—]/

/** A list of plain strings: `[a, b]` inline or a block list of `- text` lines. */
function strings(file: string, d: Raw, key: string): string[] {
    const v = d[key]
    if (v === undefined || v === "") return []
    if (!Array.isArray(v)) throw new Error(`${file}: "${key}" must be a list`)
    return v.map((it, i) => {
        if (typeof it !== "string") throw new Error(`${file}: "${key}" item ${i + 1} reads as "key: value" - wrap the line in double quotes`)
        if (!it.trim()) throw new Error(`${file}: "${key}" item ${i + 1} is empty`)
        if (DASH.test(it)) throw new Error(`${file}: "${key}" item ${i + 1} has an en or em dash - use a plain hyphen`)
        return it.trim()
    })
}

/** Facts in frontmatter text: `{{welcomeCredits}}` -> the number from @repo/boli (never typed). */
function facts(file: string, key: string, text: string): string {
    try {
        return fillFacts(text)
    } catch (err) {
        throw new Error(`${file}: "${key}": ${err instanceof Error ? err.message : String(err)}`)
    }
}

function takeawaysOf(file: string, d: Raw): string[] {
    const list = strings(file, d, "takeaways").map((t) => facts(file, "takeaways", t))
    if (list.length && (list.length < TAKEAWAYS_MIN || list.length > TAKEAWAYS_MAX)) {
        throw new Error(`${file}: "takeaways" has ${list.length} lines - give ${TAKEAWAYS_MIN} to ${TAKEAWAYS_MAX}, or none`)
    }
    for (const t of list) if (t.length > 200) throw new Error(`${file}: a takeaway is ${t.length} characters - keep each under 200: "${t.slice(0, 40)}..."`)
    return list
}

function faqsOf(file: string, d: Raw): ContentFaq[] {
    const v = d.faqs
    if (v === undefined || v === "") return []
    if (!Array.isArray(v)) throw new Error(`${file}: "faqs" must be a block list of "- q: ..." / "  a: ..." pairs`)
    const seen = new Set<string>()
    return v.map((it, i) => {
        if (typeof it === "string") throw new Error(`${file}: "faqs" item ${i + 1} needs "- q: question" and an indented "a: answer" line`)
        const keys = Object.keys(it)
        const extra = keys.filter((k) => k !== "q" && k !== "a")
        if (extra.length) throw new Error(`${file}: "faqs" item ${i + 1} has unknown field "${extra[0]}" - only q and a`)
        const q = (it.q ?? "").trim()
        const a = (it.a ?? "").trim()
        if (!q || !a) throw new Error(`${file}: "faqs" item ${i + 1} needs both q and a`)
        if (!q.endsWith("?")) throw new Error(`${file}: "faqs" item ${i + 1}: a question ends with "?" ("${q}")`)
        if (DASH.test(q) || DASH.test(a)) throw new Error(`${file}: "faqs" item ${i + 1} has an en or em dash - use a plain hyphen`)
        if (seen.has(q)) throw new Error(`${file}: "faqs" asks "${q}" twice`)
        seen.add(q)
        return { q: facts(file, "faqs", q), a: facts(file, "faqs", a) }
    })
}

function topicsOf(file: string, d: Raw, kind: ContentKind): TopicId[] {
    const list = strings(file, d, "topics")
    if (kind === "changelog") {
        if (list.length) throw new Error(`${file}: changelog entries have no topics (use tags)`)
        return []
    }
    if (!list.length) throw new Error(`${file}: "topics" is required - one or more of ${TOPIC_IDS.join(", ")} (content/topics.ts)`)
    return list.map((t) => {
        if (!isTopicId(t)) throw new Error(`${file}: unknown topic "${t}" - one of ${TOPIC_IDS.join(", ")}, or add it to content/topics.ts`)
        return t
    })
}

function authorOf(file: string, d: Raw, kind: ContentKind): AuthorId {
    const v = str(file, d, "author", kind !== "changelog")
    if (v === undefined) return DEFAULT_AUTHOR
    if (!isAuthorId(v)) throw new Error(`${file}: unknown author "${v}" - one of ${Object.keys(AUTHORS).join(", ")} (content/authors.ts)`)
    return v
}

/** Today in UTC, YYYY-MM-DD. */
const TODAY = new Date().toISOString().slice(0, 10)

/* ---------------------------------------------------------------------------------------------------------------- */
/* Body: headings, words                                                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

/** Lines outside fenced code blocks. */
function proseLines(body: string): string[] {
    const out: string[] = []
    let fenced = false
    for (const line of body.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) {
            fenced = !fenced
            continue
        }
        if (!fenced) out.push(line)
    }
    return out
}

function toc(file: string, body: string): TocItem[] {
    const items: TocItem[] = []
    const seen = new Set<string>()
    for (const line of proseLines(body)) {
        const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
        if (!m) continue
        const title = plainInline(m[2] ?? "")
        const id = slugify(title)
        if (seen.has(id)) throw new Error(`${file}: two headings make the same anchor "${id}" - reword one`)
        seen.add(id)
        items.push({ id, title, depth: (m[1] ?? "##").length === 3 ? 3 : 2 })
    }
    return items
}

/** The body as plain text: no JSX tags, no import/export lines, no markdown marks. */
function plainText(body: string): string {
    return body
        .split(/\r?\n/)
        .filter((l) => !/^(import|export)\s/.test(l))
        .join("\n")
        .replace(/<[A-Z][^>]*\/>/g, "")
        .replace(/<\/?[A-Z][^>]*>/g, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function wordCount(body: string): number {
    const text = plainText(proseLines(body).join("\n"))
    return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

/* ---------------------------------------------------------------------------------------------------------------- */

function readKind(kind: ContentKind): { entry: ContentEntry; body: string }[] {
    const dir = join(CONTENT, kind)
    let files: string[]
    try {
        files = readdirSync(dir).filter((f) => f.endsWith(".mdx"))
    } catch {
        return []
    }
    return files.map((f) => {
        const file = `content/${kind}/${f}`
        const slug = f.replace(/\.mdx$/, "")
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: the file name is the URL - lowercase words joined by hyphens`)
        const { data, body } = splitFrontmatter(file, readFileSync(join(dir, f), "utf8"))
        if (/[–—]/.test(body)) throw new Error(`${file}: the body has an en or em dash - use a plain hyphen`)
        const draft = data.draft
        if (typeof draft !== "boolean") throw new Error(`${file}: "draft" must be true or false`)
        const tagsRaw = strings(file, data, "tags")
        const tags = kind === "changelog" ? tagsRaw.map((t) => oneOf(file, "tags", t, CHANGELOG_TAGS) ?? t) : tagsRaw
        const words = wordCount(body)
        const published = date(file, data, "date", true) ?? ""
        const updated = date(file, data, "updated", false)
        if (updated !== undefined && updated < published) throw new Error(`${file}: "updated" (${updated}) is before "date" (${published})`)
        // gurukulhq's ledger rule: a published piece dated in the future puts a lastmod ahead of today in the sitemap.
        // Keep it a draft until its day (and never move an already-published date: lastmod would stop being trusted).
        if (!draft && published > TODAY) throw new Error(`${file}: "date" ${published} is in the future - keep "draft: true" until that day`)
        if (!draft && updated !== undefined && updated > TODAY) throw new Error(`${file}: "updated" ${updated} is in the future`)
        const entry: ContentEntry = {
            kind,
            slug,
            title: str(file, data, "title", true) ?? "",
            date: published,
            ...(updated ? { updated } : {}),
            ...(kind === "blog" ? { category: oneOf(file, "category", str(file, data, "category", true), BLOG_CATEGORIES) } : {}),
            summary: str(file, data, "summary", true) ?? "",
            author: authorOf(file, data, kind),
            ...(str(file, data, "cover", kind !== "changelog") ? { cover: oneOf(file, "cover", str(file, data, "cover", false), COVER_NAMES) } : {}),
            draft,
            tags,
            topics: topicsOf(file, data, kind),
            takeaways: takeawaysOf(file, data),
            faqs: faqsOf(file, data),
            words,
            readingMinutes: Math.max(1, Math.ceil(words / WPM)),
            toc: toc(file, body),
        }
        return { entry, body }
    })
}

async function main(): Promise<void> {
    const all = CONTENT_KINDS.flatMap(readKind).sort((a, b) => (a.entry.date < b.entry.date ? 1 : a.entry.date > b.entry.date ? -1 : a.entry.slug.localeCompare(b.entry.slug)))
    mkdirSync(OUT, { recursive: true })

    const header = "// GENERATED by scripts/build-content.ts from content/<kind>/*.mdx - do not edit. Run `pnpm --filter web content`.\n"
    writeFileSync(
        join(OUT, "manifest.ts"),
        `${header}import type { ContentEntry } from "../../lib/content-shared"\n\nexport const ENTRIES: readonly ContentEntry[] = ${JSON.stringify(
            all.map((a) => a.entry),
            null,
            4,
        )}\n`,
    )
    // Each MDX file is compiled HERE to a plain .jsx module (JSX kept, provider = @/mdx-components). Next then compiles
    // that like any other app file, with its own React. Importing the .mdx through the webpack loader instead pulled in a
    // second React for the content chunk and every post 500'd ("reading 'recentlyCreatedOwnerStacks'", 2026-11-24).
    const MDX_OUT = join(OUT, "mdx")
    rmSync(MDX_OUT, { recursive: true, force: true })
    for (const a of all) {
        const src = readFileSync(join(CONTENT, a.entry.kind, `${a.entry.slug}.mdx`), "utf8")
        const code = await compile(src, {
            jsx: true,
            development: false,
            outputFormat: "program",
            providerImportSource: "@/mdx-components",
            remarkPlugins: [remarkFrontmatter, remarkGfm],
        })
        mkdirSync(join(MDX_OUT, a.entry.kind), { recursive: true })
        writeFileSync(join(MDX_OUT, a.entry.kind, `${a.entry.slug}.jsx`), `${header}${String(code)}`)
    }
    const loaders = all.map((a) => `    "${a.entry.kind}/${a.entry.slug}": () => import("./mdx/${a.entry.kind}/${a.entry.slug}.jsx"),`).join("\n")
    writeFileSync(
        join(OUT, "bodies.ts"),
        `${header}import type { MDXContent } from "mdx/types"\n\n/** One lazy import per file, keyed "<kind>/<slug>": the .jsx compiled from its MDX by this script. */\nexport const BODIES: Readonly<Record<string, () => Promise<{ default: MDXContent }>>> = {\n${loaders}\n}\n`,
    )

    // llms-full.txt: published pieces only (a draft would publish unreleased text to every answer engine).
    const published = all.filter((a) => !a.entry.draft)
    const path = (e: ContentEntry) => (e.kind === "blog" ? `/blog/${e.slug}` : e.kind === "guides" ? `/guides/${e.slug}` : `/changelog#${e.slug}`)
    const head = [
        `# ${BRAND.name} - ${BRAND.tagline}`,
        "",
        `> ${BRAND.description}`,
        "",
        "This file is the published text of bolihq.com in one place. The short index is /llms.txt.",
        "",
        "## Facts",
        "",
        `- Model: ${BOLI_CHAT.id} (${BOLI_CHAT.label}; ${BOLI_CHAT.base}). Licence: ${BOLI_CHAT.licence}. Context: ${BOLI_CHAT.contextTokens} tokens.`,
        `- Languages: ${BOLI_CHAT.languages.join(", ")}.`,
        `- Price per 1M tokens: Rs ${BOLI_CHAT.pricePerMillion.input} input, Rs ${BOLI_CHAT.pricePerMillion.output} output. 1 credit = Rs 1 (NPR).`,
        `- ${WELCOME_CREDITS} free credits when the email is verified. Credit packs: ${CREDIT_PACKS.map((p) => `Rs ${p.rupees} -> ${p.credits} credits`).join(", ")}.`,
        `- Rate limit: ${RATE_LIMIT_PER_MIN} requests per minute per account.`,
        `- API: OpenAI-compatible, base URL ${APP}/v1, POST /v1/chat/completions. Boli runs only open models.`,
        "",
        "## Docs",
        "",
        ...DOCS_PAGES.map((d) => `- ${d.title}: ${SITE}/docs/${d.slug}`),
        `- Model page: ${SITE}/models/${BOLI_CHAT.id}`,
        "",
    ]
    const pieces = published.flatMap(({ entry, body }) => [
        "---",
        "",
        `# ${entry.title}`,
        "",
        `URL: ${SITE}${path(entry)}`,
        `Published: ${entry.date}${entry.updated ? ` (updated ${entry.updated})` : ""}`,
        "",
        entry.summary,
        "",
        ...(entry.takeaways.length ? ["Key takeaways:", ...entry.takeaways.map((t) => `- ${t}`), ""] : []),
        agentMarkdown(body),
        "",
        ...(entry.faqs.length ? ["Questions:", "", ...entry.faqs.flatMap((f) => [`Q: ${f.q}`, `A: ${f.a}`, ""])] : []),
    ])
    mkdirSync(join(WEB, "public"), { recursive: true })
    writeFileSync(join(WEB, "public", "llms-full.txt"), [...head, ...pieces].join("\n"))

    // Markdown for agents (gurukulhq's pattern): each PUBLISHED post and guide as its own .md under public/md/, served as
    // a static asset, plus the path -> file map middleware.ts reads (an edge function has no file system to look in).
    // Drafts never: public/ ships with the Worker, so a draft's file would be readable at its URL.
    const MD_DIR = join(WEB, "public", "md")
    rmSync(MD_DIR, { recursive: true, force: true })
    const mdPages: Record<string, { file: string; tokens: number }> = {}
    for (const { entry, body } of published) {
        if (entry.kind === "changelog") continue
        const author = AUTHORS[entry.author]
        const md = [
            `# ${entry.title}`,
            "",
            `> ${entry.summary}`,
            "",
            `- URL: ${SITE}${path(entry)}`,
            `- Published: ${entry.date}${entry.updated ? ` (updated ${entry.updated})` : ""}`,
            `- Author: ${author.name}`,
            `- Topics: ${entry.topics.map((t) => TOPICS[t].title).join(", ")}`,
            "",
            ...(entry.takeaways.length ? ["## Key takeaways", "", ...entry.takeaways.map((t) => `- ${t}`), ""] : []),
            agentMarkdown(body),
            "",
            ...(entry.faqs.length ? ["## Questions", "", ...entry.faqs.flatMap((f) => [`### ${f.q}`, "", f.a, ""])] : []),
        ].join("\n")
        mkdirSync(join(MD_DIR, entry.kind), { recursive: true })
        writeFileSync(join(MD_DIR, entry.kind, `${entry.slug}.md`), `${md.trim()}\n`)
        mdPages[path(entry)] = { file: `/md/${entry.kind}/${entry.slug}.md`, tokens: estimateTokens(md) }
    }
    writeFileSync(
        join(OUT, "markdown-pages.ts"),
        `${header}\n/** Page path -> its prebuilt markdown (public/md) and a rough token count. Published posts and guides only. */\nexport const MARKDOWN_PAGES: Readonly<Record<string, { file: string; tokens: number }>> = ${JSON.stringify(mdPages, null, 4)}\n`,
    )

    const count = (k: ContentKind) => all.filter((a) => a.entry.kind === k).length
    console.log(`content: ${count("blog")} posts, ${count("guides")} guides, ${count("changelog")} changelog entries (${published.length} published)`)
}

main().catch((err: unknown) => { console.error(err); process.exit(1) })
