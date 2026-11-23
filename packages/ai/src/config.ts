import type { ModelId } from './models'

/**
 * THE task -> model map. A call site names a TASK, never a model id. Boli runs every task on its own open model
 * (`boli-chat`); a closed model is never behind any feature.
 *
 * - Thinking is chosen per request by the caller (`think` in `boliProviderOptions`), off by default.
 * - `maxOutputTokens` is a safety ceiling, not a brevity tool - answer length is steered in the prompt.
 */
export interface AiTaskConfig {
    model: ModelId
    maxOutputTokens: number
    /** Shown on a usage screen. */
    label: string
}

export const AI_TASKS = {
    chat: { model: 'boli-chat', maxOutputTokens: 4096, label: 'Kura chat' },
    summary: { model: 'boli-chat', maxOutputTokens: 1024, label: 'Short summaries' },
    classify: { model: 'boli-chat', maxOutputTokens: 256, label: 'Sorting text into a label' },
} as const satisfies Record<string, AiTaskConfig>

export type AiTaskName = keyof typeof AI_TASKS

export function taskConfig(task: AiTaskName): AiTaskConfig {
    return AI_TASKS[task]
}
