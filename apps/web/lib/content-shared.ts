import type { CoverId } from "@repo/brand/art/covers/cover"
import type { AuthorId } from "../content/authors"
import type { TopicId } from "../content/topics"

/*
 * The content contract (Blog, Guides, Changelog), shared by the build script (scripts/build-content.ts, run before
 * `next dev` and `next build`) and the site. Framework-free and browser-safe: no fs, no next imports. The script reads
 * content/<kind>/<slug>.mdx, checks each file's frontmatter against these types and writes content/generated/.
 */

export const CONTENT_KINDS = ["blog", "guides", "changelog"] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]

/** Blog categories, in tab order. */
export const BLOG_CATEGORIES = ["Launch", "Product", "Research", "Company"] as const
export type BlogCategory = (typeof BLOG_CATEGORIES)[number]

/** Changelog tags (what part of Boli changed). */
export const CHANGELOG_TAGS = ["API", "Kura", "Billing", "Docs", "Site", "Models", "Account"] as const
export type ChangelogTag = (typeof CHANGELOG_TAGS)[number]

/**
 * Cover art a post or a guide may name: a story cover from @repo/brand/art/covers or a 96 x 60 vignette. Kept as a plain
 * list here so the build script can check frontmatter without loading the art (`satisfies` keeps it honest).
 */
export const COVER_NAMES = ["launch", "keyboard", "bill", "dhaka", "docsDesk", "contactPasal", "legalElder", "aboutScorecard", "aboutBench"] as const satisfies readonly CoverId[]
export type CoverName = (typeof COVER_NAMES)[number]

export type TocItem = { id: string; title: string; depth: 2 | 3 }

/** One question a piece answers (frontmatter `faqs`). Rendered at the end of the piece and as FAQPage JSON-LD. */
export type ContentFaq = { q: string; a: string }

/** How many "Key takeaways" lines a piece may carry (frontmatter `takeaways`). */
export const TAKEAWAYS_MIN = 3
export const TAKEAWAYS_MAX = 5

/** One file's frontmatter after checking, plus what the script derives from its body. */
export type ContentEntry = {
    kind: ContentKind
    slug: string
    title: string
    /** YYYY-MM-DD. */
    date: string
    /** YYYY-MM-DD, when the piece was meaningfully revised. */
    updated?: string
    /** Blog only. */
    category?: BlogCategory
    summary: string
    /** An id from content/authors.ts. */
    author: AuthorId
    cover?: CoverName
    draft: boolean
    tags: string[]
    /** Ids from content/topics.ts (blog and guides; the hubs under /blog/topics). */
    topics: TopicId[]
    /** 3-5 short lines for the "Key takeaways" box at the top (empty = no box). */
    takeaways: string[]
    /** Questions answered at the end of the piece (empty = no section, no FAQPage). */
    faqs: ContentFaq[]
    readingMinutes: number
    words: number
    toc: TocItem[]
}

/** A heading's anchor id: lowercase words joined by hyphens. The MDX h2/h3 and the TOC both use this. */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9ऀ-ॿ]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

/** Markdown inline syntax reduced to its words (`code`, [text](url), *em*). */
export function plainInline(md: string): string {
    return md
        .replace(/`([^`]*)`/g, "$1")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*_~]+/g, "")
        .trim()
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

/** "2026-11-24" -> "24 Nov 2026". Fixed format, no locale (the server and the browser print the same string). */
export function formatContentDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return iso
    return `${d} ${MONTHS[m - 1] ?? ""} ${y}`
}
