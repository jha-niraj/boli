import { publishedEntries } from "@/lib/content"
import { BLOG_FEED, rssResponse } from "@/lib/feed"
import { ROUTES } from "@/lib/routes"

/** /blog/rss.xml - published posts, newest first (RSS 2.0). Static: built once at build time. */
export const dynamic = "force-static"

export function GET() {
    return rssResponse({
        title: BLOG_FEED.title,
        description: "Stories from Boli: launches, product notes and research on open AI for Nepali, Romanized Nepali and English.",
        path: ROUTES.blog,
        feedPath: BLOG_FEED.path,
        entries: publishedEntries("blog"),
    })
}
