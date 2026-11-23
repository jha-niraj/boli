/**
 * Model registry - the ONE place model ids and rates live for @repo/ai and the billing meter.
 *
 * Only our own open model: `boli-chat` (Gemma 4 E4B, 4-bit, on llama-server). It is self-hosted, so there is no vendor
 * bill per token: the USD rates below are 0 and `ai_usage_log` records tokens at cost 0. What a PERSON pays is in
 * micro-credits, priced from `creditsPerMillion` - a mirror of `pricePerMillion` in apps/main/lib/boli.ts (keep equal;
 * that file is the source).
 */

export interface Rates {
    input: number
    output: number
    cacheRead: number
    cacheWrite5m: number
    cacheWrite1h: number
}

export interface ModelInfo extends Rates {
    id: string
    label: string
    /** A second rate card for a request whose PROMPT (all input tokens) is above `above`. */
    longContext?: Rates & { above: number }
    /** What a person pays: credits per 1M tokens (= micro-credits per token). */
    creditsPerMillion: { input: number; output: number }
}

export const MODELS = {
    'boli-chat': {
        id: 'boli-chat',
        label: 'Gemma 4 E4B, 4-bit',
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite5m: 0,
        cacheWrite1h: 0,
        creditsPerMillion: { input: 2, output: 6 },
    },
} as const satisfies Record<string, ModelInfo>

export type ModelId = keyof typeof MODELS

export function getModel(id: string): ModelInfo | undefined {
    return (MODELS as Record<string, ModelInfo>)[id]
}
