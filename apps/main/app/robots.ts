import type { MetadataRoute } from "next"
import { SITE } from "@repo/core/site"

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", allow: ["/", "/signin", "/signup", "/terms", "/privacy"], disallow: ["/kura", "/profile", "/api/"] }],
        sitemap: `${SITE.url}/sitemap.xml`,
    }
}
