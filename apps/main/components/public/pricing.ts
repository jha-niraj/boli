import { BOLI_CHAT, costMicro, formatRupees, MICRO_PER_CREDIT, WELCOME_CREDITS, type BoliModel } from "@/lib/boli"

/**
 * Worked pricing numbers for the landing page and Docs, computed from lib/boli.ts so copy never drifts from the price.
 */

/** Whole millions of tokens a number of credits buys at a per-1M price (rounded down: "about 16M", never more). */
export function millionsFor(credits: number, pricePerMillion: number): number {
    return Math.floor(credits / pricePerMillion)
}

/** An example chat turn: a question with some context, and a short answer. Sizes are illustrative, not measured. */
export const EXAMPLE_TURN = { input: 500, output: 300 } as const

export function exampleTurn(model: BoliModel = BOLI_CHAT) {
    const micro = costMicro(model, EXAMPLE_TURN.input, EXAMPLE_TURN.output)
    return {
        ...EXAMPLE_TURN,
        micro,
        rupees: formatRupeesPrecise(micro),
        perWelcome: Math.floor((WELCOME_CREDITS * MICRO_PER_CREDIT) / micro),
    }
}

/** Rupees with up to 4 decimals, for amounts below a paisa ("Rs 0.0028"); otherwise the normal 2-decimal format. */
export function formatRupeesPrecise(micro: number): string {
    if (micro >= 10_000) return formatRupees(micro)
    return `Rs ${(micro / MICRO_PER_CREDIT).toLocaleString("en-US", { maximumFractionDigits: 4 })}`
}

/** The cost of a call with these token counts, as rupees (Rs 0.0006 for a short one). */
export function formatRupeesPreciseFromTokens(input: number, output: number, model: BoliModel = BOLI_CHAT): string {
    return formatRupeesPrecise(costMicro(model, input, output))
}
