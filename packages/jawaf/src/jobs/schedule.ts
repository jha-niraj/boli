import { and, db, eq, inArray, lt, sql } from "@repo/db"
import { jawafPage, jawafSource } from "@repo/db/schema"
import { JAWAF_LIMITS } from "@repo/boli/jawaf"
import { loadBot, type BotRow } from "../bots"
import { enqueueJob, type JobRow } from "./rows"

/**
 * Starting work: the row writes that come before a job (pages back to pending, sources to "reading"), then the row.
 * Every function here returns the job row(s); the CALLER dispatches them (packages/jobs client), which is a no-op
 * locally and a Workflow instance under JOBS_RUNNER=workflow.
 */

/**
 * Start reading a bot's included pages. `reread`: every included page goes back to pending (Train now / weekly);
 * unchanged pages are then skipped by their hash. `draft`: draft the fact sheet afterwards (first read).
 */
export async function startRead(bot: BotRow, opts: { reread?: boolean; draft?: boolean; createdById?: string | null } = {}): Promise<JobRow> {
    if (opts.reread) {
        await db.update(jawafPage).set({ readStatus: "pending", updatedAt: new Date() })
            .where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included"), inArray(jawafPage.readStatus, ["read", "failed"]), sql`${jawafPage.url} IS NOT NULL`))
    }
    await db.update(jawafSource).set({ status: "reading", updatedAt: new Date() }).where(and(eq(jawafSource.botId, bot.id), inArray(jawafSource.kind, ["site", "url"])))
    return enqueueJob({ workspaceId: bot.workspaceId, botId: bot.id, kind: "read", createdById: opts.createdById, cursor: { draft: Boolean(opts.draft) }, label: "Starting to read" })
}

/** The bots whose site source is due for its weekly re-read (at most `limit`). */
export async function dueRereads(now: Date, limit = 50): Promise<{ botId: string; workspaceId: string }[]> {
    return db.selectDistinct({ botId: jawafSource.botId, workspaceId: jawafSource.workspaceId }).from(jawafSource)
        .where(and(inArray(jawafSource.kind, ["site", "url"]), lt(jawafSource.nextReadAt, now))).limit(limit)
}

/**
 * Queue ONE bot's weekly re-read (re-reads never charge; unchanged pages are skipped). Moves next_read_at first, so a
 * retry or an overlapping run does not queue it twice (and enqueueJob returns the active job anyway). null = bot gone.
 */
export async function queueReread(d: { botId: string; workspaceId: string }, now: Date): Promise<JobRow | null> {
    const bot = await loadBot(d.workspaceId, d.botId).catch(() => null)
    if (!bot) return null
    await db.update(jawafSource).set({ nextReadAt: new Date(now.getTime() + JAWAF_LIMITS.rereadDays * 86_400_000) })
        .where(and(eq(jawafSource.botId, bot.id), inArray(jawafSource.kind, ["site", "url"])))
    return startRead(bot, { reread: true })
}

/** Queue the weekly re-read for every bot whose site source is due. Returns the queued jobs (for dispatch). */
export async function queueWeeklyRereads(now: Date): Promise<JobRow[]> {
    const out: JobRow[] = []
    for (const d of await dueRereads(now)) {
        const job = await queueReread(d, now)
        if (job) out.push(job)
    }
    return out
}
