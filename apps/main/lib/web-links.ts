/**
 * The public site (landing, About, Contact, Docs, Terms, Privacy) is apps/web on its OWN origin: bolihq.com in
 * production, http://localhost:3102 locally (NEXT_PUBLIC_WEB_URL). Never link to those paths relatively from this app -
 * they do not exist here. Build every such link from the helpers below. AppLink renders an absolute URL as a plain
 * navigation in the same tab (no prefetch, no pending bar).
 *
 * No fallback to the live domain (AGENTS.md section 4): a missing URL on staging must not send people to production.
 * Local dev only: localhost:3102.
 */
function webOrigin(): string {
    const raw = (process.env.NEXT_PUBLIC_WEB_URL ?? "").trim()
    return (raw || "http://localhost:3102").replace(/\/+$/, "")
}

export const WEB_URL = webOrigin()

/** Absolute URL to a path on the public site: `webUrl("/docs")` -> `https://bolihq.com/docs`. */
export const webUrl = (path = "/") => `${WEB_URL}${path.startsWith("/") ? path : `/${path}`}`

/** Docs slugs on the site (apps/web lib/routes.ts DOCS_PAGES). Slugs carry no hyphens. */
export type DocSlug = "quickstart" | "authentication" | "chatcompletions" | "models"

export const WEB = {
    home: webUrl("/"),
    docs: webUrl("/docs"),
    doc: (slug: DocSlug) => webUrl(`/docs/${slug}`),
    about: webUrl("/about"),
    contact: webUrl("/contact"),
    /** /contact with a topic picked (a CONTACT_TOPICS value on the site, e.g. "Enterprise"). */
    contactAbout: (topic: string) => webUrl(`/contact?topic=${encodeURIComponent(topic)}`),
    terms: webUrl("/terms"),
    privacy: webUrl("/privacy"),
} as const
