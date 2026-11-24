import { SITE } from "@repo/core/site"
import type { MetadataRoute } from "next"
import { BOLI_CHAT } from "@repo/boli"
import { lastModified, publishedEntries } from "@/lib/content"
import { DOCS_PAGES, ROUTES } from "@/lib/routes"

/*
 * This site's pages plus every PUBLISHED post, guide and the changelog (drafts never). Sign-in and sign-up live on the
 * app's origin.
 *
 * lastmod (learned from gurukulhq): the static pages report a FIXED date, not build time - if every URL said "changed
 * just now" on each deploy, Google learns to ignore our lastmod, including the accurate per-post dates. Bump
 * STATIC_LAST_MODIFIED only when the static pages are genuinely revised. Posts and guides report their own
 * `updated ?? date`; the blog, guides and changelog indexes report their newest entry.
 */
const STATIC_LAST_MODIFIED = "2026-11-24"

export default function sitemap(): MetadataRoute.Sitemap {
    const url = (path: string) => (path === "/" ? SITE.url : `${SITE.url}${path}`)
    const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly", lastModifiedAt = STATIC_LAST_MODIFIED): MetadataRoute.Sitemap[number] => ({
        url: url(path),
        lastModified: lastModifiedAt,
        changeFrequency,
        priority,
    })

    const posts = publishedEntries("blog")
    const guides = publishedEntries("guides")
    const changes = publishedEntries("changelog")
    const newest = (list: typeof posts) => list.map(lastModified).sort().at(-1) ?? STATIC_LAST_MODIFIED

    return [
        page(ROUTES.landing, 1, "weekly"),
        page(ROUTES.models, 0.9, "monthly"),
        page(ROUTES.model(BOLI_CHAT.id), 0.9, "monthly"),
        page(ROUTES.docs, 0.8, "weekly"),
        ...DOCS_PAGES.map((d) => page(ROUTES.doc(d.slug), 0.8, "weekly")),
        page(ROUTES.blog, 0.7, "weekly", newest(posts)),
        ...posts.map((p) => page(ROUTES.post(p.slug), 0.7, "monthly", lastModified(p))),
        page(ROUTES.guides, 0.7, "weekly", newest(guides)),
        ...guides.map((g) => page(ROUTES.guide(g.slug), 0.7, "monthly", lastModified(g))),
        page(ROUTES.changelog, 0.6, "weekly", newest(changes)),
        page(ROUTES.about, 0.7, "monthly"),
        page(ROUTES.contact, 0.5, "monthly"),
        page(ROUTES.terms, 0.3, "yearly"),
        page(ROUTES.privacy, 0.3, "yearly"),
    ]
}
