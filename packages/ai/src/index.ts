// @repo/ai - SERVER entry. Client code imports only `@repo/ai/protocol` (and `@repo/ai/models` for labels).
// Boli runs only its own open model (`boli-chat` on llama-server); no closed model is wired here.
export { MODELS, getModel } from './models'
export type { ModelId, ModelInfo, Rates } from './models'
export { AI_TASKS, taskConfig } from './config'
export type { AiTaskName, AiTaskConfig } from './config'
export {
    BOLI_CHAT_MODEL_ID, getBoliChatModel, boliConfigured, boliProviderOptions, boliBodyParams, boliUpstream,
    boliConfigured as aiConfigured,
} from './boli'
export type { BoliSamplingSettings, BoliUpstream } from './boli'
export { turnContextMessage } from './cache'
export { runChatTurn, asCard } from './agent'
export type { ChatTurnOptions, ChatTurnResult } from './agent'
export { classifyAiError, aiErrorMessage } from './errors'
export type { ClassifiedAiError } from './errors'
export { setAiUsageSink, recordAiUsage } from './usage'
export type { AiUsageRecord, AiUsageSink, AiRequestUsage } from './usage'
export * from './protocol'
// The SDK pieces an app needs to write tools and replay history, so apps depend on @repo/ai only (one `ai` copy).
export { tool, modelMessageSchema, streamText } from 'ai'
export type { ToolSet, ModelMessage } from 'ai'
