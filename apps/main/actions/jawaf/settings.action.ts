"use server"

/**
 * Jawaf notification choices (Settings > Notifications), per person per bot. Stored in user_setting under
 * `jawaf.notify.<botId>` - the per-person key/value store, so no new column. Wave 4 (task 10) sends the emails, the
 * daily summary, the bell and push from these. Session + Jawaf view level in each export; ActionResult always.
 */
import { requireSession } from "@repo/auth/next"
import { db } from "@repo/db"
import { userSetting } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { loadBot } from "@/lib/jawaf/bots"
import { readNotifyPrefs, notifyKey } from "@/lib/jawaf/notify-prefs"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { jawafIdSchema, jawafNotifyPrefsSchema, type JawafNotifyPrefsInput } from "@/schemas/jawaf"
import type { JawafNotifyPrefs } from "@/types/jawaf"

export async function getJawafNotifyPrefs(botId: string): Promise<ActionResult<JawafNotifyPrefs>> {
    try {
        const session = await requireSession()
        const id = jawafIdSchema.safeParse(botId)
        if (!id.success) return failWith("validation", "That bot could not be found.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, id.data)
        return ok(await readNotifyPrefs(session.user.id, bot.id))
    } catch (err) {
        return fail(err, "jawaf.notify.get")
    }
}

export async function saveJawafNotifyPrefs(input: JawafNotifyPrefsInput): Promise<ActionResult<JawafNotifyPrefs>> {
    try {
        const session = await requireSession()
        const parsed = jawafNotifyPrefsSchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Check the choices.")
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const bot = await loadBot(ws.id, parsed.data.botId)
        const { botId: _b, ...prefs } = parsed.data
        const value: JawafNotifyPrefs = { ...prefs, extraEmails: [...new Set(prefs.extraEmails)] }
        const key = notifyKey(bot.id)
        await db.insert(userSetting)
            .values({ userId: session.user.id, key, value })
            .onConflictDoUpdate({ target: [userSetting.userId, userSetting.key], set: { value, updatedAt: new Date() } })
        return ok(value)
    } catch (err) {
        return fail(err, "jawaf.notify.save")
    }
}
