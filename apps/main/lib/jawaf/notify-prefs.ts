import "server-only"
import { and, db, eq } from "@repo/db"
import { userSetting } from "@repo/db/schema"
import type { JawafNotifyPrefs } from "@/types/jawaf"

/** A person's Jawaf notification choices for one bot live in user_setting under this key (no column needed). */
export const notifyKey = (botId: string) => `jawaf.notify.${botId}`

/** New contacts by email and the bell on; the daily summary and push are opt-in. */
export const DEFAULT_NOTIFY_PREFS: JawafNotifyPrefs = { contactEmail: true, extraEmails: [], dailySummary: false, bell: true, push: false }

function narrow(raw: unknown): JawafNotifyPrefs {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
    const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d)
    return {
        contactEmail: bool(o.contactEmail, DEFAULT_NOTIFY_PREFS.contactEmail),
        extraEmails: Array.isArray(o.extraEmails) ? o.extraEmails.filter((e): e is string => typeof e === "string").slice(0, 5) : [],
        dailySummary: bool(o.dailySummary, DEFAULT_NOTIFY_PREFS.dailySummary),
        bell: bool(o.bell, DEFAULT_NOTIFY_PREFS.bell),
        push: bool(o.push, DEFAULT_NOTIFY_PREFS.push),
    }
}

/** The stored choices, or the defaults when the person never saved any. Read only. */
export async function readNotifyPrefs(userId: string, botId: string): Promise<JawafNotifyPrefs> {
    const [row] = await db.select({ value: userSetting.value }).from(userSetting)
        .where(and(eq(userSetting.userId, userId), eq(userSetting.key, notifyKey(botId)))).limit(1)
    return narrow(row?.value)
}
