import { z } from "zod"
import { KURA_LIMITS, MODELS } from "@/lib/boli"

/**
 * The body of `POST /v1/chat/completions` we accept (OpenAI-compatible subset). Unknown fields are dropped, never
 * forwarded. Ranges come from KURA_LIMITS so the API and Kura agree. `think` is Boli's extension (thinking on/off).
 */

const modelIds = MODELS.map((m) => m.id)

const textPart = z.object({ type: z.literal("text"), text: z.string() })

const message = z.object({
    role: z.enum(["system", "developer", "user", "assistant"], {
        error: "Each message needs a role: system, developer, user or assistant.",
    }),
    content: z.union([z.string(), z.array(textPart).min(1)], {
        error: "Message content must be a string, or an array of { type: \"text\", text } parts (images are not supported).",
    }),
    name: z.string().max(64).optional(),
})

const range = (name: string, r: { min: number; max: number }) =>
    z.number({ error: `${name} must be a number.` }).min(r.min, `${name} must be at least ${r.min}.`).max(r.max, `${name} must be at most ${r.max}.`)

const intRange = (name: string, r: { min: number; max: number }) => range(name, r).int(`${name} must be a whole number.`)

export const chatCompletionSchema = z.object({
    model: z.string({ error: "Send a model, for example \"boli-chat\"." }).refine((m) => modelIds.includes(m), {
        message: `Unknown model. Use one of: ${modelIds.join(", ")} (GET /v1/models lists them).`,
    }),
    messages: z.array(message, { error: "Send messages as an array." }).min(1, "Send at least one message.").max(200, "Send at most 200 messages."),
    temperature: range("temperature", KURA_LIMITS.temperature).optional(),
    top_p: range("top_p", KURA_LIMITS.topP).optional(),
    top_k: intRange("top_k", KURA_LIMITS.topK).optional(),
    max_tokens: intRange("max_tokens", KURA_LIMITS.maxTokens).optional(),
    max_completion_tokens: intRange("max_completion_tokens", KURA_LIMITS.maxTokens).optional(),
    stream: z.boolean().optional(),
    stream_options: z.object({ include_usage: z.boolean().optional() }).optional(),
    stop: z.union([z.string().max(100), z.array(z.string().max(100)).max(4)]).optional(),
    seed: z.number().int().optional(),
    presence_penalty: range("presence_penalty", { min: -2, max: 2 }).optional(),
    frequency_penalty: range("frequency_penalty", { min: -2, max: 2 }).optional(),
    user: z.string().max(256).optional(),
    think: z.boolean().optional(),
})

export type ChatCompletionInput = z.infer<typeof chatCompletionSchema>
