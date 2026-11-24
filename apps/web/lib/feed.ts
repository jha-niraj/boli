import { SITE } from "@repo/core/site"
import { BRAND } from "@repo/boli"
import { getAuthor } from "@/content/authors"
import { TOPICS } from "@/content/topics"
import { entryHref, lastModified, type ContentEntry } from "./content"
import { absoluteUrl } from "./seo"
import { ROUTES } from "./routes"

/*
 * RSS 2.0 feeds (/blog/rss.xml, /changelog/rss.xml). Built at build time (the routes are force-static) from PUBLISHED
 * entries only - a draft in a feed reaches every reader the moment it is fetched. Pages advertise them with
 * <link rel="alternate" type="application/rss+xml"> through pageMeta's `feeds`.
 */

export const BLOG_FEED = { title: `${BRAND.name} blog`, path: ROUTES.blogRss } as const
export const CHANGELOG_FEED = { title: `${BRAND.name} changelog`, path: ROUTES.changelogRss } as const

function xml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

/** "2026-11-24" -> "Tue, 24 Nov 2026 00:00:00 GMT" (RFC 822, what RSS 2.0 wants). */
function rfc822(day: string): string {
    return new Date(`${day}T00:00:00Z`).toUTCString()
}

export function rssResponse(o: { title: string; description: string; path: string; feedPath: string; entries: readonly ContentEntry[] }): Response {
    const newest = o.entries.map(lastModified).sort().at(-1)
    const items = o.entries
        .map((e) => {
            const url = absoluteUrl(entryHref(e))
            const cats = [...(e.category ? [e.category] : []), ...e.topics.map((t) => TOPICS[t].title), ...(e.kind === "changelog" ? e.tags : [])]
            return [
                "    <item>",
                `      <title>${xml(e.title)}</title>`,
                `      <link>${xml(url)}</link>`,
                `      <guid isPermaLink="true">${xml(url)}</guid>`,
                `      <pubDate>${rfc822(e.date)}</pubDate>`,
                `      <description>${xml(e.summary)}</description>`,
                `      <dc:creator>${xml(getAuthor(e.author).name)}</dc:creator>`,
                ...[...new Set(cats)].map((c) => `      <category>${xml(c)}</category>`),
                "    </item>",
            ].join("\n")
        })
        .join("\n")
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(o.title)}</title>
    <link>${xml(absoluteUrl(o.path))}</link>
    <description>${xml(o.description)}</description>
    <language>en</language>
    <atom:link href="${xml(absoluteUrl(o.feedPath))}" rel="self" type="application/rss+xml" />
    <image>
      <url>${xml(`${SITE.url}/icon-512.png`)}</url>
      <title>${xml(o.title)}</title>
      <link>${xml(absoluteUrl(o.path))}</link>
    </image>${newest ? `\n    <lastBuildDate>${rfc822(newest)}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`
    return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } })
}
