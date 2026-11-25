import { z } from "zod"
import { JAWAF_BUSINESS_TYPES } from "@repo/boli/jawaf"
import { INBOX_STATUSES, INBOX_WINDOWS, type JawafPilotDetails } from "@/types/inbox"

/** Inbox filters from the client: anything unknown is dropped, never an error. */
export const inboxFiltersSchema = z.object({
    search: z.string().trim().max(200).optional().catch(undefined),
    topic: z.string().trim().max(40).optional().catch(undefined),
    status: z.enum(INBOX_STATUSES).optional().catch(undefined),
    window: z.enum(INBOX_WINDOWS).optional().catch(undefined),
})

export const inboxPageSchema = z.coerce.number().int().min(1).max(10_000).catch(1)

export const setHandledSchema = z.object({
    id: z.string().trim().min(1, "Choose a message.").max(64),
    handled: z.boolean(),
})
export type SetHandledInput = z.infer<typeof setHandledSchema>

/** `contact_message.details` as the site writes it for a Jawaf pilot request (apps/web/schemas/contact.ts). */
const jawafPilotDetailsSchema = z.object({
    kind: z.literal("jawaf_pilot"),
    businessName: z.string().min(1),
    businessWebsite: z.string().nullable().catch(null),
    businessType: z.enum(JAWAF_BUSINESS_TYPES).catch("other"),
    city: z.string().catch(""),
    /** Added 2026-11-25 (the Sector picker); older rows have none. */
    sector: z.string().nullable().optional().catch(null).transform((v) => v ?? null),
    phone: z.string().nullable().catch(null),
})

/** Narrow the stored jsonb; anything that is not a pilot request reads as null. */
export function readPilotDetails(value: unknown): JawafPilotDetails | null {
    const r = jawafPilotDetailsSchema.safeParse(value)
    return r.success ? r.data : null
}
