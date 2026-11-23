import type { KuraPart, KuraUsage } from './protocol'

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function asUsage(v: unknown): KuraUsage | null {
    if (typeof v !== 'object' || v === null) return null
    const u = v as Record<string, unknown>
    return {
        inputTokens: num(u.inputTokens),
        outputTokens: num(u.outputTokens),
        reasoningTokens: num(u.reasoningTokens),
        costMicro: num(u.costMicro),
        ms: num(u.ms),
    }
}

/**
 * Narrow a stored `parts` jsonb value. Rows are written by our own route; anything malformed (or a part from the old
 * tool-using AI page - cards, tool lines, links) is dropped, never thrown.
 */
export function asParts(value: unknown): KuraPart[] {
    if (!Array.isArray(value)) return []
    const out: KuraPart[] = []
    for (const p of value) {
        if (typeof p !== 'object' || p === null || !('type' in p)) continue
        const r = p as Record<string, unknown>
        if (r.type === 'text' && typeof r.text === 'string') out.push({ type: 'text', text: r.text })
        else if (r.type === 'thought' && typeof r.text === 'string') out.push({ type: 'thought', text: r.text, ms: num(r.ms) })
        else if (r.type === 'notice' && typeof r.text === 'string') out.push({ type: 'notice', text: r.text })
        else if (r.type === 'usage') {
            const usage = asUsage(r.usage)
            if (usage) out.push({ type: 'usage', usage })
        }
    }
    return out
}
