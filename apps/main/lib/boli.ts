/**
 * THE Boli platform contract (plan/main/platform/platform-v0.md). Browser-safe constants only: no env reads, no server
 * imports, so pages, client components, server actions and the /v1 route all agree on one set of numbers and words.
 * Change a price, a limit or a model here and nowhere else.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Credits and money
// ---------------------------------------------------------------------------------------------------------------------

/** 1 credit = Rs 1 (NPR). Balances and costs are stored in integer micro-credits. */
export const MICRO_PER_CREDIT = 1_000_000
export const CURRENCY = "NPR" as const
/** Free credits, granted once when the email is verified (Google accounts: at creation, they arrive verified). */
export const WELCOME_CREDITS = 100

/** Add-credits dialog: quick chips, minimum, maximum (credits = rupees). */
export const ADD_CREDIT_CHIPS = [100, 500, 1000] as const
export const ADD_CREDITS_MIN = 100
export const ADD_CREDITS_MAX = 100_000

/** Display a micro-credit amount as credits with 2 decimals: 99_960_000 -> "99.96". */
export function formatCredits(micro: number): string {
    return (micro / MICRO_PER_CREDIT).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Same number as rupees: "Rs 99.96". */
export function formatRupees(micro: number): string {
    return `Rs ${formatCredits(micro)}`
}

// ---------------------------------------------------------------------------------------------------------------------
// The model (only our own open models - never a closed model behind the platform)
// ---------------------------------------------------------------------------------------------------------------------

export type BoliModel = {
    /** Public id used in the API and Kura. Stable when the weights behind it change. */
    id: string
    /** What the UI shows under the id. */
    label: string
    base: string
    licence: string
    contextTokens: number
    /** Credits per 1M tokens. Because 1 credit = 1e6 micro, this is also micro-credits PER TOKEN. */
    pricePerMillion: { input: number; output: number }
    languages: string[]
    blurb: string
}

export const BOLI_CHAT: BoliModel = {
    id: "boli-chat",
    label: "Gemma 4 E4B, 4-bit",
    base: "google/gemma-4-E4B-it (Apache 2.0), quantized by ggml-org",
    licence: "Apache 2.0",
    contextTokens: 8192,
    pricePerMillion: { input: 2, output: 6 },
    languages: ["English", "Romanized Nepali", "Nepali (Devanagari)", "Code-mixed"],
    blurb: "A small open model that understands English, Romanized Nepali and the mix people actually type.",
}

export const MODELS: BoliModel[] = [BOLI_CHAT]
export const DEFAULT_MODEL_ID = BOLI_CHAT.id

export function modelById(id: string): BoliModel | undefined {
    return MODELS.find((m) => m.id === id)
}

/** Cost of one call in micro-credits. Thinking tokens are already part of outputTokens. Never below 1 for a real call. */
export function costMicro(model: BoliModel, inputTokens: number, outputTokens: number): number {
    const raw = inputTokens * model.pricePerMillion.input + outputTokens * model.pricePerMillion.output
    return raw > 0 ? Math.ceil(raw) : 0
}

// ---------------------------------------------------------------------------------------------------------------------
// Kura (the chat page)
// ---------------------------------------------------------------------------------------------------------------------

export const KURA = {
    name: "Kura",
    /** कुरा: conversation. */
    meaning: "Kura means conversation",
    subtitle: "Chat with Boli's model in Nepali, English or both",
} as const

/**
 * The system prompt tested in docs/inference/02-choose-a-model.md. The explicit mapping line is load-bearing: without
 * it the model answered English questions in Devanagari.
 */
export const DEFAULT_SYSTEM_PROMPT =
    "You are Boli, a helpful assistant for people in Nepal. Always reply in the same language AND script as the user's latest message: English -> English; Romanized Nepali (Nepali in Latin letters) -> Romanized Nepali; a mix -> the same mix in Latin letters. Never switch to Devanagari unless the user writes in Devanagari. Keep replies short: at most 80 words unless asked for more. If you are not sure a fact is true, say so instead of guessing."

export type KuraSettings = {
    systemPrompt: string
    temperature: number
    maxTokens: number
    topP: number
    topK: number
    /** Thinking before answering (off by default; costs output tokens). */
    think: boolean
}

/** Gemma's own recommended sampling (from its GGUF metadata) except temperature, which we keep lower for chat. */
export const KURA_DEFAULTS: KuraSettings = {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 1024,
    topP: 0.95,
    topK: 64,
    think: false,
}

export const KURA_LIMITS = {
    temperature: { min: 0, max: 1.5, step: 0.05 },
    maxTokens: { min: 16, max: 4096, step: 16 },
    topP: { min: 0.05, max: 1, step: 0.05 },
    topK: { min: 1, max: 200, step: 1 },
} as const

export const KURA_SUGGESTIONS = [
    { label: "English", prompt: "Explain what an API key is in two sentences." },
    { label: "Romanized", prompt: "mero exam sakiyo, aba k garne?" },
    { label: "Mixed", prompt: "Tomorrow ko meeting cancel bhayo, team lai ramro sanga inform garne message lekhdeu." },
    { label: "Summarize", prompt: "Yo paragraph lai 1 line ma summarize gardeu: ..." },
] as const

// ---------------------------------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------------------------------

export const API_KEY_PREFIX = "boli_sk_"
/** Random characters after the prefix. */
export const API_KEY_RANDOM_LENGTH = 32
/** Characters of the full key kept for display (`boli_sk_` + 8), then a mask. */
export const API_KEY_DISPLAY_LENGTH = 16
export const MAX_API_KEYS = 10
/** Requests per minute per account, shared by every key and Kura. */
export const RATE_LIMIT_PER_MIN = 30

export function maskKey(prefix: string): string {
    return `${prefix}****`
}

/** Paths under the app's origin (`/v1/...` is rewritten to `/api/v1/...`). */
export const API_PATHS = {
    chatCompletions: "/v1/chat/completions",
    models: "/v1/models",
} as const

/** OpenAI-shaped error codes the API returns. */
export const API_ERRORS = {
    invalid_request: { status: 400, type: "invalid_request_error" },
    invalid_api_key: { status: 401, type: "authentication_error" },
    insufficient_quota: { status: 402, type: "insufficient_quota" },
    not_found: { status: 404, type: "invalid_request_error" },
    rate_limit_exceeded: { status: 429, type: "rate_limit_error" },
    model_unavailable: { status: 503, type: "server_error" },
} as const
export type ApiErrorCode = keyof typeof API_ERRORS

// ---------------------------------------------------------------------------------------------------------------------
// Brand copy
// ---------------------------------------------------------------------------------------------------------------------

export const BRAND = {
    name: "Boli",
    tagline: "Open AI for Nepal",
    description: "Boli runs open AI models for Nepal: chat in English, Romanized Nepali or both, and an OpenAI-compatible API with 100 free credits.",
    announcement: "Gemma 4 for Nepali is live - 100 free credits.",
    /** Sender name for email until bolihq.com is verified in Resend. */
    emailFromName: "Boli",
    /** Owner fills these in later (plan Q13). */
    legalEntity: "[Company name]",
    contactEmail: "[contact email]",
} as const

/** Onboarding (/welcome): every step offers choices plus "Other". */
export const ONBOARDING = {
    build: ["Chatbot or assistant", "Customer support", "Content and writing", "Education", "Internal tools", "Just exploring"],
    languages: ["English", "Romanized Nepali", "Nepali (Devanagari)", "Mixed (English + Nepali)"],
    roles: ["Developer", "Founder", "Student", "Researcher", "Designer or PM"],
    teamSizes: ["Just me", "2-10", "11-50", "51-200", "200+"],
} as const
