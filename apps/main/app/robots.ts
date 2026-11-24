import type { MetadataRoute } from "next"

/**
 * The app (app.bolihq.com) is not for search engines: only the sign-in and sign-up pages may be indexed. The public site
 * and its sitemap are apps/web.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", allow: ["/signin", "/signup"], disallow: ["/"] }],
    }
}
