import type { MetadataRoute } from "next"
import { SITE } from "@repo/core/site"

/** Everything public is crawlable; /design (dev-only review board) and /api/ never. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", allow: ["/"], disallow: ["/design", "/api/"] }],
        sitemap: `${SITE.url}/sitemap.xml`,
        host: SITE.url,
    }
}
