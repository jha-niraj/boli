// @repo/erasure - erase one user: their stored files, then their rows in dependency order, then the user, with an
// `erasure_request` record that outlives them. Sequential idempotent writes (db.transaction throws on neon-http): a
// run cut off half way is finished by running it again.
import { db, eq, sql } from '@repo/db'
import { adminAccess, erasureRequest, user } from '@repo/db/schema'
import { AppError, fail, ok, type ActionResult } from '@repo/errors'
import { deleteFile, isResolvedStorageValue, isStorageConfigured, keyFromPublicUrl } from '@repo/storage'

/**
 * Rows that belong to the user, deleted IN THIS ORDER (children before parents) by `column = userId`. A table that does
 * not exist (yet) is skipped, so a clone can list tables it adds later. Append new per-user tables here; a table whose
 * rows must be KEPT de-identified (payments, usage, audit) goes in `DETACH_TABLES` instead.
 */
export const ERASE_TABLES: ReadonlyArray<{ table: string; column: string }> = [
    // Boli: per-call metadata (no prompt text) points at api_key, so it goes first.
    { table: 'inference_request', column: 'user_id' },
    { table: 'api_key', column: 'user_id' },
    { table: 'ai_message', column: 'user_id' },
    { table: 'ai_conversation', column: 'user_id' },
    { table: 'notification', column: 'user_id' },
    { table: 'legal_acceptance', column: 'user_id' },
    { table: 'payment_customer', column: 'user_id' },
    { table: 'session', column: 'user_id' },
    { table: 'account', column: 'user_id' },
]

/** Records kept for accounting / audit, with the user reference cleared (`column = NULL`). */
export const DETACH_TABLES: ReadonlyArray<{ table: string; column: string }> = [
    { table: 'ai_usage_log', column: 'user_id' },
    { table: 'payment_event', column: 'user_id' },
    { table: 'feedback', column: 'user_id' },
]

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Which `table.column` pairs exist, in one query. */
async function existingColumns(pairs: ReadonlyArray<{ table: string; column: string }>): Promise<Set<string>> {
    if (pairs.length === 0) return new Set()
    const tables = [...new Set(pairs.map((p) => p.table))]
    const result = await db.execute(sql`
        SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name IN (${sql.join(tables.map((t) => sql`${t}`), sql`, `)})`)
    const rows = result.rows as Array<{ table_name: string; column_name: string }>
    return new Set(rows.map((r) => `${r.table_name}.${r.column_name}`))
}

/** The storage key behind a stored file value, or null for an external URL (a Google avatar) or nothing. */
function storedKey(value: string | null): string | null {
    if (!value) return null
    const legacy = keyFromPublicUrl(value)
    if (legacy) return legacy
    return isResolvedStorageValue(value) ? null : value
}

/** Erase a user, recording who asked. `eraseUser` is this with `requestedBy: 'self'`. */
export async function eraseUserAs(userId: string, requestedBy: string): Promise<ActionResult<{ deleted: true }>> {
    let requestId: string | null = null
    const counts: Record<string, number> = {}
    try {
        if (!userId) throw new AppError('validation', 'No account to delete.')
        const [person] = await db.select({ email: user.email, image: user.image }).from(user).where(eq(user.id, userId)).limit(1)
        if (!person) return ok({ deleted: true }) // already gone - idempotent

        // An admin account owns audit history (admin_audit_log cascades from admin_access): another admin removes
        // their admin access first, so the trail is a decision, not a side effect of deleting an account.
        const [admin] = await db.select({ id: adminAccess.id }).from(adminAccess).where(eq(adminAccess.userId, userId)).limit(1)
        if (admin) throw new AppError('forbidden', 'This account has admin access. Ask another admin to remove it first.')

        const [request] = await db
            .insert(erasureRequest)
            .values({ userId, emailHash: await sha256Hex(person.email.trim().toLowerCase()), requestedBy, status: 'running' })
            .returning({ id: erasureRequest.id })
        requestId = request?.id ?? null

        // 1. Files first: once the row is gone nothing points at them any more.
        const avatarKey = storedKey(person.image)
        if (avatarKey) {
            if (isStorageConfigured()) {
                await deleteFile(avatarKey)
                counts.files = 1
            } else {
                console.warn('[erasure] storage not configured - avatar object left in place')
                counts.filesSkipped = 1
            }
        }

        // 2. Rows, children before parents.
        const present = await existingColumns([...ERASE_TABLES, ...DETACH_TABLES])
        for (const { table, column } of DETACH_TABLES) {
            if (!present.has(`${table}.${column}`)) continue
            const r = await db.execute(sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = NULL WHERE ${sql.identifier(column)} = ${userId} RETURNING 1`)
            if (r.rows.length) counts[`${table}_detached`] = r.rows.length
        }
        for (const { table, column } of ERASE_TABLES) {
            if (!present.has(`${table}.${column}`)) continue
            const r = await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${userId} RETURNING 1`)
            if (r.rows.length) counts[table] = r.rows.length
        }
        // The user's billing account goes too: balance, ledger and subscription cascade with it; payment rows stay with
        // account_id set to NULL (kept de-identified for accounting; owner, 2026-11-24).
        // Since workspaces (plan/main/jawaf/jawaf-v1.md) the account belongs to the person's PERSONAL workspace; that
        // workspace itself (with its members, invitations, keys and chats) cascades from the user row in step 3.
        const b = await db.execute(sql`DELETE FROM "billing_account" WHERE ("owner_type" = 'user' AND "owner_id" = ${userId})
            OR ("owner_type" = 'workspace' AND "owner_id" IN (SELECT "id" FROM "workspace" WHERE "personal_owner_id" = ${userId})) RETURNING 1`)
        if (b.rows.length) counts.billing_account = b.rows.length
        const v = await db.execute(sql`DELETE FROM "verification" WHERE "identifier" = ${person.email} RETURNING 1`)
        if (v.rows.length) counts.verification = v.rows.length

        // 3. The user (anything still referencing it cascades or is set null by its FK).
        await db.delete(user).where(eq(user.id, userId))
        counts.user = 1

        if (requestId) {
            await db.update(erasureRequest).set({ status: 'completed', counts, completedAt: new Date() }).where(eq(erasureRequest.id, requestId))
        }
        return ok({ deleted: true })
    } catch (err) {
        if (requestId) {
            const message = err instanceof Error ? err.message : String(err)
            await db
                .update(erasureRequest)
                .set({ status: 'failed', counts, error: message.slice(0, 1000) })
                .where(eq(erasureRequest.id, requestId))
                .catch(() => undefined)
        }
        return fail(err)
    }
}

/**
 * Delete-my-account: erase the user's files and data and the user. Returns ActionResult (never throws). The caller
 * then signs the browser out (cookies) - the sessions are already deleted here.
 */
export async function eraseUser(userId: string): Promise<ActionResult<{ deleted: true }>> {
    return eraseUserAs(userId, 'self')
}
