import type { SystemModelMessage } from 'ai'

/**
 * Per-turn context (who, which page, today's date) goes AFTER the history as a late system message, so the system
 * prompt and the earlier turns stay byte-identical and llama-server can reuse its KV cache for that prefix
 * (`cache_n` in its timings). Empty text = no block.
 */
export function turnContextMessage(text: string): SystemModelMessage | null {
    const trimmed = text.trim()
    return trimmed ? { role: 'system', content: trimmed } : null
}
