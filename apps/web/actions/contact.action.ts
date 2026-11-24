"use server"

/**
 * The /contact form. Public on purpose (no session): anyone can write to us. Input is parsed with the
 * shared zod schema; a filled honeypot field is answered with a normal success and nothing is stored, so a bot learns
 * nothing. At most CONTACT_PER_HOUR messages an hour from one IP (owner, 2026-11-24); only a hash of the IP is kept.
 */
import { headers } from "next/headers"
import { and, count, db, eq, gte } from "@repo/db"
import { contactMessage } from "@repo/db/schema"
import { sha256Hex } from "@repo/crypto"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { contactSchema, type ContactInput } from "@/schemas/contact"

const CONTACT_PER_HOUR = 5

export async function submitContactMessage(input: ContactInput): Promise<ActionResult<{ received: true }>> {
    try {
        const parsed = contactSchema.safeParse(input)
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {}
            for (const issue of parsed.error.issues) {
                const key = String(issue.path[0] ?? "form")
                if (!fieldErrors[key]) fieldErrors[key] = issue.message
            }
            return failWith("validation", parsed.error.issues[0]?.message ?? "Check the form and try again.", { fieldErrors })
        }
        const { website, ...data } = parsed.data
        if (website && website.trim()) return ok({ received: true })
        const h = await headers()
        const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown"
        const ipHash = await sha256Hex(`contact:${ip}`)
        const [recent] = await db.select({ n: count() }).from(contactMessage)
            .where(and(eq(contactMessage.ipHash, ipHash), gte(contactMessage.createdAt, new Date(Date.now() - 60 * 60 * 1000))))
        if ((recent?.n ?? 0) >= CONTACT_PER_HOUR) {
            return failWith("ratelimit", "You have sent several messages in the last hour. Please wait a little and try again, or email us directly.")
        }
        await db.insert(contactMessage).values({ name: data.name, email: data.email, topic: data.topic, message: data.message, ipHash })
        return ok({ received: true })
    } catch (err) {
        return fail(err)
    }
}
