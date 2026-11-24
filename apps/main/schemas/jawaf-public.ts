import { z } from "zod"
import { JAWAF_LIMITS } from "@repo/boli/jawaf"

/**
 * Inputs of the PUBLIC Jawaf endpoints (app/(public-chat)/j/[slug]/api/[...path]/route.ts). Browser-safe: the contact
 * card validates with the same rules before it posts. Every string is trimmed and capped; nothing here is trusted
 * further than these shapes.
 */

/** Visitor questions are capped below the owner's limit: a visitor never needs a page of text. */
export const JAWAF_PUBLIC_QUESTION_CHARS = Math.min(500, JAWAF_LIMITS.questionChars)

const id = z.string().trim().min(1).max(100)

export const jawafPublicAskSchema = z.object({
    conversationId: id.nullish(),
    message: z.string().trim().min(1, "Type a question first.").max(JAWAF_PUBLIC_QUESTION_CHARS, `Keep the question under ${JAWAF_PUBLIC_QUESTION_CHARS} characters.`),
    /** "qr" when the page was opened from the poster (?src=qr). */
    src: z.enum(["link", "qr"]).default("link"),
})
export type JawafPublicAskInput = z.input<typeof jawafPublicAskSchema>

export const jawafPublicRateSchema = z.object({
    messageId: id,
    /** 1 helpful, -1 not helpful, 0 = take the rating back. */
    rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
    reason: z.string().trim().max(200).nullish(),
})
export type JawafPublicRateInput = z.input<typeof jawafPublicRateSchema>

/**
 * A Nepal mobile number: 97x / 98x and 10 digits, with or without +977 / 977, spaces or dashes. Returns the 10 digits,
 * or null when it is not one.
 */
export function normaliseNepalMobile(raw: string): string | null {
    const digits = raw.replace(/[\s\-().]/g, "").replace(/^\+?977/, "")
    return /^9[78]\d{8}$/.test(digits) ? digits : null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The contact card. `fields` is checked against the bot's own field config on the server (required fields, phone and
 * email shapes, select options); this schema only bounds the shape. `website` is the honeypot: a person never sees it.
 */
export const jawafPublicContactSchema = z.object({
    conversationId: id.nullish(),
    fields: z.record(z.string().trim().min(1).max(40), z.string().trim().max(500)).refine((o) => Object.keys(o).length <= 20, "Too many fields."),
    website: z.string().max(500).optional(),
    src: z.enum(["link", "qr"]).default("link"),
})
export type JawafPublicContactInput = z.input<typeof jawafPublicContactSchema>

/** The per-field check the card runs before posting and the server runs again. Returns field id -> message. */
export function checkContactFields(
    fields: { id: string; label: string; type: string; required: boolean; options: string[] }[],
    values: Record<string, string>,
): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const f of fields) {
        const v = (values[f.id] ?? "").trim()
        if (!v) {
            if (f.required) errors[f.id] = f.type === "phone" ? "Enter your mobile number." : `Enter your ${f.label.toLowerCase()}.`
            continue
        }
        if (f.type === "name" && v.length < 2) errors[f.id] = "Enter your name."
        if (f.type === "phone" && !normaliseNepalMobile(v)) errors[f.id] = "Enter a Nepal mobile number starting with 98 or 97 (10 digits)."
        if (f.type === "email" && !EMAIL.test(v)) errors[f.id] = "Enter an email like name@example.com."
        if (f.type === "number" && !/^-?\d+(\.\d+)?$/.test(v)) errors[f.id] = "Enter a number."
        if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[f.id] = "Pick a date."
        if ((f.type === "select" || f.type === "preferredTime") && f.options.length && !f.options.includes(v)) errors[f.id] = "Pick one of the options."
    }
    return errors
}
