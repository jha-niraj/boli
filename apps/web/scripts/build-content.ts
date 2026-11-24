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
 *   public/llms-full.txt          - the site's published text in one file for AI crawlers (drafts never)
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
import { BLOG_CATEGORIES, CHANGELOG_TAGS, CONTENT_KINDS, COVER_NAMES, plainInline, slugify, type ContentEntry, type ContentKind, type TocItem } from "../lib/content-shared"
import { DOCS_PAGES } from "../lib/routes"
import { BOLI_CHAT, BRAND, CREDIT_PACKS, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "../../../packages/boli/src/boli"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const CONTENT = join(WEB, "content")
const OUT = join(CONTENT, "generated")

/*
 * Hardcoded on purpose (as gurukulhq's llms script does): lib reads NEXT_PUBLIC_SITE_URL, and a shell with a localhost
 * value exported would bake localhost into a committed file.
 */
const SITE = "https://bolihq.com"
const APP = "https://app.bolihq.com"

/** Words read per minute for the "N min read" line. */
const WPM = 220

type Raw = Record<string, string | boolean | string[]>

/* ---------------------------------------------------------------------------------------------------------------- */
/* Frontmatter: a tiny YAML subset (key: value, quoted strings, true/false, [a, b] lists)                            */
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

function splitFrontmatter(file: string, src: string): { data: Raw; body: string } {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src)
    if (!m) throw new Error(`${file}: no frontmatter (the file must start with a --- block)`)
    const data: Raw = {}
    for (const line of (m[1] ?? "").split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith("#")) continue
        const i = line.indexOf(":")
        if (i < 0) throw new Error(`${file}: frontmatter line without a colon: "${line}"`)
        data[line.slice(0, i).trim()] = parseValue(line.slice(i + 1))
    }
    return { data, body: src.slice(m[0].length) }
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Checks                                                                                                            */
/* ---------------------------------------------------------------------------------------------------------------- */

const DATE = /^\d{4}-\d{2}-\d{2}$/

function str(file: string, d: Raw, key: string, required: boolean): string | undefined {
    const v = d[key]
    if (v === undefined || v === "") {
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
        const tagsRaw = data.tags ?? []
        if (!Array.isArray(tagsRaw)) throw new Error(`${file}: "tags" must be a list like [API, Kura]`)
        const tags = kind === "changelog" ? tagsRaw.map((t) => oneOf(file, "tags", t, CHANGELOG_TAGS) ?? t) : tagsRaw
        const words = wordCount(body)
        const entry: ContentEntry = {
            kind,
            slug,
            title: str(file, data, "title", true) ?? "",
            date: date(file, data, "date", true) ?? "",
            ...(date(file, data, "updated", false) ? { updated: date(file, data, "updated", false) } : {}),
            ...(kind === "blog" ? { category: oneOf(file, "category", str(file, data, "category", true), BLOG_CATEGORIES) } : {}),
            summary: str(file, data, "summary", true) ?? "",
            author: str(file, data, "author", kind !== "changelog") ?? "The Boli team",
            ...(str(file, data, "cover", kind !== "changelog") ? { cover: oneOf(file, "cover", str(file, data, "cover", false), COVER_NAMES) } : {}),
            draft,
            tags,
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
    const facts = [
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
        plainText(body),
        "",
    ])
    mkdirSync(join(WEB, "public"), { recursive: true })
    writeFileSync(join(WEB, "public", "llms-full.txt"), [...facts, ...pieces].join("\n"))

    const count = (k: ContentKind) => all.filter((a) => a.entry.kind === k).length
    console.log(`content: ${count("blog")} posts, ${count("guides")} guides, ${count("changelog")} changelog entries (${published.length} published)`)
}

main().catch((err: unknown) => { console.error(err); process.exit(1) })
