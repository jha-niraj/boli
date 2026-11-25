import { fetchRobots, firecrawlMap, robotsAllows } from "@repo/webdata"
import { AppError } from "@repo/errors"
import { urlKey } from "./text"

/**
 * Site mapping (Firecrawl map, 1 Firecrawl credit) -> the page list the owner ticks. Pure ranking below the fetches.
 *
 * Kept: same site (the host, with or without www, plus its subdomains' pages only when they are the site itself),
 * http(s) HTML-looking URLs, allowed by robots.txt for `*`. Dropped: login / account / cart / checkout / admin, feed /
 * pagination / search pages, files (PDFs are uploaded as files instead), duplicates.
 * Ranked: home, pricing / fees, about, contact, services / products / features, admission / booking, FAQ / help, then
 * the rest; blog / news / changelog / legal / author / tag pages last. Only the best `preTick` (the free allowance)
 * are pre-ticked, never a low-value page, so a new bot's first read is free.
 */

export interface MappedPage {
    url: string
    urlKey: string
    title: string | null
    rank: number
    suggested: boolean
}

export interface SiteMap {
    pages: MappedPage[]
    found: number
    dropped: number
}

const DROP = [
    /\/(log-?in|sign-?in|sign-?up|register|logout|account|my-account|profile|dashboard|admin|wp-admin|wp-login|cart|basket|checkout|order-received|wishlist)(\/|$|\?)/i,
    /\/(feed|rss|comments|attachment|amp)(\/|$)/i,
    /\/page\/\d+\/?$/i,
    /[?&](replytocom|share|print|s|q|search|page|sort|orderby|filter|add-to-cart)=/i,
    /\/(search|cdn-cgi|wp-json|wp-content|wp-includes|xmlrpc)(\/|$)/i,
    /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|rar|docx?|xlsx?|pptx?|mp4|mp3|webm|css|js|xml|json|txt)(\?|$)/i,
    /^mailto:|^tel:|^javascript:/i,
]

/**
 * Pre-tick order (owner, 2026-11-25): what customers ask about first. A page takes the FIRST tier any of its path words
 * matches; inside a tier shallow and short paths come first. Words are path segments split on - _ . so "rate" does not
 * match "corporate".
 */
const TIERS: RegExp[] = [
    /^(fee|fees|price|prices|pricing|cost|costs|rates?|tariffs?|plans?|packages?|shulka?|subscriptions?)$/,
    /^(about|about-us|aboutus|who|story|introduction|intro|parichaya|mission|overview|company)$/,
    /^(contact|contacts|contactus|location|locations|reach|find|address|sampark|visit)$/,
    /^(services?|products?|features?|solutions?|offerings?|courses?|programs?|programmes?|treatments?|departments?|menu|rooms?|facilities|facility|amenities)$/,
    /^(admissions?|enrol|enroll|enrollment|enrolment|apply|intake|bharna|booking|book|bookings|appointments?|reserve|reservations?|demo|register-interest)$/,
    /^(faq|faqs|questions|help|support|how-it-works|howitworks)$/,
]

/**
 * Pages that rarely answer a customer's question: listed and pickable, never pre-ticked, ranked last. Blog / news /
 * changelog posts, legal pages (privacy, terms, refund, cookies), author / tag / category archives, dated posts.
 */
const LOW_SEGMENT = /^(blog|blogs|news|article|articles|posts?|stories|changelog|changelogs|release-notes|releases|updates|whats-new|press|media|insights|author|authors|tag|tags|category|categories|archive|archives|privacy|privacy-policy|terms|terms-of-service|terms-of-use|terms-and-conditions|tos|legal|refund|refunds|refund-policy|return-policy|cookie|cookies|cookie-policy|disclaimer|gdpr|sitemap)$/

/** Article-style pages (LOW_SEGMENT plus guides / resources / learn): never the source of a price (answer.ts). */
const ARTICLE_SEGMENT = /^(guides?|resources|learn|tutorials?|knowledge-base|kb|academy-blog|case-studies|case-study)$/

/** A blog / news / guide / legal / archive page by its URL (answer.ts down-ranks these for price questions). */
export function isArticleUrl(url: string | null | undefined): boolean {
    if (!url) return false
    let u: URL
    try {
        u = new URL(url)
    } catch {
        return false
    }
    const path = decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/, "")
    if (!path) return false
    const { words } = pathWords(path)
    return pageRank(u).low || words.some((w) => ARTICLE_SEGMENT.test(w))
}

/** "pricing" from "/pricing", "about", "us" from "/about-us" - plus the joined segment so "about-us" matches whole. */
function pathWords(path: string): { segments: string[]; words: string[] } {
    const segments = path.split("/").filter(Boolean)
    const words = segments.flatMap((seg) => [seg, ...seg.split(/[-_.]+/)]).filter(Boolean)
    return { segments, words }
}

export interface PageRankInfo {
    /** 0 = home, 1.. = the TIERS order, TIERS.length + 1 = the rest, TIERS.length + 2 = low value (never pre-ticked). */
    tier: number
    low: boolean
    /** Order inside a tier (higher first). */
    within: number
}

export const REST_TIER = TIERS.length + 1
export const LOW_TIER = TIERS.length + 2

/** Where a URL ranks (pure; exported for tests). */
export function pageRank(u: URL): PageRankInfo {
    const path = decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/, "")
    if (!path || path === "/index.html" || path === "/index.php" || path === "/home") return { tier: 0, low: false, within: 0 }
    const { segments, words } = pathWords(path)
    const dated = /\/(19|20)\d{2}\//.test(path) || /\d{4}-\d{2}-\d{2}/.test(path)
    const low = dated || words.some((w) => LOW_SEGMENT.test(w))
    let within = -(segments.length - 1) * 15
    if (u.search) within -= 10
    if (path.length > 80) within -= 10
    if (low) return { tier: LOW_TIER, low: true, within }
    const t = TIERS.findIndex((re) => words.some((w) => re.test(w)))
    if (t >= 0) return { tier: t + 1, low: false, within }
    // The rest: what customers still ask about (hours, team, policies) before everything else.
    if (words.some((w) => /^(hours|timing|timings|schedule|opening|timetable|time-table)$/.test(w))) within += 30
    if (words.some((w) => /^(doctors?|team|staff|faculty|teachers?|people)$/.test(w))) within += 20
    if (words.some((w) => /^(policy|policies|cancellation|shipping|delivery|rules|eligibility)$/.test(w))) within += 15
    if (words.some((w) => /^(gallery|events?|notices?)$/.test(w))) within -= 20
    return { tier: REST_TIER, low: false, within }
}

function sameSite(u: URL, root: URL): boolean {
    const a = u.hostname.replace(/^www\./, "")
    const b = root.hostname.replace(/^www\./, "")
    return a === b
}

/** Rank and filter mapped links (pure; exported for tests and the eval). `preTick` = how many are suggested (pre-ticked). */
export function rankLinks(rootUrl: string, links: { url: string; title?: string | null }[], preTick: number, allows: (pathWithQuery: string) => boolean = () => true): SiteMap {
    const root = new URL(rootUrl)
    const seen = new Set<string>()
    const kept: { url: string; key: string; title: string | null; r: PageRankInfo }[] = []
    let dropped = 0
    // The entry URL is always a candidate (a one-page site still reads).
    for (const l of [{ url: rootUrl, title: null }, ...links]) {
        let u: URL
        try {
            u = new URL(l.url, rootUrl)
        } catch {
            dropped++
            continue
        }
        u.hash = ""
        const key = urlKey(u.toString())
        if (!key || seen.has(key)) {
            if (key) dropped++
            continue
        }
        seen.add(key)
        if ((u.protocol !== "https:" && u.protocol !== "http:") || !sameSite(u, root) || DROP.some((re) => re.test(u.pathname + u.search)) || !allows(u.pathname + u.search)) {
            dropped++
            continue
        }
        kept.push({ url: u.toString(), key, title: l.title?.trim() || null, r: pageRank(u) })
    }
    // Inside a tier: shallow / short first. Across the named tiers: round robin (the best pricing, about, contact,
    // services, admission and FAQ page each, then the second best of each...), so 30 feature pages cannot push the FAQ
    // out of the free 20. Then the rest, then low-value pages.
    kept.sort((a, b) => a.r.tier - b.r.tier || b.r.within - a.r.within || a.url.length - b.url.length)
    const seat = new Map<number, number>()
    const order = kept.map((k) => {
        const n = seat.get(k.r.tier) ?? 0
        seat.set(k.r.tier, n + 1)
        const named = k.r.tier >= 1 && k.r.tier < REST_TIER
        return { k, key: named ? [1, n, k.r.tier] : [k.r.tier === 0 ? 0 : k.r.tier, 0, n] }
    })
    order.sort((a, b) => a.key[0]! - b.key[0]! || a.key[1]! - b.key[1]! || a.key[2]! - b.key[2]!)
    kept.splice(0, kept.length, ...order.map((o) => o.k))
    // Pre-ticked: the best `preTick` pages that are not low value (blog, news, legal, archives stay unticked).
    let room = preTick
    return {
        pages: kept.map((k, i) => {
            const suggested = !k.r.low && room > 0
            if (suggested) room--
            return { url: k.url, urlKey: k.key, title: k.title, rank: i, suggested }
        }),
        found: links.length,
        dropped,
    }
}

/**
 * Map a site (Firecrawl map + robots.txt) and rank its pages. `limit` = the bot's page limit (how many links to ask the
 * map for); `preTick` = how many to pre-tick (the free allowance, JAWAF_PRICES.freePagesPerBot).
 */
export async function mapSite(url: string, limit: number, preTick: number): Promise<SiteMap> {
    const [links, robots] = await Promise.all([
        firecrawlMap(url, { limit: Math.min(1000, Math.max(limit * 3, 100)) }).catch((err: unknown) => {
            if (err instanceof AppError && err.kind !== "unknown") throw err
            throw new AppError("network", "That website could not be mapped. Check the address, or add pages one by one.", { cause: err })
        }),
        fetchRobots(url),
    ])
    return rankLinks(url, links, preTick, (p) => robotsAllows(robots, p))
}
