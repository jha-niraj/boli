import type { Metadata } from "next"
import { SITE } from "@repo/core/site"

/**
 * One builder for every page's metadata (learned from gurukulhq's lib/seo.ts). Why: a page that sets a PARTIAL
 * `openGraph` ({ url }) does not inherit `type`, `siteName` or `locale` from the root layout - Next merges Open Graph
 * per key, so the missing ones vanish and crawlers report "Open Graph incomplete". Routing every page through here
 * guarantees the full og:* and twitter:* set plus a self-referencing ABSOLUTE canonical on NEXT_PUBLIC_SITE_URL.
 *
 * Titles: pass the page's own title; the root layout's template adds " | Boli" (keep `title` under about 55 characters).
 * `absoluteTitle` skips the template (the landing). Descriptions: one line, about 110-160 characters.
 *
 * OG images come from the file convention (`opengraph-image.tsx`): app/opengraph-image.tsx for every page, a
 * per-post card under blog/[slug] and guides/[slug]. File-based images win over config, so nothing is set here.
 */
export type PageMetaInput = {
    title: string
    description: string
    /** Route path beginning with "/" ("/" for the landing). */
    path: string
    absoluteTitle?: boolean
    type?: "website" | "article"
    /** Article only. YYYY-MM-DD. */
    publishedTime?: string
    modifiedTime?: string
    authors?: string[]
    section?: string
    tags?: string[]
    noindex?: boolean
    /** RSS feeds to advertise (<link rel="alternate" type="application/rss+xml">). Site paths. */
    feeds?: readonly { title: string; path: string }[]
}

export function absoluteUrl(path: string): string {
    return path === "/" || path === "" ? SITE.url : `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`
}

export function pageMeta(o: PageMetaInput): Metadata {
    const url = absoluteUrl(o.path)
    const fullTitle = o.absoluteTitle ? o.title : `${o.title} | ${SITE.name}`
    return {
        title: o.absoluteTitle ? { absolute: o.title } : o.title,
        description: o.description,
        alternates: {
            canonical: url,
            ...(o.feeds?.length ? { types: { "application/rss+xml": o.feeds.map((f) => ({ url: absoluteUrl(f.path), title: f.title })) } } : {}),
        },
        openGraph: {
            title: fullTitle,
            description: o.description,
            url,
            siteName: SITE.name,
            locale: "en_US",
            ...(o.type === "article"
                ? {
                      type: "article" as const,
                      ...(o.publishedTime ? { publishedTime: o.publishedTime } : {}),
                      ...(o.modifiedTime ? { modifiedTime: o.modifiedTime } : {}),
                      ...(o.authors?.length ? { authors: o.authors } : {}),
                      ...(o.section ? { section: o.section } : {}),
                      ...(o.tags?.length ? { tags: o.tags } : {}),
                  }
                : { type: "website" as const }),
        },
        twitter: { card: "summary_large_image", title: fullTitle, description: o.description },
        ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    }
}
