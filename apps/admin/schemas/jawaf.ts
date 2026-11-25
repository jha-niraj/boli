import { z } from "zod"
import { JAWAF_BUSINESS_TYPES } from "@repo/boli/jawaf"
import { PROSPECT_STAGES } from "@/types/jawaf"

const id = z.string().trim().min(1).max(64)
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null))

/** "YYYY-MM-DD" from the DatePicker, or empty. */
const day = z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a date.").optional().transform((v) => (v ? v : null))

const website = z.string().trim().max(300).optional().transform((v) => {
    if (!v) return null
    return /^https?:\/\//i.test(v) ? v : `https://${v}`
}).refine((v) => v === null || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v), "Enter a website address, like gurukulhq.com.")

export const prospectFieldsSchema = z.object({
    business: z.string().trim().min(2, "Enter the business name.").max(120),
    website,
    businessType: z.enum(JAWAF_BUSINESS_TYPES).default("other"),
    sector: opt(80),
    city: opt(80),
    contactName: opt(120),
    phone: opt(40),
    email: z.string().trim().max(200).optional().transform((v) => (v ? v.toLowerCase() : null))
        .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email."),
    ownerUserId: opt(64),
})

export const createDemoSchema = prospectFieldsSchema.extend({
    sourceContactMessageId: opt(64),
})
export type CreateDemoInput = z.input<typeof createDemoSchema>

export const updateProspectSchema = prospectFieldsSchema.partial().extend({
    id,
    stage: z.enum(PROSPECT_STAGES).optional(),
    nextStepAt: day,
    notes: z.string().max(5000).optional(),
})
export type UpdateProspectInput = z.input<typeof updateProspectSchema>

export const jawafIdSchema = id

export const generateClaimSchema = z.object({ botId: id, prospectId: id.optional() })
export const sendClaimSchema = z.object({
    botId: id,
    prospectId: id.optional(),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    /** The token generated in this sheet a moment ago (shown once); without it a fresh link is made. */
    token: z.string().trim().regex(/^[A-Za-z0-9_-]{30,100}$/).optional(),
})
export type SendClaimInput = z.input<typeof sendClaimSchema>

export const pauseBotSchema = z.object({ botId: id, paused: z.boolean(), reason: z.string().trim().max(300).optional() })
export const botLimitsSchema = z.object({
    botId: id,
    pagesPerBot: z.number().int().min(1).max(5000).nullable(),
    filesPerBot: z.number().int().min(1).max(1000).nullable(),
})
export const grantBotCreditsSchema = z.object({
    botId: id,
    credits: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 1_000_000, "Enter a whole number of credits (not zero, at most 1,000,000)."),
    reason: z.string().trim().min(1, "Say why, so the grant can be understood later.").max(300),
    requestId: z.string().uuid("Open the sheet again and retry."),
})
export const changeOwnerSchema = z.object({ botId: id, email: z.string().trim().toLowerCase().email("Enter a valid email.") })
export const evalBatchSchema = z.object({ botId: id, offset: z.number().int().min(0).max(1000) })
