import { getModel, type AiRequestUsage, type Rates } from '@repo/ai'

/**
 * The AI usage meter: prices one request at its real rates.
 *
 *   cost = plain input x input + cache reads x read + 5-minute writes x write5m + 1-hour writes x write1h + output x output
 *
 * Cache reads and writes are SUBSETS of input tokens - never added on top (double count). A long-context card (when a
 * model has one) is decided PER REQUEST, on the request's whole prompt. `boli-chat` is self-hosted: its USD rates are
 * 0, so this logs tokens for our own records; what a person pays is micro-credits (apps/main lib/platform/credits.ts). An unknown model costs 0 with
 * `priceKnown: false` - it never silently falls back to some other model's price.
 */

function cardFor(modelId: string, inputTokens: number): Rates | null {
    const m = getModel(modelId)
    if (!m) return null
    return m.longContext && inputTokens > m.longContext.above ? m.longContext : m
}

/** USD for one request. */
export function requestCostUsd(modelId: string, r: AiRequestUsage): { usd: number; priceKnown: boolean } {
    const rates = cardFor(modelId, r.inputTokens)
    if (!rates) return { usd: 0, priceKnown: false }
    const input = Math.max(0, r.inputTokens)
    const read = Math.min(input, Math.max(0, r.cacheReadTokens))
    const written = Math.min(input - read, Math.max(0, r.cacheWriteTokens))
    const written1h = Math.min(written, Math.max(0, r.cacheWrite1hTokens))
    const plain = input - read - written
    const usd =
        (plain / 1e6) * rates.input +
        (read / 1e6) * rates.cacheRead +
        ((written - written1h) / 1e6) * rates.cacheWrite5m +
        (written1h / 1e6) * rates.cacheWrite1h +
        (Math.max(0, r.outputTokens) / 1e6) * rates.output
    return { usd, priceKnown: true }
}

export interface CallCost {
    usd: number
    /** Millionths of a dollar, rounded up so a real call never stores 0. */
    microUsd: number
    priceKnown: boolean
    totals: { inputTokens: number; cacheReadTokens: number; cacheWrite5mTokens: number; cacheWrite1hTokens: number; outputTokens: number }
}

/** Price every request of a call and total them. */
export function priceCall(modelId: string, requests: AiRequestUsage[]): CallCost {
    let usd = 0
    let priceKnown = true
    const totals = { inputTokens: 0, cacheReadTokens: 0, cacheWrite5mTokens: 0, cacheWrite1hTokens: 0, outputTokens: 0 }
    for (const r of requests) {
        const c = requestCostUsd(modelId, r)
        usd += c.usd
        priceKnown = priceKnown && c.priceKnown
        const w1h = Math.min(r.cacheWriteTokens, r.cacheWrite1hTokens)
        totals.inputTokens += r.inputTokens
        totals.cacheReadTokens += r.cacheReadTokens
        totals.cacheWrite5mTokens += r.cacheWriteTokens - w1h
        totals.cacheWrite1hTokens += w1h
        totals.outputTokens += r.outputTokens
    }
    return { usd, microUsd: usd > 0 ? Math.ceil(usd * 1e6) : 0, priceKnown, totals }
}
