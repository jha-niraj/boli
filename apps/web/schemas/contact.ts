import { z } from 'zod'

/**
 * The /contact form. Shared by the form and `actions/contact.action.ts`, so a limit is said once. Never
 * defined in the 'use server' file (a non-function export empties that module at build).
 */
/** Topic choices on /contact (owner, 2026-11-24). Stored as plain text, so older rows keep their old labels. */
export const CONTACT_TOPICS = ['API', 'Jawaf', 'Billing', 'Enterprise', 'Partnership', 'Press', 'Other'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_NAME_MAX = 120
export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 5000

export const contactSchema = z.object({
    name: z.string().trim().min(1, 'Tell us your name.').max(CONTACT_NAME_MAX, `Keep your name under ${CONTACT_NAME_MAX} characters.`),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
    topic: z.enum(CONTACT_TOPICS, { message: 'Pick a topic.' }),
    message: z
        .string()
        .trim()
        .min(CONTACT_MESSAGE_MIN, `Write at least ${CONTACT_MESSAGE_MIN} characters.`)
        .max(CONTACT_MESSAGE_MAX, `Keep the message under ${CONTACT_MESSAGE_MAX.toLocaleString()} characters.`),
    /** Honeypot: hidden from people, so only a bot fills it in. */
    website: z.string().max(500).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
