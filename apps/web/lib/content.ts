import { ENTRIES } from "@/content/generated/manifest"
import { TOPICS, TOPIC_IDS, type TopicId } from "@/content/topics"
import { BLOG_CATEGORIES, type BlogCategory, type ContentEntry, type ContentKind } from "./content-shared"
import { ROUTES } from "./routes"

/*
 * Reads the content index (content/generated/manifest.ts, written by scripts/build-content.ts). No fs: works the same
 * at build, in dev and on the Worker. Drafts are hidden in production builds and shown (with a Draft badge) in
 * development, so the owner can read a draft at its real URL before publishing it.
 */

export * from "./content-shared"
export { getAuthor, type Author } from "@/content/authors"
export { TOPICS, isTopicId, type TopicId } from "@/content/topics"

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
 * Posts to read next: shared topics and the same category first, then shared tags, then the newest - never the post itself. Guides use the
 * same rule within guides.
 */
export function related(e: ContentEntry, n = 3): ContentEntry[] {
    const score = (o: ContentEntry) =>
        (o.category && o.category === e.category ? 10 : 0) + 5 * o.topics.filter((t) => e.topics.includes(t)).length + o.tags.filter((t) => e.tags.includes(t)).length
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

/* -------------------------------------------------------------------------------------------------------------- */
/* Topics (content/topics.ts): a hub lists the posts AND guides that carry the topic, newest first.                 */
/* -------------------------------------------------------------------------------------------------------------- */

/** Visible posts and guides on a topic (drafts in development only), newest first. */
export function entriesOnTopic(id: TopicId): ContentEntry[] {
    return ENTRIES.filter((e) => (e.kind === "blog" || e.kind === "guides") && (SHOW_DRAFTS || !e.draft) && e.topics.includes(id))
}

/** Published posts and guides on a topic (sitemap, JSON-LD lists, feeds) - never a draft. */
export function publishedOnTopic(id: TopicId): ContentEntry[] {
    return ENTRIES.filter((e) => (e.kind === "blog" || e.kind === "guides") && !e.draft && e.topics.includes(id))
}

/**
 * Topics that have a page: at least one visible entry. In production that is "at least one published entry", so a
 * hub is never built empty, linked or in the sitemap before something on it is public.
 */
export function topicsInUse(): { id: TopicId; title: string; description: string; count: number }[] {
    return TOPIC_IDS.map((id) => ({ id, ...TOPICS[id], count: entriesOnTopic(id).length })).filter((t) => t.count > 0)
}

/** Topics with at least one PUBLISHED entry (sitemap, indexing). */
export function publishedTopics(): TopicId[] {
    return TOPIC_IDS.filter((id) => publishedOnTopic(id).length > 0)
}
