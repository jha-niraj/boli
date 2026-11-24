/**
 * Routes on THIS site (every in-site link is built from these, never a guessed URL). Page URLs carry no hyphens. Links
 * into the app (sign-in, Kura, keys, billing) are absolute and live in ./app-links.ts.
 */
export const ROUTES = {
    landing: "/",
    about: "/about",
    contact: "/contact",
    /** /contact with a topic picked (a CONTACT_TOPICS value, e.g. "Enterprise"). */
    contactAbout: (topic: string) => `/contact?topic=${encodeURIComponent(topic)}`,
    docs: "/docs",
    doc: (slug: string) => `/docs/${slug}`,
    terms: "/terms",
    privacy: "/privacy",
    pricing: "/#pricing",
    faq: "/#faq",
    blog: "/blog",
    post: (slug: string) => `/blog/${slug}`,
    /** The blog index with a category tab picked (a BLOG_CATEGORIES value). */
    blogCategory: (category: string) => `/blog?category=${encodeURIComponent(category)}`,
    guides: "/guides",
    guide: (slug: string) => `/guides/${slug}`,
    changelog: "/changelog",
    models: "/models",
    /** One model's page (marketing URLs may carry the model id's hyphen, AGENTS.md section 8). */
    model: (id: string) => `/models/${id}`,
    modelsRoadmap: "/models#roadmap",
    llms: "/llms.txt",
    llmsFull: "/llms-full.txt",
} as const

/** Docs pages. Slugs carry no hyphens. apps/main links to them through its lib/web-links.ts (DocSlug). */
export const DOCS_PAGES = [
    { slug: "quickstart", title: "Quickstart" },
    { slug: "authentication", title: "Authentication and errors" },
    { slug: "chatcompletions", title: "Chat completions" },
    { slug: "models", title: "Models, pricing and limits" },
] as const
