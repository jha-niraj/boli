import { z } from 'zod'
import { JAWAF_BUSINESS_TYPES, type JawafBusinessType } from '@repo/boli/jawaf'

/**
 * The /contact form. Shared by the form and `actions/contact.action.ts`, so a limit is said once. Never
 * defined in the 'use server' file (a non-function export empties that module at build).
 */
/** Topic choices on /contact (owner, 2026-11-24). Stored as plain text, so older rows keep their old labels. */
export const CONTACT_TOPICS = ['API', 'Jawaf', 'Billing', 'Enterprise', 'Partnership', 'Press', 'Other'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

/** The topic that asks for what a Jawaf demo needs (admin builds the demo bot from these fields). */
export const JAWAF_PILOT_TOPIC: ContactTopic = 'Jawaf'

export const CONTACT_NAME_MAX = 120
export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 5000
export const CONTACT_BUSINESS_MAX = 160
export const CONTACT_CITY_MAX = 80
export const CONTACT_SECTOR_MAX = 80
export const CONTACT_WEBSITE_MAX = 300

/** "98XXXXXXXX" from "+977 98-XXXXXXXX", "98 XXX XXXXX" and the like; anything else is returned trimmed. */
export function normalizeNepalMobile(raw: string): string {
    const digits = raw.replace(/[\s\-().]/g, '')
    const local = digits.replace(/^\+?977/, '')
    return /^\d+$/.test(local) ? local : raw.trim()
}

/** "example.com.np" -> "https://example.com.np"; returns null when it is not a web address. */
export function normalizeWebsite(raw: string): string | null {
    const v = raw.trim()
    if (!v) return null
    try {
        const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
        if (!url.hostname.includes('.') || /\s/.test(v)) return null
        return url.toString().replace(/\/$/, '')
    } catch {
        return null
    }
}

const optionalText = (max: number, message: string) => z.string().trim().max(max, message).optional()

export const contactSchema = z
    .object({
        name: z.string().trim().min(1, 'Tell us your name.').max(CONTACT_NAME_MAX, `Keep your name under ${CONTACT_NAME_MAX} characters.`),
        email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
        topic: z.enum(CONTACT_TOPICS, { message: 'Pick a topic.' }),
        message: z
            .string()
            .trim()
            .min(CONTACT_MESSAGE_MIN, `Write at least ${CONTACT_MESSAGE_MIN} characters.`)
            .max(CONTACT_MESSAGE_MAX, `Keep the message under ${CONTACT_MESSAGE_MAX.toLocaleString()} characters.`),
        /** Jawaf pilot only: what a demo bot needs. Ignored for every other topic. */
        businessName: optionalText(CONTACT_BUSINESS_MAX, `Keep the business name under ${CONTACT_BUSINESS_MAX} characters.`),
        businessWebsite: optionalText(CONTACT_WEBSITE_MAX, 'That web address is too long.'),
        businessType: z.enum(JAWAF_BUSINESS_TYPES, { message: 'Pick the kind of business.' }).optional(),
        /** A listed city (searchable picker) or one typed with "Other". */
        city: optionalText(CONTACT_CITY_MAX, `Keep the city under ${CONTACT_CITY_MAX} characters.`),
        /** Optional: a listed sector (`JAWAF_SECTORS` label) or one typed with "Other". */
        sector: optionalText(CONTACT_SECTOR_MAX, `Keep the sector under ${CONTACT_SECTOR_MAX} characters.`),
        phone: z.string().trim().max(40).optional(),
        /** Honeypot: hidden from people, so only a bot fills it in. */
        website: z.string().max(500).optional(),
    })
    .superRefine((d, ctx) => {
        if (d.topic !== JAWAF_PILOT_TOPIC) return
        if (!d.businessName) ctx.addIssue({ code: 'custom', path: ['businessName'], message: 'Tell us the business name.' })
        if (!d.businessType) ctx.addIssue({ code: 'custom', path: ['businessType'], message: 'Pick the kind of business.' })
        if (!d.city) ctx.addIssue({ code: 'custom', path: ['city'], message: 'Tell us the city.' })
        if (d.businessWebsite && !normalizeWebsite(d.businessWebsite)) {
            ctx.addIssue({ code: 'custom', path: ['businessWebsite'], message: 'Enter a web address like example.com.np, or leave it empty.' })
        }
        if (d.phone && !/^9[78]\d{8}$/.test(normalizeNepalMobile(d.phone))) {
            ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a Nepal mobile number like 98XXXXXXXX, or leave it empty.' })
        }
    })

export type ContactInput = z.input<typeof contactSchema>

/** What `contact_message.details` holds for a Jawaf pilot request (read back in apps/admin/schemas/inbox.ts). */
export interface JawafPilotDetails {
    kind: 'jawaf_pilot'
    businessName: string
    businessWebsite: string | null
    businessType: JawafBusinessType
    city: string
    /** Added 2026-11-25; older rows have none. */
    sector: string | null
    phone: string | null
}

/** The `details` row for a parsed message, or null for topics without extra fields. */
export function contactDetails(d: z.output<typeof contactSchema>): JawafPilotDetails | null {
    if (d.topic !== JAWAF_PILOT_TOPIC || !d.businessName || !d.businessType || !d.city) return null
    return {
        kind: 'jawaf_pilot',
        businessName: d.businessName,
        businessWebsite: d.businessWebsite ? normalizeWebsite(d.businessWebsite) : null,
        businessType: d.businessType,
        city: d.city,
        sector: d.sector ? d.sector : null,
        phone: d.phone ? normalizeNepalMobile(d.phone) : null,
    }
}
