"use server"

/** The header's Feedback popover: one row in `feedback` per message. */
import { requireSession } from "@repo/auth/next"
import { db } from "@repo/db"
import { feedback } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { feedbackSchema, type FeedbackInput } from "@/schemas/feedback"

export async function sendFeedback(input: FeedbackInput): Promise<ActionResult<{ id: string }>> {
    try {
        const session = await requireSession()
        const parsed = feedbackSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Write a few words first.")
        const d = parsed.data
        const id = crypto.randomUUID()
        await db.insert(feedback).values({
            id,
            userId: session.user.id,
            message: d.message,
            rating: d.rating ?? null,
            page: d.page ? d.page.split("?")[0]!.slice(0, 300) : null,
        })
        return ok({ id })
    } catch (err) {
        return fail(err, "feedback.send")
    }
}
