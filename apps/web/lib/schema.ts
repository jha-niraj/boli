import { SITE } from "@repo/core/site"
import { BOLI_CHAT, BRAND, CREDIT_PACKS, CURRENCY, KURA, WELCOME_CREDITS } from "@repo/boli"
import type { ContentEntry } from "./content-shared"
import { lastModified } from "./content"
import { absoluteUrl } from "./seo"
import { ROUTES } from "./routes"

/*
 * JSON-LD builders (learned from gurukulhq's lib/schema.ts). The Organization and WebSite nodes are emitted once, from
 * app/layout.tsx; everything else references them by @id instead of restating them. Render with <JsonLd>.
 *
 * Geography is a FACT here, never a URL segment (apps/web/CLAUDE.md): `areaServed` is an array so a market is appended,
 * never replaced.
 *
 * SoftwareApplication note (gurukulhq, measured): Google's Software App rich result wants `aggregateRating` or `review`
 * besides name + offers, and reports the node as an error in Search Console without one. Inventing a rating is a spam
 * policy violation, so none is added. The node is still valid schema.org and useful to answer engines; if Search
 * Console flags it, switch to `Service` (as gurukulhq did) rather than adding a fake rating.
 */

export const ORG_ID = `${SITE.url}/#organization`
export const WEBSITE_ID = `${SITE.url}/#website`

const AREA_SERVED = [{ "@type": "Country", name: "Nepal" }] as const

export type JsonLdNode = Record<string, unknown>

export function organizationSchema(): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": ORG_ID,
        name: BRAND.name,
        slogan: BRAND.tagline,
        description: BRAND.description,
        url: SITE.url,
        logo: { "@type": "ImageObject", url: `${SITE.url}/icon-512.png`, width: 512, height: 512 },
        email: BRAND.contactEmail,
        areaServed: AREA_SERVED,
        contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: BRAND.contactEmail, availableLanguage: ["English", "Nepali"] }],
    }
}

export function websiteSchema(): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: BRAND.name,
        url: SITE.url,
        description: BRAND.description,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
    }
}

/** The credit packs as offers in NPR (what the landing's pricing shows). */
function packOffers(): JsonLdNode[] {
    return CREDIT_PACKS.map((p) => ({
        "@type": "Offer",
        name: `${p.name} - ${p.credits.toLocaleString("en-US")} credits`,
        price: p.rupees,
        priceCurrency: CURRENCY,
        url: absoluteUrl(ROUTES.pricing),
    }))
}

/** Boli's API and Kura (landing), with the packs and the free start as offers. */
export function softwareApplicationSchemas(): JsonLdNode[] {
    const free = { "@type": "Offer", name: `${WELCOME_CREDITS} free credits`, price: 0, priceCurrency: CURRENCY }
    return [
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: `${BRAND.name} API`,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            url: absoluteUrl(ROUTES.doc("quickstart")),
            description: `An OpenAI-compatible API for ${BOLI_CHAT.id}, an open model that reads ${BOLI_CHAT.languages.join(", ")}. Priced per token in Nepali rupees.`,
            publisher: { "@id": ORG_ID },
            areaServed: AREA_SERVED,
            offers: [free, ...packOffers()],
        },
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: KURA.name,
            applicationCategory: "CommunicationApplication",
            operatingSystem: "Web",
            url: SITE.url,
            description: `${KURA.subtitle}. ${KURA.meaning}.`,
            publisher: { "@id": ORG_ID },
            areaServed: AREA_SERVED,
            offers: [free],
        },
    ]
}

/** A blog post (BlogPosting) or a guide (TechArticle). */
export function articleSchema(e: ContentEntry, opts: { path: string; image: string }): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": e.kind === "guides" ? "TechArticle" : "BlogPosting",
        headline: e.title,
        description: e.summary,
        datePublished: e.date,
        dateModified: lastModified(e),
        author: { "@type": "Organization", name: e.author, url: SITE.url },
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(opts.path) },
        image: opts.image,
        inLanguage: "en",
        wordCount: e.words,
        ...(e.category ? { articleSection: e.category } : {}),
        ...(e.tags.length ? { keywords: e.tags.join(", ") } : {}),
        isPartOf: { "@id": WEBSITE_ID },
    }
}

/** Breadcrumbs: Home is added first. Paths are site paths. */
export function breadcrumbSchema(items: readonly { name: string; path: string }[]): JsonLdNode {
    const all = [{ name: "Home", path: "/" }, ...items]
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: all.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
    }
}

export function faqSchema(items: readonly { q: string; a: string }[]): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    }
}
