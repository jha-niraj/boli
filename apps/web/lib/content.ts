import { ENTRIES } from "@/content/generated/manifest"
import { BLOG_CATEGORIES, type BlogCategory, type ContentEntry, type ContentKind } from "./content-shared"
import { ROUTES } from "./routes"

/*
 * Reads the content index (content/generated/manifest.ts, written by scripts/build-content.ts). No fs: works the same
 * at build, in dev and on the Worker. Drafts are hidden in production builds and shown (with a Draft badge) in
 * development, so the owner can read a draft at its real URL before publishing it.
 */

export * from "./content-shared"

export const SHOW_DRAFTS = process.env.NODE_ENV !== "production"

/** Visible entries of one kind, newest first. */
export function listEntries(kind: ContentKind): ContentEntry[] {
    return ENTRIES.filter((e) => e.kind === kind && (SHOW_DRAFTS || !e.draft))
}

/** Published entries only (sitemap, llms.txt, JSON-LD lists) - never a draft, whatever the environment. */
export function publishedEntries(kind: ContentKind): ContentEntry[] {
    return ENTRIES.filter((e) => e.kind === kind && !e.draft)
}

export function getEntry(kind: ContentKind, slug: string): ContentEntry | undefined {
    return listEntries(kind).find((e) => e.slug === slug)
}

export const listPosts = () => listEntries("blog")
export const listGuides = () => listEntries("guides")
export const listChangelog = () => listEntries("changelog")

export function latestPost(): ContentEntry | undefined {
    return listPosts()[0]
}

export function isBlogCategory(v: string | null | undefined): v is BlogCategory {
    return !!v && (BLOG_CATEGORIES as readonly string[]).includes(v)
}

/** The entry's page on this site. Changelog entries live on one page, each under its own anchor. */
export function entryHref(e: ContentEntry): string {
    if (e.kind === "blog") return ROUTES.post(e.slug)
    if (e.kind === "guides") return ROUTES.guide(e.slug)
    return `${ROUTES.changelog}#${e.slug}`
}

/** When the piece last changed (for sitemap lastmod and dateModified). */
export function lastModified(e: ContentEntry): string {
    return e.updated ?? e.date
}

/**
 * Posts to read next: same category first, then shared tags, then the newest - never the post itself. Guides use the
 * same rule within guides.
 */
export function related(e: ContentEntry, n = 3): ContentEntry[] {
    const score = (o: ContentEntry) => (o.category && o.category === e.category ? 10 : 0) + o.tags.filter((t) => e.tags.includes(t)).length
    return listEntries(e.kind)
        .filter((o) => o.slug !== e.slug)
        .map((o, i) => ({ o, s: score(o), i }))
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .slice(0, n)
        .map((x) => x.o)
}

/** The newer and the older neighbour in the same kind (the list is newest first). */
export function adjacent(e: ContentEntry): { newer?: ContentEntry; older?: ContentEntry } {
    const list = listEntries(e.kind)
    const i = list.findIndex((o) => o.slug === e.slug)
    return { newer: i > 0 ? list[i - 1] : undefined, older: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined }
}
