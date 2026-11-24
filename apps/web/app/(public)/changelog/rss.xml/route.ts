import { publishedEntries } from "@/lib/content"
import { CHANGELOG_FEED, rssResponse } from "@/lib/feed"
import { ROUTES } from "@/lib/routes"

/** /changelog/rss.xml - published changelog entries, newest first (RSS 2.0). Static: built once at build time. */
export const dynamic = "force-static"

export function GET() {
    return rssResponse({
        title: CHANGELOG_FEED.title,
        description: "Every change to Boli as it ships: the API, Kura, billing, docs and the site, newest first.",
        path: ROUTES.changelog,
        feedPath: CHANGELOG_FEED.path,
        entries: publishedEntries("changelog"),
    })
}
