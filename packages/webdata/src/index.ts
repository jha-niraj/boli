/**
 * @repo/webdata - web data for AI tools, over fetch (Workers-safe): Exa search and Firecrawl scrape / map.
 *
 * - Keys read at call time: EXA_API_KEY, FIRECRAWL_API_KEY (or `{ apiKey }` per call). Gate a tool on
 *   `isExaConfigured()` / `isFirecrawlConfigured()` so it is simply absent when unset.
 * - Errors are `AppError`s from @repo/errors (ratelimit / network retry; quota = out of provider credit; unknown =
 *   missing or rejected key). Bounded retries with backoff; every attempt may be billed, so fan out sparingly.
 * - Page text is untrusted input: hand it to a model as data, never as instructions.
 *
 *   const results = await exaSearch('latest Next.js release', { numResults: 5, includeDomains: ['nextjs.org'] })
 *   const page = await firecrawlScrape('https://example.com/pricing')
 *   const rules = await fetchRobots('https://example.com'); robotsAllows(rules, '/fees')
 */
export { exaSearch, isExaConfigured, domainOf, type ExaSearchOptions, type ExaResult } from './exa'
export {
    firecrawlScrape, firecrawlMap, firecrawlScrapeSite, firecrawlCreditUsage, isFirecrawlConfigured,
    type FirecrawlScrapeOptions, type FirecrawlScrapeResult, type FirecrawlMapLink, type FirecrawlScrapeSiteOptions,
    type FirecrawlScrapeSiteResult, type FirecrawlCreditUsage,
} from './firecrawl'
export { fetchRobots, parseRobots, robotsAllows, type RobotsRules } from './robots'
