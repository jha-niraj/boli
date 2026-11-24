import { z } from 'zod'
import { KURA_DEFAULTS, KURA_LIMITS, type KuraSettings } from '@repo/boli'

/**
 * Kura settings per conversation (`ai_conversation.settings`). Pure - used by the route, the action and the page.
 * Ranges come from KURA_LIMITS; anything missing or out of range falls back to KURA_DEFAULTS, so a stored value from
 * an older shape never breaks a chat.
 */

export const SYSTEM_PROMPT_MAX = 4000

const range = (l: { min: number; max: number }) => z.number().min(l.min).max(l.max)

export const kuraSettingsSchema = z.object({
    systemPrompt: z.string().max(SYSTEM_PROMPT_MAX),
    temperature: range(KURA_LIMITS.temperature),
    maxTokens: range(KURA_LIMITS.maxTokens).int(),
    topP: range(KURA_LIMITS.topP),
    topK: range(KURA_LIMITS.topK).int(),
    think: z.boolean(),
})

/** Read a stored or posted value field by field: each bad field takes its default, the good ones stay. */
export function asKuraSettings(value: unknown): KuraSettings {
    if (typeof value !== 'object' || value === null) return { ...KURA_DEFAULTS }
    const v = value as Record<string, unknown>
    const shape = kuraSettingsSchema.shape
    const num = (schema: z.ZodNumber, raw: unknown, fallback: number): number => {
        const parsed = schema.safeParse(raw)
        return parsed.success ? parsed.data : fallback
    }
    const prompt = shape.systemPrompt.safeParse(v.systemPrompt)
    const think = shape.think.safeParse(v.think)
    return {
        systemPrompt: prompt.success && prompt.data.trim() ? prompt.data : KURA_DEFAULTS.systemPrompt,
        temperature: num(shape.temperature, v.temperature, KURA_DEFAULTS.temperature),
        maxTokens: num(shape.maxTokens, v.maxTokens, KURA_DEFAULTS.maxTokens),
        topP: num(shape.topP, v.topP, KURA_DEFAULTS.topP),
        topK: num(shape.topK, v.topK, KURA_DEFAULTS.topK),
        think: think.success ? think.data : KURA_DEFAULTS.think,
    }
}

export function sameSettings(a: KuraSettings, b: KuraSettings): boolean {
    return a.systemPrompt === b.systemPrompt && a.temperature === b.temperature && a.maxTokens === b.maxTokens
        && a.topP === b.topP && a.topK === b.topK && a.think === b.think
}
