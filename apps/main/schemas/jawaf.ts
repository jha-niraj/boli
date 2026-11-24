import { z } from "zod"
import {
    JAWAF_BUILTIN_FIELDS, JAWAF_BUSINESS_TYPES, JAWAF_CHANNELS, JAWAF_CONTACT_STATUSES, JAWAF_CUSTOM_FIELD_TYPES, JAWAF_FACT_KEYS, JAWAF_LENGTHS,
    JAWAF_LIMITS, JAWAF_NOTE_KINDS, JAWAF_SCRIPTS, JAWAF_SETUP_STEPS, JAWAF_SLUG_PATTERN, JAWAF_THEMES, JAWAF_TONES,
} from "@repo/boli/jawaf"

/** Jawaf inputs (actions/jawaf/*.action.ts and app/api/jawaf). Browser-safe: forms validate with the same schemas. */

export const jawafIdSchema = z.string().trim().min(1).max(100)

const httpUrl = z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .refine((v) => {
        try {
            const u = new URL(v)
            return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".")
        } catch {
            return false
        }
    }, "Enter a website address like example.com.np.")

export const jawafSlugSchema = z
    .string()
    .trim()
    .toLowerCase()
    .regex(JAWAF_SLUG_PATTERN, "Use 3-40 lower-case letters, numbers and single hyphens.")

const nameSchema = z.string().trim().min(1, "Give the business a name.").max(80, "Keep the name under 80 characters.")
const htmlSchema = z.string().max(JAWAF_LIMITS.noteChars, "That is too long - split it into two.")

export const jawafTableSchema = z.object({
    columns: z.array(z.string().trim().max(80)).min(1).max(8),
    rows: z.array(z.array(z.string().trim().max(500)).max(8)).max(200),
})

// --- bots ------------------------------------------------------------------------------------------------------------

export const createJawafBotSchema = z.object({
    businessType: z.enum(JAWAF_BUSINESS_TYPES),
    name: nameSchema,
    website: httpUrl.nullish(),
    tone: z.enum(JAWAF_TONES).default("friendly"),
    length: z.enum(JAWAF_LENGTHS).default("balanced"),
    /** Optional; made from the name when absent. */
    slug: jawafSlugSchema.nullish(),
})
export type CreateJawafBotInput = z.input<typeof createJawafBotSchema>

const fieldToggle = z.object({ enabled: z.boolean(), required: z.boolean() })

export const jawafContactFieldsSchema = z.object({
    builtIn: z.object(Object.fromEntries(JAWAF_BUILTIN_FIELDS.map((f) => [f, fieldToggle])) as Record<(typeof JAWAF_BUILTIN_FIELDS)[number], typeof fieldToggle>),
    custom: z
        .array(
            z.object({
                id: z.string().trim().min(1).max(40),
                label: z.string().trim().min(1).max(60),
                type: z.enum(JAWAF_CUSTOM_FIELD_TYPES),
                options: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
                required: z.boolean().default(false),
            }),
        )
        .max(JAWAF_LIMITS.customFields),
})

const hoursRow = z.object({
    day: z.number().int().min(0).max(6),
    open: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    close: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closed: z.boolean(),
})

export const jawafCustomSectionSchema = z.discriminatedUnion("type", [
    z.object({ id: z.string().min(1).max(40), type: z.literal("rich_text"), title: z.string().trim().max(80), html: htmlSchema }),
    z.object({ id: z.string().min(1).max(40), type: z.literal("gallery"), title: z.string().trim().max(80), imageKeys: z.array(z.string().max(300)).max(12) }),
    z.object({
        id: z.string().min(1).max(40),
        type: z.literal("links"),
        title: z.string().trim().max(80),
        links: z.array(z.object({ label: z.string().trim().min(1).max(60), url: httpUrl })).max(10),
    }),
    z.object({ id: z.string().min(1).max(40), type: z.literal("hours_map"), title: z.string().trim().max(80), hours: z.array(hoursRow).max(7), mapQuery: z.string().trim().max(200).nullable() }),
])

export const jawafPageLookSchema = z.object({
    coverKey: z.string().max(300).nullable(),
    logoKey: z.string().max(300).nullable(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour.").nullable(),
    theme: z.enum(JAWAF_THEMES),
    tagline: z.string().trim().max(120).nullable(),
    sections: z.array(jawafCustomSectionSchema).max(JAWAF_LIMITS.customSections),
})

/** Every field optional: send only what changed. */
export const updateJawafBotSchema = z.object({
    botId: jawafIdSchema,
    name: nameSchema.optional(),
    slug: jawafSlugSchema.optional(),
    businessType: z.enum(JAWAF_BUSINESS_TYPES).optional(),
    website: httpUrl.nullable().optional(),
    tone: z.enum(JAWAF_TONES).optional(),
    length: z.enum(JAWAF_LENGTHS).optional(),
    instructions: z.string().trim().max(2000, "Keep instructions under 2,000 characters.").optional(),
    greeting: z.string().trim().max(300).optional(),
    suggestedQuestions: z.array(z.string().trim().min(1).max(120)).max(JAWAF_LIMITS.suggestedQuestions).optional(),
    contactFields: jawafContactFieldsSchema.optional(),
    look: jawafPageLookSchema.optional(),
    showSources: z.boolean().optional(),
    trainingOptIn: z.boolean().optional(),
    status: z.enum(["draft", "live"]).optional(),
    setupStep: z.enum(JAWAF_SETUP_STEPS).optional(),
})
export type UpdateJawafBotInput = z.input<typeof updateJawafBotSchema>

// --- pages, sources, files -------------------------------------------------------------------------------------------

export const mapJawafSiteSchema = z.object({ botId: jawafIdSchema, url: httpUrl })
export type MapJawafSiteInput = z.input<typeof mapJawafSiteSchema>

export const setJawafPagesSchema = z.object({
    botId: jawafIdSchema,
    pageIds: z.array(jawafIdSchema).min(1).max(1000),
    included: z.boolean(),
})
export type SetJawafPagesInput = z.input<typeof setJawafPagesSchema>

export const addJawafUrlSchema = z.object({ botId: jawafIdSchema, url: httpUrl })
export type AddJawafUrlInput = z.input<typeof addJawafUrlSchema>

export const listJawafPagesSchema = z.object({
    botId: jawafIdSchema,
    sourceId: jawafIdSchema.optional(),
    /** included / excluded / changed (new, changed or removed since the last read) / failed. */
    filter: z.enum(["all", "included", "excluded", "changed", "failed"]).default("all"),
})
export type ListJawafPagesInput = z.input<typeof listJawafPagesSchema>

export const JAWAF_FILE_TYPES = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
} as const

export const startJawafUploadSchema = z.object({
    botId: jawafIdSchema,
    fileName: z.string().trim().min(1).max(200),
    size: z.number().int().positive(),
    mimeType: z.enum(Object.keys(JAWAF_FILE_TYPES) as [keyof typeof JAWAF_FILE_TYPES, ...(keyof typeof JAWAF_FILE_TYPES)[]], {
        message: "Upload a PDF, Word file, image (PNG or JPG) or text file.",
    }),
})
export type StartJawafUploadInput = z.input<typeof startJawafUploadSchema>

export const finishJawafUploadSchema = startJawafUploadSchema.extend({ key: z.string().trim().min(1).max(400) })
export type FinishJawafUploadInput = z.input<typeof finishJawafUploadSchema>

export const jawafBotItemSchema = z.object({ botId: jawafIdSchema, id: jawafIdSchema })
export type JawafBotItemInput = z.input<typeof jawafBotItemSchema>

// --- facts, Q&A, notes -----------------------------------------------------------------------------------------------

export const saveJawafFactSchema = z.object({
    botId: jawafIdSchema,
    id: jawafIdSchema.optional(),
    key: z.enum(JAWAF_FACT_KEYS),
    title: z.string().trim().min(1).max(80),
    html: htmlSchema,
    table: jawafTableSchema.nullable().default(null),
    /** Saving a section approves it unless the caller says otherwise. */
    approved: z.boolean().default(true),
})
export type SaveJawafFactInput = z.input<typeof saveJawafFactSchema>

export const saveJawafQaSchema = z.object({
    botId: jawafIdSchema,
    id: jawafIdSchema.optional(),
    question: z.string().trim().min(2, "Write the question.").max(JAWAF_LIMITS.questionChars),
    phrasings: z.array(z.string().trim().min(2).max(JAWAF_LIMITS.questionChars)).max(JAWAF_LIMITS.phrasingsPerQa).default([]),
    answer: z.string().trim().min(1, "Write the answer.").max(JAWAF_LIMITS.answerChars),
    approved: z.boolean().default(true),
})
export type SaveJawafQaInput = z.input<typeof saveJawafQaSchema>

export const importJawafQaCsvSchema = z.object({
    botId: jawafIdSchema,
    /** CSV text: question,answer[,phrasing 1; phrasing 2]. A header row is detected and skipped. */
    csv: z.string().min(1).max(2_000_000),
})
export type ImportJawafQaCsvInput = z.input<typeof importJawafQaCsvSchema>

export const saveJawafNoteSchema = z.object({
    botId: jawafIdSchema,
    id: jawafIdSchema.optional(),
    kind: z.enum(JAWAF_NOTE_KINDS).default("note"),
    title: z.string().trim().min(1, "Give it a title.").max(120),
    html: htmlSchema.default(""),
    table: jawafTableSchema.nullable().default(null),
})
export type SaveJawafNoteInput = z.input<typeof saveJawafNoteSchema>

// --- playground ------------------------------------------------------------------------------------------------------

export const jawafAskSchema = z.object({
    botId: jawafIdSchema,
    conversationId: jawafIdSchema.nullish(),
    message: z.string().trim().min(1, "Ask something.").max(JAWAF_LIMITS.questionChars),
    channel: z.enum(JAWAF_CHANNELS).default("playground"),
})
export type JawafAskInput = z.input<typeof jawafAskSchema>

export const fixJawafAnswerSchema = z.object({
    botId: jawafIdSchema,
    /** The assistant message being fixed (its question becomes a phrasing). */
    messageId: jawafIdSchema.optional(),
    question: z.string().trim().min(2).max(JAWAF_LIMITS.questionChars),
    answer: z.string().trim().min(1, "Write the right answer.").max(JAWAF_LIMITS.answerChars),
    phrasings: z.array(z.string().trim().min(2).max(JAWAF_LIMITS.questionChars)).max(JAWAF_LIMITS.phrasingsPerQa).default([]),
})
export type FixJawafAnswerInput = z.input<typeof fixJawafAnswerSchema>

export const jawafScriptSchema = z.enum(JAWAF_SCRIPTS)

export const updateJawafContactSchema = z.object({
    botId: jawafIdSchema,
    id: jawafIdSchema,
    status: z.enum(JAWAF_CONTACT_STATUSES).optional(),
    notes: z.string().max(5000).optional(),
    followUpAt: z.string().datetime().nullable().optional(),
})
export type UpdateJawafContactInput = z.input<typeof updateJawafContactSchema>

// --- dashboard (task 7) ----------------------------------------------------------------------------------------------

export const JAWAF_NOTIFY_EXTRA_EMAILS = 5

export const jawafNotifyPrefsSchema = z.object({
    botId: jawafIdSchema,
    contactEmail: z.boolean(),
    extraEmails: z.array(z.string().trim().toLowerCase().email("Enter a valid email address.")).max(JAWAF_NOTIFY_EXTRA_EMAILS, `Add up to ${JAWAF_NOTIFY_EXTRA_EMAILS} addresses.`),
    dailySummary: z.boolean(),
    bell: z.boolean(),
    push: z.boolean(),
})
export type JawafNotifyPrefsInput = z.input<typeof jawafNotifyPrefsSchema>

export const convertJawafQuestionSchema = z.object({
    botId: jawafIdSchema,
    text: z.string().trim().min(1).max(JAWAF_LIMITS.questionChars),
    to: z.enum(["romanized", "devanagari", "english"]),
})
export type ConvertJawafQuestionInput = z.input<typeof convertJawafQuestionSchema>
