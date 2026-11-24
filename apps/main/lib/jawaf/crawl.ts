import "server-only"
import { fetchRobots, firecrawlMap, robotsAllows } from "@repo/webdata"
import { AppError } from "@repo/errors"
import { urlKey } from "./text"

/**
 * Site mapping (Firecrawl map, 1 Firecrawl credit) -> the page list the owner ticks. Pure ranking below the fetches.
 *
 * Kept: same site (the host, with or without www, plus its subdomains' pages only when they are the site itself),
 * http(s) HTML-looking URLs, allowed by robots.txt for `*`. Dropped: login / account / cart / checkout / admin, tag /
 * category / author / feed / pagination / search pages, files (PDFs are uploaded as files instead), duplicates.
 * Ranked: the home page, then pages whose path names what customers ask about (about, contact, fees, prices,
 * admission, courses, services, products, rooms, doctors, FAQ, hours, location, policies), shallow before deep,
 * dated blog posts last. The top `limit` are pre-ticked.
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
    /\/(tag|tags|category|categories|author|feed|rss|comments|attachment|amp)(\/|$)/i,
    /\/page\/\d+\/?$/i,
    /[?&](replytocom|share|print|s|q|search|page|sort|orderby|filter|add-to-cart)=/i,
    /\/(search|cdn-cgi|wp-json|wp-content|wp-includes|xmlrpc)(\/|$)/i,
    /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|rar|docx?|xlsx?|pptx?|mp4|mp3|webm|css|js|xml|json|txt)(\?|$)/i,
    /^mailto:|^tel:|^javascript:/i,
]

const USEFUL: [RegExp, number][] = [
    [/(about|who-we-are|our-story|introduction|parichaya)/i, 60],
    [/(contact|location|reach-us|find-us|address|sampark)/i, 60],
    [/(fee|fees|price|pricing|cost|rate|tariff|plans?|package|shulka)/i, 70],
    [/(admission|enrol|enroll|apply|intake|bharna)/i, 60],
    [/(course|program|programme|class|curriculum|subject|syllabus)/i, 50],
    [/(service|product|treatment|department|speciality|specialty|menu|rooms?|facility|facilities|amenities)/i, 50],
    [/(faq|questions|help|support)/i, 55],
    [/(doctor|team|staff|faculty|teacher|people)/i, 35],
    [/(hours|timing|schedule|opening|time-table|timetable)/i, 50],
    [/(policy|policies|terms|refund|return|cancellation|shipping|delivery|privacy|rules)/i, 30],
    [/(gallery|event|notice|news)/i, 5],
    [/(blog|article|post|story|news)\//i, -70],
]

function score(u: URL): number {
    const path = decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/, "")
    if (!path || path === "/index.html" || path === "/home") return 1000
    let s = 0
    for (const [re, w] of USEFUL) if (re.test(path)) s += w
    const depth = path.split("/").filter(Boolean).length
    s -= (depth - 1) * 15
    if (/\/(19|20)\d{2}\//.test(path) || /\d{4}-\d{2}-\d{2}/.test(path)) s -= 40
    if (u.search) s -= 10
    if (path.length > 80) s -= 10
    return s
}

function sameSite(u: URL, root: URL): boolean {
    const a = u.hostname.replace(/^www\./, "")
    const b = root.hostname.replace(/^www\./, "")
    return a === b
}

/** Rank and filter mapped links (pure; exported for tests and the eval). */
export function rankLinks(rootUrl: string, links: { url: string; title?: string | null }[], limit: number, allows: (pathWithQuery: string) => boolean = () => true): SiteMap {
    const root = new URL(rootUrl)
    const seen = new Set<string>()
    const kept: { url: string; key: string; title: string | null; s: number }[] = []
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
        kept.push({ url: u.toString(), key, title: l.title?.trim() || null, s: score(u) })
    }
    kept.sort((a, b) => b.s - a.s || a.url.length - b.url.length)
    return {
        pages: kept.map((k, i) => ({ url: k.url, urlKey: k.key, title: k.title, rank: i, suggested: i < limit })),
        found: links.length,
        dropped,
    }
}

/** Map a site (Firecrawl map + robots.txt) and rank its pages. `limit` = how many to pre-tick (the bot's page limit). */
export async function mapSite(url: string, limit: number): Promise<SiteMap> {
    const [links, robots] = await Promise.all([
        firecrawlMap(url, { limit: Math.min(1000, Math.max(limit * 3, 100)) }).catch((err: unknown) => {
            if (err instanceof AppError && err.kind !== "unknown") throw err
            throw new AppError("network", "That website could not be mapped. Check the address, or add pages one by one.", { cause: err })
        }),
        fetchRobots(url),
    ])
    return rankLinks(url, links, limit, (p) => robotsAllows(robots, p))
}
