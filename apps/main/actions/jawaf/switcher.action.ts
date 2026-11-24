"use server"

/**
 * The Jawaf sidebar's bot switcher - the ONLY export here, because the shell (every signed-in route) imports this file
 * and a 'use server' file registers every export on every route that imports it (AGENTS.md section 3). Switching itself
 * is a cookie the browser writes (lib/jawaf/bot-cookie.ts) followed by a refresh; no server write.
 */
import { cookies } from "next/headers"
import { requireSession } from "@repo/auth/next"
import { asc, db, eq } from "@repo/db"
import { jawafBot } from "@repo/db/schema"
import { fail, ok, type ActionResult } from "@repo/errors"
import { JAWAF_BOT_COOKIE } from "@/lib/jawaf/bot-cookie"
import { requireWorkspaceAccess } from "@/lib/workspace"
import type { JawafBotStatus, JawafSwitcherData } from "@/types/jawaf"

export async function listJawafBotOptions(): Promise<ActionResult<JawafSwitcherData>> {
    try {
        await requireSession()
        const ws = await requireWorkspaceAccess("jawaf", "view")
        const [rows, jar] = await Promise.all([
            db.select({ id: jawafBot.id, name: jawafBot.name, status: jawafBot.status }).from(jawafBot)
                .where(eq(jawafBot.workspaceId, ws.id)).orderBy(asc(jawafBot.createdAt)),
            cookies(),
        ])
        const wanted = jar.get(JAWAF_BOT_COOKIE)?.value
        const current = rows.find((r) => r.id === wanted) ?? rows[0] ?? null
        return ok({
            bots: rows.map((r) => ({ id: r.id, name: r.name, status: (r.status === "live" ? "live" : "draft") as JawafBotStatus })),
            currentId: current?.id ?? null,
        })
    } catch (err) {
        return fail(err, "jawaf.switcher.list")
    }
}
