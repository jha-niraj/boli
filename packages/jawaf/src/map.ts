import { and, asc, count, db, eq, sql } from "@repo/db"
import { jawafPage, jawafSource } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { JAWAF_PRICES } from "@repo/boli/jawaf"
import { botLimits, type BotRow } from "./bots"
import { mapSite } from "./crawl"

export type PageRow = typeof jawafPage.$inferSelect

export interface StoredSiteMap {
    sourceId: string
    pages: PageRow[]
    included: number
    dropped: number
}

/**
 * Map the bot's website and store every page found. Only the best pages up to the FREE allowance
 * (JAWAF_PRICES.freePagesPerBot) are pre-ticked - home, pricing, about, contact, services, admission, FAQ - never a
 * blog / news / legal page (crawl.ts rankLinks); the rest are listed unticked so a new bot's first read costs nothing.
 * Re-mapping keeps the owner's earlier choices and read state for pages already known (an upsert on bot + url key), so
 * running it twice is safe. Used inline by the setup screen (local) and by the `map` job step (Workflow).
 */
export async function mapAndStoreSitePages(bot: BotRow, url: string, userId: string | null): Promise<StoredSiteMap> {
    const limit = botLimits(bot).pagesPerBot
    const free = JAWAF_PRICES.freePagesPerBot
    const map = await mapSite(url, limit, free)
    let [source] = await db.select().from(jawafSource).where(and(eq(jawafSource.botId, bot.id), eq(jawafSource.kind, "site"))).limit(1)
    if (!source) {
        ;[source] = await db.insert(jawafSource).values({ workspaceId: bot.workspaceId, botId: bot.id, kind: "site", url, status: "queued", pagesFound: map.found, createdById: userId }).returning()
    } else {
        await db.update(jawafSource).set({ url, pagesFound: map.found, updatedAt: new Date() }).where(eq(jawafSource.id, source.id))
    }
    if (!source) throw new AppError("unknown", "The website could not be saved. Try again.")
    // How many are already included (an earlier map / added URLs) - new pages are ticked only up to the free allowance.
    const [{ n: alreadyIncluded } = { n: 0 }] = await db.select({ n: count() }).from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included")))
    let room = Math.max(0, Math.min(free, limit) - Number(alreadyIncluded))
    const rows = map.pages.map((p) => {
        const include = p.suggested && room > 0
        if (include) room--
        return {
            workspaceId: bot.workspaceId,
            botId: bot.id,
            sourceId: source!.id,
            url: p.url,
            urlKey: p.urlKey,
            title: p.title,
            status: include ? "included" : "excluded",
            readStatus: "pending",
            suggested: p.suggested,
            rank: p.rank,
        }
    })
    for (let i = 0; i < rows.length; i += 100) {
        await db.insert(jawafPage).values(rows.slice(i, i + 100)).onConflictDoUpdate({
            target: [jawafPage.botId, jawafPage.urlKey],
            set: { rank: sql`excluded.rank`, suggested: sql`excluded.suggested`, title: sql`coalesce(${jawafPage.title}, excluded.title)`, updatedAt: new Date() },
        })
    }
    const pages = await db.select().from(jawafPage).where(eq(jawafPage.sourceId, source.id)).orderBy(asc(jawafPage.rank))
    return { sourceId: source.id, pages, included: pages.filter((p) => p.status === "included").length, dropped: map.dropped }
}
