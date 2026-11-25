import { and, count, db, eq, gte, isNotNull, lte, ne } from "@repo/db"
import { jawafBot, jawafContact, jawafConversation } from "@repo/db/schema"

/**
 * SKELETON (Wave 4, plan/main/jawaf/jawaf-v1.md task 10): the daily summary and follow-up reminder emails. The
 * scheduled `digest` Workflow in apps/jobs calls these as steps; today they only COUNT what an email would say and
 * send nothing. To finish: an email template in @repo/email (transactional), the owner's notify preference
 * (lib/jawaf/notify-prefs.ts in main), then `sendDigest` per workspace with the key `digest:<workspaceId>:<day>` so a
 * retried step never sends twice.
 */

export interface DigestBotLine {
    botId: string
    workspaceId: string
    name: string
    conversations: number
    contacts: number
    followUpsDue: number
}

/** Per bot: conversations and contacts since `since`, and contacts whose follow-up date has come (not converted). */
export async function collectDigest(since: Date, now: Date): Promise<DigestBotLine[]> {
    const [convs, contacts, due, bots] = await Promise.all([
        db.select({ botId: jawafConversation.botId, n: count() }).from(jawafConversation).where(gte(jawafConversation.startedAt, since)).groupBy(jawafConversation.botId),
        db.select({ botId: jawafContact.botId, n: count() }).from(jawafContact).where(gte(jawafContact.createdAt, since)).groupBy(jawafContact.botId),
        db.select({ botId: jawafContact.botId, n: count() }).from(jawafContact)
            .where(and(isNotNull(jawafContact.followUpAt), lte(jawafContact.followUpAt, now), ne(jawafContact.status, "converted"), ne(jawafContact.status, "not_interested")))
            .groupBy(jawafContact.botId),
        db.select({ id: jawafBot.id, workspaceId: jawafBot.workspaceId, name: jawafBot.name }).from(jawafBot).where(eq(jawafBot.status, "live")),
    ])
    const by = (rows: { botId: string; n: number }[]) => new Map(rows.map((r) => [r.botId, Number(r.n)]))
    const [c, k, f] = [by(convs), by(contacts), by(due)]
    return bots
        .map((b) => ({ botId: b.id, workspaceId: b.workspaceId, name: b.name, conversations: c.get(b.id) ?? 0, contacts: k.get(b.id) ?? 0, followUpsDue: f.get(b.id) ?? 0 }))
        .filter((l) => l.conversations + l.contacts + l.followUpsDue > 0)
}

/** Group the lines by workspace: one email per workspace. */
export function digestByWorkspace(lines: DigestBotLine[]): Map<string, DigestBotLine[]> {
    const out = new Map<string, DigestBotLine[]>()
    for (const l of lines) out.set(l.workspaceId, [...(out.get(l.workspaceId) ?? []), l])
    return out
}

/** NOT IMPLEMENTED YET: would send one workspace's digest. Returns false (nothing sent) so the Workflow reports it. */
export async function sendDigest(_workspaceId: string, _lines: DigestBotLine[], _day: string): Promise<boolean> {
    return false
}
