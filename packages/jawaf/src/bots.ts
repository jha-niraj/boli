import { and, db, eq } from "@repo/db"
import { jawafBot } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { jawafLimitsFor, type JawafLimitOverrides } from "@repo/boli/jawaf"

/**
 * The bot core the engine and the jobs need: the row type, the tenant-checked loader and the page / file limits.
 * apps/main/lib/jawaf/bots.ts re-exports these and adds the view builders and the jsonb narrowing the UI needs.
 */

export type BotRow = typeof jawafBot.$inferSelect

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

export function narrowLimits(raw: unknown): JawafLimitOverrides {
    const o = obj(raw)
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined)
    return { pagesPerBot: n(o.pagesPerBot), filesPerBot: n(o.filesPerBot), fileMaxBytes: n(o.fileMaxBytes) }
}

export function botLimits(bot: BotRow) {
    return jawafLimitsFor(narrowLimits(bot.limits))
}

/** The bot, when it belongs to the workspace. Throws AppError('notfound') otherwise (never reveals another tenant's bot). */
export async function loadBot(workspaceId: string, botId: string): Promise<BotRow> {
    const [b] = await db.select().from(jawafBot).where(and(eq(jawafBot.id, botId), eq(jawafBot.workspaceId, workspaceId))).limit(1)
    if (!b) throw new AppError("notfound", "That bot could not be found in this workspace.")
    return b
}

/** A bot by id with no tenant filter - only for server-to-server callers that already hold the id (jobs, the admin). */
export async function loadBotById(botId: string): Promise<BotRow | null> {
    const [b] = await db.select().from(jawafBot).where(eq(jawafBot.id, botId)).limit(1)
    return b ?? null
}
