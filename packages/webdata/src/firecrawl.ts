// @repo/webdata - Firecrawl scrape (one URL -> clean markdown) and map (a site's URLs) over fetch (FIRECRAWL_API_KEY).
import { AppError } from '@repo/errors'
import { envKey, postJson } from './http'

const BASE = 'https://api.firecrawl.dev/v2'

export interface FirecrawlScrapeOptions {
    /** Default ['markdown']. 'summary' and 'links' are extra; `json` extraction is not exposed here (5x the credits). */
    formats?: Array<'markdown' | 'html' | 'links' | 'summary'>
    /** Strip nav, footers and boilerplate. Default true. */
    onlyMainContent?: boolean
    /** Serve a cached copy fetched within this many ms (cheaper, faster). Never on a change-detection read. */
    maxAge?: number
    /**
     * Cap the pages parsed from a PDF. Firecrawl bills a PDF per PAGE, so any URL a user can supply should set this.
     * Default 10.
     */
    pdfMaxPages?: number
    apiKey?: string
    timeoutMs?: number
}

export interface FirecrawlScrapeResult {
    url: string
    markdown: string
    html: string | null
    links: string[]
    summary: string | null
    title: string | null
    description: string | null
    statusCode: number | null
}

/** True when FIRECRAWL_API_KEY is set. */
export function isFirecrawlConfigured(): boolean {
    return Boolean(envKey('FIRECRAWL_API_KEY'))
}

function key(opts: { apiKey?: string }): string {
    const k = opts.apiKey?.trim() || envKey('FIRECRAWL_API_KEY')
    if (!k) throw new AppError('unknown', 'Web page fetching is not configured (FIRECRAWL_API_KEY is not set).')
    return k
}

function assertHttpUrl(url: string): void {
    let u: URL
    try {
        u = new URL(url)
    } catch {
        throw new AppError('validation', 'That is not a valid web address.')
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new AppError('validation', 'Only http and https pages can be read.')
}

/** Fetch one page as clean data (1 credit; PDFs 1 per page up to `pdfMaxPages`). Throws AppError on failure. */
export async function firecrawlScrape(url: string, opts: FirecrawlScrapeOptions = {}): Promise<FirecrawlScrapeResult> {
    const apiKey = key(opts)
    assertHttpUrl(url)
    const body: Record<string, unknown> = {
        url,
        formats: opts.formats ?? ['markdown'],
        onlyMainContent: opts.onlyMainContent ?? true,
        parsers: [{ type: 'pdf', maxPages: opts.pdfMaxPages ?? 10 }],
        ...(opts.maxAge !== undefined ? { maxAge: opts.maxAge } : {}),
    }
    const res = await postJson<{
        success?: boolean
        error?: string
        data?: {
            markdown?: string
            html?: string
            links?: string[]
            summary?: string
            metadata?: { title?: string; description?: string; sourceURL?: string; statusCode?: number }
        }
    }>('Web page fetching', `${BASE}/scrape`, { authorization: `Bearer ${apiKey}` }, body, opts.timeoutMs ?? 45_000)
    // A 200 with success:false is a page-level refusal (blocked, not found) - never an empty "blank page".
    if (!res.data) throw new AppError('unknown', res.error ? `Could not read that page: ${res.error.slice(0, 200)}` : 'Could not read that page.')
    const d = res.data
    return {
        url: d.metadata?.sourceURL ?? url,
        markdown: d.markdown ?? '',
        html: d.html ?? null,
        links: d.links ?? [],
        summary: d.summary ?? null,
        title: d.metadata?.title ?? null,
        description: d.metadata?.description ?? null,
        statusCode: d.metadata?.statusCode ?? null,
    }
}

export interface FirecrawlMapLink {
    url: string
    title?: string
    description?: string
}

/** List a site's URLs (1 credit however many come back) - map, then scrape only the pages you need. */
export async function firecrawlMap(
    url: string,
    opts: { search?: string; limit?: number; apiKey?: string; timeoutMs?: number } = {},
): Promise<FirecrawlMapLink[]> {
    const apiKey = key(opts)
    assertHttpUrl(url)
    const res = await postJson<{ links?: Array<FirecrawlMapLink | string> }>(
        'Web page fetching',
        `${BASE}/map`,
        { authorization: `Bearer ${apiKey}` },
        { url, ...(opts.search ? { search: opts.search } : {}), ...(opts.limit !== undefined ? { limit: opts.limit } : {}) },
        opts.timeoutMs ?? 30_000,
    )
    return (res.links ?? []).map((l) => (typeof l === 'string' ? { url: l } : l)).filter((l) => Boolean(l.url))
}

// ─── map + scrape (copied from synchq packages/firecrawl, adapted to this package's helpers) ─────────────────────

/**
 * How many pages `firecrawlScrapeSite` fetches at once. Capped: Firecrawl's plans allow 10-500 scrapes a minute, so an
 * uncapped fan-out rate-limits itself and every retried 429 is latency we chose to take.
 */
const DEFAULT_CONCURRENCY = 3

export interface FirecrawlScrapeSiteOptions extends FirecrawlScrapeOptions {
    /** Hard ceiling on pages fetched - this is what bounds the spend. */
    maxPages: number
    /**
     * Path words to rank first (`['about', 'pricing', 'fees']`). Each term runs its own `map` with `search` (a plain
     * map returns the site's own order - mostly blog posts - and sorting cannot promote a page that never came back).
     * Hits are merged ROUND-ROBIN so each term contributes its best page before any term contributes a second.
     */
    prefer?: string[]
    concurrency?: number
}

export interface FirecrawlScrapeSiteResult {
    pages: FirecrawlScrapeResult[]
    /** Every candidate discovery surfaced, before `maxPages`. */
    discovered: FirecrawlMapLink[]
    failedUrls: string[]
    /** At least one page failed but others came back. */
    degraded: boolean
}

async function discover(url: string, prefer: string[], maxPages: number, opts: { apiKey?: string }): Promise<FirecrawlMapLink[]> {
    if (prefer.length === 0) return firecrawlMap(url, { limit: Math.max(maxPages * 5, 50), apiKey: opts.apiKey })
    const perTerm = await Promise.all(
        prefer.map((term) => firecrawlMap(url, { search: term, limit: 5, apiKey: opts.apiKey }).catch(() => [] as FirecrawlMapLink[])),
    )
    // The entry URL first: the homepage is the single most useful page for saying what a business does.
    const merged: FirecrawlMapLink[] = [{ url }]
    const seen = new Set([url.replace(/\/$/, '')])
    const depth = Math.max(0, ...perTerm.map((l) => l.length))
    for (let i = 0; i < depth; i++) {
        for (const links of perTerm) {
            const l = links[i]
            if (!l) continue
            const k = l.url.replace(/\/$/, '')
            if (seen.has(k)) continue
            seen.add(k)
            merged.push(l)
        }
    }
    return merged
}

/**
 * Read a site: map it, choose the most useful pages, scrape them (1 credit to map, or 1 per `prefer` term, plus 1 per
 * page). Every page failing THROWS (the first error); a partial failure returns what came back with `degraded` set.
 * Runs as long as the pages take - call it from a long job, never inline in a request.
 */
export async function firecrawlScrapeSite(url: string, opts: FirecrawlScrapeSiteOptions): Promise<FirecrawlScrapeSiteResult> {
    const { maxPages, prefer, concurrency, ...scrapeOpts } = opts
    const discovered = await discover(url, prefer ?? [], maxPages, scrapeOpts)
    const candidates = discovered.length ? discovered.map((l) => l.url) : [url]
    const targets = candidates.slice(0, Math.max(1, maxPages))

    const failedUrls: string[] = []
    let firstError: unknown
    const results = new Array<FirecrawlScrapeResult | undefined>(targets.length)
    let cursor = 0
    async function worker(): Promise<void> {
        for (;;) {
            const i = cursor++
            if (i >= targets.length) return
            const target = targets[i]!
            try {
                results[i] = await firecrawlScrape(target, scrapeOpts)
            } catch (err) {
                failedUrls.push(target)
                if (firstError === undefined) firstError = err
            }
        }
    }
    const limit = Math.max(1, concurrency ?? DEFAULT_CONCURRENCY)
    await Promise.all(Array.from({ length: Math.min(limit, targets.length) }, worker))
    const pages = results.filter((r): r is FirecrawlScrapeResult => Boolean(r))
    if (pages.length === 0) {
        throw firstError instanceof Error ? firstError : new AppError('network', `Could not read any page of ${url}.`)
    }
    return { pages, discovered, failedUrls, degraded: failedUrls.length > 0 }
}

// ─── account ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FirecrawlCreditUsage {
    remainingCredits: number
    planCredits: number
    billingPeriodStart?: string
    billingPeriodEnd?: string
}

/**
 * Remaining credits on the Firecrawl account. EVENTUALLY CONSISTENT (measured 10-30 s behind a finished call): fine for
 * an admin dashboard, never a gate on a request.
 */
export async function firecrawlCreditUsage(opts: { apiKey?: string; timeoutMs?: number } = {}): Promise<FirecrawlCreditUsage> {
    const apiKey = key(opts)
    const res = await fetch(`${BASE}/team/credit-usage`, {
        headers: { authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    }).catch((err: unknown) => {
        throw new AppError('network', 'Could not reach the web fetching service.', { cause: err })
    })
    if (!res.ok) throw new AppError(res.status === 429 ? 'ratelimit' : 'unknown', `Web page fetching rejected the request (${res.status}).`)
    const json = (await res.json()) as { data?: FirecrawlCreditUsage }
    if (!json.data) throw new AppError('unknown', 'Could not read the Firecrawl credit balance.')
    return json.data
}
