import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { asc, db, eq } from "@repo/db"
import { jawafBot } from "@repo/db/schema"
import { canUseProduct } from "@repo/boli/workspace-access"
import { getCurrentWorkspaceFor, type CurrentWorkspace } from "@/lib/workspace"
import type { JawafBotSummary } from "@/types/jawaf"
import { JAWAF_BOT_COOKIE } from "./bot-cookie"
import { toBotSummary, type BotRow } from "./bots"

/** What the signed-in person may do in Jawaf (the screens hide what the server would refuse anyway). */
export interface JawafCan {
    answer: boolean
    edit: boolean
    manage: boolean
}

export interface JawafContext {
    workspace: CurrentWorkspace
    bots: JawafBotSummary[]
    /** The current bot: the cookie's, when it belongs to this workspace, else the first one; null = no bot yet. */
    bot: BotRow | null
    can: JawafCan
}

/**
 * The current workspace's bots and the current bot, once per request (React `cache`). Every Jawaf page reads this
 * after `jawafGuard` (which checked the session and Jawaf access). One query: a workspace has at most 10 bots.
 */
export const getJawafContext = cache(async (userId: string): Promise<JawafContext> => {
    const [workspace, jar] = await Promise.all([getCurrentWorkspaceFor(userId), cookies()])
    const rows = await db.select().from(jawafBot).where(eq(jawafBot.workspaceId, workspace.id)).orderBy(asc(jawafBot.createdAt))
    const wanted = jar.get(JAWAF_BOT_COOKIE)?.value
    const bot = rows.find((r) => r.id === wanted) ?? rows[0] ?? null
    return {
        workspace,
        bots: rows.map(toBotSummary),
        bot,
        can: {
            answer: canUseProduct(workspace, "jawaf", "answer"),
            edit: canUseProduct(workspace, "jawaf", "edit"),
            manage: canUseProduct(workspace, "jawaf", "manage"),
        },
    }
})
