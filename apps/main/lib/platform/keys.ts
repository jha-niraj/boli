import "server-only"
import { and, count, db, desc, eq, isNull, lt, or, sql } from "@repo/db"
import { apiKey, user } from "@repo/db/schema"
import { sha256Hex } from "@repo/crypto"
import { AppError } from "@repo/errors"
import { ensurePersonalWorkspace } from "@repo/billing"
import { API_KEY_DISPLAY_LENGTH, API_KEY_PREFIX, API_KEY_RANDOM_LENGTH, MAX_API_KEYS } from "@repo/boli"

/**
 * API keys. The secret is shown ONCE (the return of createApiKey) and never stored: only its SHA-256 hex (unique,
 * looked up per request) and a display prefix. A key belongs to a WORKSPACE (it charges that workspace's credits);
 * `userId` records who created it. Every function filters by the workspace id.
 */

export type ApiKeyView = {
    id: string
    name: string
    prefix: string
    createdAt: Date
    lastUsedAt: Date | null
    revokedAt: Date | null
}

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

/** `length` base62 characters from a CSPRNG, without modulo bias (rejection sampling: 62 * 4 = 248 < 256). */
function randomBase62(length: number): string {
    let out = ""
    while (out.length < length) {
        const bytes = new Uint8Array(length * 2)
        crypto.getRandomValues(bytes)
        for (const b of bytes) {
            if (b < 248) out += BASE62[b % 62]
            if (out.length === length) break
        }
    }
    return out
}

function cleanName(name: string): string {
    const trimmed = typeof name === "string" ? name.trim() : ""
    if (trimmed.length < 1 || trimmed.length > 60) throw new AppError("validation", "Give the key a name of 1 to 60 characters.")
    return trimmed
}

export async function createApiKey(workspaceId: string, userId: string, name: string): Promise<{ id: string; key: string; prefix: string; createdAt: Date }> {
    const keyName = cleanName(name)
    const [active] = await db.select({ n: count() }).from(apiKey).where(and(eq(apiKey.workspaceId, workspaceId), isNull(apiKey.revokedAt)))
    if (Number(active?.n ?? 0) >= MAX_API_KEYS) {
        throw new AppError("conflict", `This workspace already has ${MAX_API_KEYS} active keys. Revoke one you no longer use, then create a new key.`)
    }
    const key = API_KEY_PREFIX + randomBase62(API_KEY_RANDOM_LENGTH)
    const prefix = key.slice(0, API_KEY_DISPLAY_LENGTH)
    const [row] = await db.insert(apiKey)
        .values({ userId, workspaceId, name: keyName, prefix, keyHash: sha256Hex(key) })
        .returning({ id: apiKey.id, createdAt: apiKey.createdAt })
    if (!row) throw new AppError("unknown", "The key could not be saved. Try again.")
    return { id: row.id, key, prefix, createdAt: row.createdAt }
}

/** The workspace's keys, newest first, revoked ones included (they show as "Revoked"). */
export async function listApiKeys(workspaceId: string): Promise<ApiKeyView[]> {
    return db.select({
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        revokedAt: apiKey.revokedAt,
    }).from(apiKey).where(eq(apiKey.workspaceId, workspaceId)).orderBy(desc(apiKey.createdAt))
}

/** Revoke one of the workspace's keys. Revoking twice keeps the first time; another workspace's key is "not found". */
export async function revokeApiKey(workspaceId: string, id: string): Promise<void> {
    const rows = await db.update(apiKey)
        .set({ revokedAt: sql`COALESCE(${apiKey.revokedAt}, now())` })
        .where(and(eq(apiKey.id, id), eq(apiKey.workspaceId, workspaceId)))
        .returning({ id: apiKey.id })
    if (!rows.length) throw new AppError("notfound", "That key could not be found.")
}

/**
 * The key behind a bearer token, or null (unknown, revoked, or its owner deactivated). `last_used_at` is bumped at
 * most once a minute, with a conditional UPDATE, so a busy key does not write on every request.
 */
export async function authenticateKey(token: string): Promise<{ keyId: string; userId: string; workspaceId: string } | null> {
    const t = typeof token === "string" ? token.trim() : ""
    if (!t.startsWith(API_KEY_PREFIX) || t.length !== API_KEY_PREFIX.length + API_KEY_RANDOM_LENGTH) return null
    const [row] = await db.select({ id: apiKey.id, userId: apiKey.userId, workspaceId: apiKey.workspaceId, lastUsedAt: apiKey.lastUsedAt, isActive: user.isActive })
        .from(apiKey)
        .innerJoin(user, eq(user.id, apiKey.userId))
        .where(and(eq(apiKey.keyHash, sha256Hex(t)), isNull(apiKey.revokedAt)))
        .limit(1)
    if (!row || row.isActive === false) return null
    const minuteAgo = new Date(Date.now() - 60_000)
    if (!row.lastUsedAt || row.lastUsedAt < minuteAgo) {
        try {
            await db.update(apiKey).set({ lastUsedAt: new Date() })
                .where(and(eq(apiKey.id, row.id), or(isNull(apiKey.lastUsedAt), lt(apiKey.lastUsedAt, minuteAgo))))
        } catch (err) {
            console.error("[api] could not update last_used_at", err instanceof Error ? err.message : err)
        }
    }
    // A key made before workspaces whose backfill has not run: it belongs to its creator's personal workspace (once).
    let workspaceId = row.workspaceId
    if (!workspaceId) {
        workspaceId = (await ensurePersonalWorkspace(row.userId)).id
        await db.update(apiKey).set({ workspaceId }).where(and(eq(apiKey.id, row.id), isNull(apiKey.workspaceId)))
    }
    return { keyId: row.id, userId: row.userId, workspaceId }
}
