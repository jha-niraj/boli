"use server"

/**
 * Communications > Inbox: the site's contact messages (Jawaf pilot requests among them) and the app's feedback.
 * Reading needs `communications` read; marking handled needs `communications` write and leaves an audit row. Every
 * export checks the admin itself and returns ActionResult. Reads live in lib/inbox.ts (server only).
 */
import { revalidatePath } from "next/cache"
import { and, db, eq, isNotNull, isNull } from "@repo/db"
import { adminAuditLog, contactMessage, feedback } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { inboxStats, listContactMessages, listFeedback } from "@/lib/inbox"
import { inboxFiltersSchema, inboxPageSchema, setHandledSchema, type SetHandledInput } from "@/schemas/inbox"
import type { InboxContactRow, InboxFeedbackRow, InboxFilters, InboxPage, InboxStats } from "@/types/inbox"
import { requireAdminAction } from "./guard"

const MODULE = "communications" as const
const INBOX_PATH = "/communications/inbox"

export async function getInboxStats(): Promise<ActionResult<InboxStats>> {
    try {
        await requireAdminAction(MODULE, "read")
        return ok(await inboxStats())
    } catch (err) {
        return fail(err)
    }
}

export async function getContactMessages(filters: InboxFilters, page = 1): Promise<ActionResult<InboxPage<InboxContactRow>>> {
    try {
        await requireAdminAction(MODULE, "read")
        return ok(await listContactMessages(inboxFiltersSchema.parse(filters ?? {}), inboxPageSchema.parse(page)))
    } catch (err) {
        return fail(err)
    }
}

export async function getFeedbackList(filters: InboxFilters, page = 1): Promise<ActionResult<InboxPage<InboxFeedbackRow>>> {
    try {
        await requireAdminAction(MODULE, "read")
        const clean = inboxFiltersSchema.parse(filters ?? {})
        return ok(await listFeedback({ ...clean, topic: undefined }, inboxPageSchema.parse(page)))
    } catch (err) {
        return fail(err)
    }
}

/** Mark a contact message handled (or open again). Idempotent: a row already in that state changes nothing. */
export async function setContactHandled(input: SetHandledInput): Promise<ActionResult<{ handled: boolean }>> {
    try {
        const admin = await requireAdminAction(MODULE, "write")
        const parsed = setHandledSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Choose a message.")
        const { id, handled } = parsed.data
        const changed = await db
            .update(contactMessage)
            .set(handled ? { handledAt: new Date(), handledBy: admin.id } : { handledAt: null, handledBy: null })
            .where(and(eq(contactMessage.id, id), handled ? isNull(contactMessage.handledAt) : isNotNull(contactMessage.handledAt)))
            .returning({ id: contactMessage.id, topic: contactMessage.topic })
        if (changed.length === 0) {
            const [exists] = await db.select({ id: contactMessage.id }).from(contactMessage).where(eq(contactMessage.id, id)).limit(1)
            if (!exists) return failWith("notfound", "That message could not be found.")
            return ok({ handled })
        }
        await db.insert(adminAuditLog).values({
            adminId: admin.id, action: "UPDATE", module: MODULE, resourceType: "ContactMessage", resourceId: id,
            description: handled ? "Marked a contact message handled" : "Opened a contact message again",
            metadata: { topic: changed[0]?.topic ?? null },
        })
        revalidatePath(INBOX_PATH)
        return ok({ handled })
    } catch (err) {
        return fail(err)
    }
}

/** Mark app feedback handled (or open again). Idempotent like setContactHandled. */
export async function setFeedbackHandled(input: SetHandledInput): Promise<ActionResult<{ handled: boolean }>> {
    try {
        const admin = await requireAdminAction(MODULE, "write")
        const parsed = setHandledSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Choose a feedback message.")
        const { id, handled } = parsed.data
        const changed = await db
            .update(feedback)
            .set(handled ? { handledAt: new Date(), handledBy: admin.id } : { handledAt: null, handledBy: null })
            .where(and(eq(feedback.id, id), handled ? isNull(feedback.handledAt) : isNotNull(feedback.handledAt)))
            .returning({ id: feedback.id })
        if (changed.length === 0) {
            const [exists] = await db.select({ id: feedback.id }).from(feedback).where(eq(feedback.id, id)).limit(1)
            if (!exists) return failWith("notfound", "That feedback could not be found.")
            return ok({ handled })
        }
        await db.insert(adminAuditLog).values({
            adminId: admin.id, action: "UPDATE", module: MODULE, resourceType: "Feedback", resourceId: id,
            description: handled ? "Marked app feedback handled" : "Opened app feedback again",
        })
        revalidatePath(INBOX_PATH)
        return ok({ handled })
    } catch (err) {
        return fail(err)
    }
}
