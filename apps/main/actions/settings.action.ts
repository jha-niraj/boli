"use server"

/**
 * The Settings hub's writes and refetches. Every export checks the session itself and returns ActionResult. Reads that
 * take a user id live in `lib/settings.ts` (server-only), never here.
 */
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@repo/auth"
import { requireSession } from "@repo/auth/next"
import { authErrorMessage } from "@repo/auth/errors"
import { db, eq } from "@repo/db"
import { account, notificationPreference, userSetting } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import {
    NOTIFICATION_TOPICS,
    SETTING_KEYS,
    isNotificationTopic,
    type AppearancePrefs,
} from "@/lib/settings-values"

export async function saveNotificationPreference(input: {
    topic: string
    channel: "email" | "inApp"
    enabled: boolean
}): Promise<ActionResult<null>> {
    try {
        const session = await requireSession()
        if (!isNotificationTopic(input.topic)) return failWith("validation", "That notification type does not exist.")
        if (input.channel !== "email" && input.channel !== "inApp") return failWith("validation", "Pick email or in-app.")
        const topic = NOTIFICATION_TOPICS.find((t) => t.key === input.topic)
        if (input.channel === "email" && topic && "emailLocked" in topic && topic.emailLocked) {
            return failWith("validation", "Security emails always go out - they are how you hear about a sign-in you did not make.")
        }
        const set = input.channel === "email"
            ? { email: input.enabled, updatedAt: new Date() }
            : { inApp: input.enabled, updatedAt: new Date() }
        await db.insert(notificationPreference)
            .values({ userId: session.user.id, topic: input.topic, ...set })
            .onConflictDoUpdate({ target: [notificationPreference.userId, notificationPreference.topic], set })
        return ok(null)
    } catch (err) {
        return fail(err, "settings.notifications")
    }
}

async function putSetting(userId: string, key: string, value: unknown): Promise<void> {
    await db.insert(userSetting)
        .values({ userId, key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: [userSetting.userId, userSetting.key], set: { value, updatedAt: new Date() } })
}

/** Density and reduced motion. The signed-in layout applies them on the first frame, so the whole tree revalidates. */
export async function saveAppearance(input: Partial<AppearancePrefs>): Promise<ActionResult<null>> {
    try {
        const session = await requireSession()
        if (input.density !== undefined) {
            if (input.density !== "comfortable" && input.density !== "compact") return failWith("validation", "Pick comfortable or compact.")
            await putSetting(session.user.id, SETTING_KEYS.density, input.density)
        }
        if (input.reducedMotion !== undefined) {
            if (typeof input.reducedMotion !== "boolean") return failWith("validation", "Turn reduced motion on or off.")
            await putSetting(session.user.id, SETTING_KEYS.reducedMotion, input.reducedMotion)
        }
        revalidatePath("/", "layout")
        return ok(null)
    } catch (err) {
        return fail(err, "settings.appearance")
    }
}

/**
 * Unlink Google. Refused when Google is the only saved way in (no password): an email code still works for a confirmed
 * address, but a person who never set a password would be one lost inbox away from being locked out, so we ask for a
 * password first. better-auth refuses to unlink the last account too; this says why in a sentence.
 */
export async function unlinkGoogle(): Promise<ActionResult<null>> {
    try {
        const session = await requireSession({ fresh: true })
        const rows = await db.select({ providerId: account.providerId, accountId: account.accountId, password: account.password })
            .from(account).where(eq(account.userId, session.user.id))
        const google = rows.find((r) => r.providerId === "google")
        if (!google) return failWith("validation", "Google is not linked to this account.")
        const hasPassword = rows.some((r) => r.providerId === "credential" && Boolean(r.password))
        const others = rows.filter((r) => r.providerId !== "google" && r.providerId !== "credential").length
        if (!hasPassword && others === 0) {
            return failWith("validation", "Google is your only saved way to sign in. Set a password first, then unlink Google.")
        }
        // better-auth 1.7 unlinks by the provider's account id (the Google user id), not by provider name.
        await auth.api.unlinkAccount({ body: { accountId: google.accountId }, headers: await headers() })
        revalidatePath("/settings/accounts")
        return ok(null)
    } catch (err) {
        // A better-auth APIError (duck-typed - apps never import better-auth) gets its own sentence.
        if (err && typeof err === "object" && "body" in err) {
            const body = (err as { body?: unknown }).body
            const code = body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : undefined
            if (code) return failWith("validation", authErrorMessage(code))
        }
        return fail(err, "settings.unlinkGoogle")
    }
}

/** Back to the defaults (every topic on, both channels): the rows go, and no row means the default. */
export async function resetNotificationPreferences(): Promise<ActionResult<null>> {
    try {
        const session = await requireSession()
        await db.delete(notificationPreference).where(eq(notificationPreference.userId, session.user.id))
        return ok(null)
    } catch (err) {
        return fail(err, "settings.notifications.reset")
    }
}

