import "server-only"
import { and, db, eq, lt, sql } from "@repo/db"
import { jawafBot, jawafPage, jawafUsageMonth } from "@repo/db/schema"
import { accountForWorkspace, addCredits, creditsEnforced, workspaceHasCredits } from "@repo/billing"
import { JAWAF_PRICES } from "@repo/boli/jawaf"

/**
 * Jawaf money, all through the credit ledger (@repo/billing) with idempotency keys, INLINE (never after()):
 *
 * - Answers: `spend:jawaf-answer:<assistantMessageId>` at JAWAF_PRICES.answerMicro, after the workspace's
 *   freeAnswersPerMonth for the current NEPAL-time month (counted in jawaf_usage_month by one upsert-increment).
 *   Playground answers are free and not counted. Answered and not-found replies both count; a `credits` / `offline`
 *   reply never does.
 * - Web pages: the first JAWAF_PRICES.freePagesPerBot first-reads per bot are free (jawaf_bot.free_pages_used, moved by
 *   one conditional UPDATE), then `spend:jawaf-page:<pageId>` at pageMicro. A page is billed once ever (jawaf_page.billed):
 *   weekly re-reads and Train never charge again.
 * - Files: `spend:jawaf-file:<sourceId>` = pages x filePageMicro, once per uploaded file.
 * Charged whether or not CREDITS_ENFORCED is on; enforcement only decides whether work may START.
 */

/** "YYYY-MM" in Nepal time (UTC+5:45, no DST): the month the free answers reset on. */
export function nepalMonth(at: Date = new Date()): string {
    const shifted = new Date(at.getTime() + (5 * 60 + 45) * 60_000)
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

export async function answersThisMonth(workspaceId: string): Promise<number> {
    const [row] = await db.select({ answers: jawafUsageMonth.answers }).from(jawafUsageMonth)
        .where(and(eq(jawafUsageMonth.workspaceId, workspaceId), eq(jawafUsageMonth.month, nepalMonth()))).limit(1)
    return row?.answers ?? 0
}

/**
 * Whether a visitor answer may START: free answers left this month, or credits (when enforced). One or two small reads;
 * the playground skips this.
 */
export async function canAnswer(workspaceId: string): Promise<boolean> {
    if (!creditsEnforced()) return true
    if ((await answersThisMonth(workspaceId)) < JAWAF_PRICES.freeAnswersPerMonth) return true
    return workspaceHasCredits(workspaceId)
}

/** Count one visitor answer and charge it when the month's free answers are used up. Returns the micro-credits charged. */
export async function chargeAnswer(workspaceId: string, assistantMessageId: string): Promise<number> {
    const month = nepalMonth()
    const res = await db.execute(sql`
        INSERT INTO jawaf_usage_month (id, workspace_id, month, answers, updated_at)
        VALUES (${crypto.randomUUID()}, ${workspaceId}, ${month}, 1, now())
        ON CONFLICT (workspace_id, month) DO UPDATE SET answers = jawaf_usage_month.answers + 1, updated_at = now()
        RETURNING answers
    `)
    const answers = Number((res.rows[0] as { answers?: number } | undefined)?.answers ?? 0)
    if (answers <= JAWAF_PRICES.freeAnswersPerMonth) return 0
    const account = await accountForWorkspace(workspaceId)
    const r = await addCredits(account.id, {
        kind: "spend",
        amountMicro: -JAWAF_PRICES.answerMicro,
        key: `spend:jawaf-answer:${assistantMessageId}`,
        description: "Jawaf answer",
    })
    if (!r.applied) return 0
    await db.update(jawafUsageMonth).set({ chargedMicro: sql`${jawafUsageMonth.chargedMicro} + ${JAWAF_PRICES.answerMicro}` })
        .where(and(eq(jawafUsageMonth.workspaceId, workspaceId), eq(jawafUsageMonth.month, month)))
    return JAWAF_PRICES.answerMicro
}

/** Whether ingest work that may cost credits may start (free pages left on the bot, or credits). */
export async function canSpendOnIngest(workspaceId: string): Promise<boolean> {
    if (!creditsEnforced()) return true
    return workspaceHasCredits(workspaceId)
}

export async function botHasFreePages(botId: string): Promise<boolean> {
    const [b] = await db.select({ used: jawafBot.freePagesUsed }).from(jawafBot).where(eq(jawafBot.id, botId)).limit(1)
    return (b?.used ?? 0) < JAWAF_PRICES.freePagesPerBot
}

/**
 * Bill a page's FIRST successful read: free while the bot has free pages, else a spend. A page already billed is never
 * billed again. Returns what happened.
 */
export async function billPageRead(page: { id: string; billed: string | null; workspaceId: string; botId: string }): Promise<"free" | "paid" | "already"> {
    if (page.billed) return "already"
    const free = await db.update(jawafBot)
        .set({ freePagesUsed: sql`${jawafBot.freePagesUsed} + 1` })
        .where(and(eq(jawafBot.id, page.botId), lt(jawafBot.freePagesUsed, JAWAF_PRICES.freePagesPerBot)))
        .returning({ used: jawafBot.freePagesUsed })
    if (free.length) {
        await db.update(jawafPage).set({ billed: "free" }).where(eq(jawafPage.id, page.id))
        return "free"
    }
    const account = await accountForWorkspace(page.workspaceId)
    await addCredits(account.id, { kind: "spend", amountMicro: -JAWAF_PRICES.pageMicro, key: `spend:jawaf-page:${page.id}`, description: "Jawaf page read" })
    await db.update(jawafPage).set({ billed: "paid" }).where(eq(jawafPage.id, page.id))
    return "paid"
}

/** Bill an uploaded file's pages once. Returns the micro-credits charged (0 when already billed). */
export async function billFilePages(workspaceId: string, sourceId: string, pages: number): Promise<number> {
    const amount = Math.max(1, Math.round(pages)) * JAWAF_PRICES.filePageMicro
    const account = await accountForWorkspace(workspaceId)
    const r = await addCredits(account.id, { kind: "spend", amountMicro: -amount, key: `spend:jawaf-file:${sourceId}`, description: `Jawaf file read (${pages} pages)` })
    return r.applied ? amount : 0
}
