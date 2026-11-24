import { SITE } from "@repo/core/site"
import { BOLI_CHAT, BRAND, CREDIT_PACKS, CURRENCY, KURA, WELCOME_CREDITS } from "@repo/boli"
import { getAuthor } from "@/content/authors"
import { TOPICS } from "@/content/topics"
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
 * WHY `Service` AND NOT `SoftwareApplication` (gurukulhq's lib/schema.ts, measured there): Google treats a
 * SoftwareApplication node as a Software App rich-result candidate whose required properties are name + offers.price +
 * EITHER aggregateRating OR review. Without a rating every page carrying it fails Google's validator ("Structured data
 * has rich results validation error" in their site audit). Inventing a rating is a Google spam-policy violation that
 * risks a manual action on the whole domain. `Service` describes Boli just as accurately (a paid service run for
 * people and developers), carries the offers in NPR for answer engines and Bing, and is not a rich-result type, so
 * nothing is validated and nothing errors. gurukulhq's conclusion, followed here: no SoftwareApplication node at all
 * until there are real, verifiable reviews - then switch back AND add a genuine aggregateRating in the same change,
 * never one without the other.
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

export const API_SERVICE_ID = `${SITE.url}/#api`
export const KURA_SERVICE_ID = `${SITE.url}/#kura`

function freeOffer(): JsonLdNode {
    return { "@type": "Offer", name: `${WELCOME_CREDITS} free credits`, price: 0, priceCurrency: CURRENCY, description: "Granted once when the email is verified." }
}

/** The API as a Service (landing, the boli-chat page): the free start and the credit packs as offers in NPR. */
export function apiServiceSchema(): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": API_SERVICE_ID,
        name: `${BRAND.name} API`,
        serviceType: "Open language model API",
        category: "Developer tools",
        url: absoluteUrl(ROUTES.doc("quickstart")),
        description: `An OpenAI-compatible API for ${BOLI_CHAT.id}, an open model that reads ${BOLI_CHAT.languages.join(", ")}. Priced per token in Nepali rupees.`,
        provider: { "@id": ORG_ID },
        areaServed: AREA_SERVED,
        availableLanguage: ["English", "Nepali"],
        offers: [freeOffer(), ...packOffers()],
    }
}

/** Kura, the chat, as a Service (the landing and /kura). Jawaf gets none while it is a pilot: no offer to state. */
export function kuraServiceSchema(): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": KURA_SERVICE_ID,
        name: KURA.name,
        serviceType: "AI chat assistant",
        url: absoluteUrl(ROUTES.kura),
        description: `${KURA.subtitle}. ${KURA.meaning}.`,
        provider: { "@id": ORG_ID },
        areaServed: AREA_SERVED,
        availableLanguage: ["English", "Nepali"],
        offers: [freeOffer()],
    }
}

/** Both services (the landing). */
export function serviceSchemas(): JsonLdNode[] {
    return [apiServiceSchema(), kuraServiceSchema()]
}

/**
 * An article's `author` from content/authors.ts. The team writes as the company, so an Organization author IS the
 * site's Organization node (by @id, same name); a Person carries the E-E-A-T fields (jobTitle, description, knowsAbout,
 * sameAs) and works for the Organization.
 */
export function authorSchema(id: string): JsonLdNode {
    const a = getAuthor(id)
    if (a.kind === "Organization") return { "@type": "Organization", "@id": ORG_ID, name: BRAND.name, url: SITE.url }
    return {
        "@type": "Person",
        name: a.name,
        jobTitle: a.role,
        description: a.bio,
        ...(a.knowsAbout.length ? { knowsAbout: [...a.knowsAbout] } : {}),
        ...(a.links.length ? { sameAs: a.links.map((l) => l.href) } : {}),
        worksFor: { "@id": ORG_ID },
    }
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
        author: authorSchema(e.author),
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(opts.path) },
        image: opts.image,
        inLanguage: "en",
        wordCount: e.words,
        ...(e.category ? { articleSection: e.category } : {}),
        ...(e.tags.length || e.topics.length ? { keywords: [...new Set([...e.topics.map((t) => TOPICS[t].title), ...e.tags])].join(", ") } : {}),
        ...(e.topics.length ? { about: e.topics.map((t) => ({ "@type": "Thing", name: TOPICS[t].title })) } : {}),
        isAccessibleForFree: true,
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

/**
 * An index page (the blog, guides, changelog, models, a topic hub) as a CollectionPage whose mainEntity is an ItemList
 * of what it lists. Pass PUBLISHED items only - a draft in structured data would announce it before it is public. No
 * items = no ItemList (an empty list is not a fact worth stating).
 */
export function collectionPageSchema(o: { name: string; description: string; path: string; items: readonly { name: string; path: string }[]; about?: string }): JsonLdNode {
    const url = absoluteUrl(o.path)
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        name: o.name,
        description: o.description,
        url,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": ORG_ID },
        ...(o.about ? { about: { "@type": "Thing", name: o.about } } : {}),
        ...(o.items.length
            ? {
                  mainEntity: {
                      "@type": "ItemList",
                      numberOfItems: o.items.length,
                      itemListElement: o.items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
                  },
              }
            : {}),
    }
}
