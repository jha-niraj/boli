// Move a Jawaf bot and EVERYTHING under it to another workspace (plan/admin/jawaf/admin-v1.md): the claim flow in
// apps/main and "Change owner" in apps/admin share this one function, so the list of tables lives in one place. Every
// row carries workspace_id (schema/jawaf.ts), so a move is one UPDATE per table, sent as ONE db.batch (one round trip;
// neon-http has no transactions, and a batch runs as one). The bot row moves LAST in the batch, guarded by the source
// workspace, so a bot that already moved (a double click) moves nothing.
import { and, eq } from 'drizzle-orm'
import { db } from './client'
import {
    jawafBot, jawafChunk, jawafContact, jawafConversation, jawafFactSection, jawafJob, jawafMessage, jawafNote, jawafPage, jawafQa, jawafSource,
} from './schema'

export interface MoveJawafBotInput {
    botId: string
    fromWorkspaceId: string
    toWorkspaceId: string
    /** Clear the demo flag (the "Claim it" ribbon goes): a claim, or an admin moving a demo to a customer. */
    clearDemo: boolean
}

/** Returns true when the bot moved (false: it was not in `fromWorkspaceId` any more). */
export async function moveJawafBot(input: MoveJawafBotInput): Promise<boolean> {
    const { botId, fromWorkspaceId: from, toWorkspaceId: to } = input
    if (from === to) return false
    const now = new Date()
    const children = [jawafSource, jawafPage, jawafFactSection, jawafQa, jawafNote, jawafChunk, jawafJob, jawafConversation, jawafMessage, jawafContact] as const
    const [first, ...rest] = children.map((t) => db.update(t).set({ workspaceId: to }).where(and(eq(t.botId, botId), eq(t.workspaceId, from))))
    const results = await db.batch([
        first!,
        ...rest,
        db.update(jawafBot)
            .set({ workspaceId: to, updatedAt: now, ...(input.clearDemo ? { demo: false, claimCodeHash: null, claimExpiresAt: null } : {}) })
            .where(and(eq(jawafBot.id, botId), eq(jawafBot.workspaceId, from)))
            .returning({ id: jawafBot.id }),
    ])
    const moved = results[results.length - 1] as unknown as { id: string }[]
    return moved.length > 0
}
