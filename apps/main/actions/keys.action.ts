"use server"

/**
 * API keys: create (the full key is returned ONCE, here, and never again), list, revoke. Every export checks the
 * session itself and returns ActionResult. Keys belong to the CURRENT workspace and need its API access. The key logic (hashing, the MAX_API_KEYS limit) lives in lib/platform/keys.ts.
 */
import { requireSession } from "@repo/auth/next"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/platform/keys"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { createKeySchema, keyIdSchema, type CreateKeyInput } from "@/schemas/keys"
import type { ApiKeyRow, CreatedApiKey } from "@/types/platform"

function iso(d: Date | string | null | undefined): string | null {
    if (!d) return null
    return typeof d === "string" ? d : d.toISOString()
}

export async function getApiKeys(): Promise<ActionResult<ApiKeyRow[]>> {
    try {
        await requireSession()
        const ws = await requireWorkspaceAccess("api")
        const rows = await listApiKeys(ws.id)
        return ok(rows.map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            createdAt: iso(k.createdAt) ?? "",
            lastUsedAt: iso(k.lastUsedAt),
            revokedAt: iso(k.revokedAt),
        })))
    } catch (err) {
        return fail(err, "keys.list")
    }
}

export async function createKey(input: CreateKeyInput): Promise<ActionResult<CreatedApiKey>> {
    try {
        const session = await requireSession({ fresh: true })
        const parsed = createKeySchema.safeParse(input)
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Give the key a name.")
        const ws = await requireWorkspaceAccess("api")
        const created = await createApiKey(ws.id, session.user.id, parsed.data.name)
        return ok({ id: created.id, key: created.key, prefix: created.prefix, createdAt: iso(created.createdAt) ?? "" })
    } catch (err) {
        return fail(err, "keys.create")
    }
}

export async function revokeKey(id: string): Promise<ActionResult<{ id: string }>> {
    try {
        await requireSession({ fresh: true })
        const parsed = keyIdSchema.safeParse(id)
        if (!parsed.success) return failWith("validation", "That key could not be found.")
        const ws = await requireWorkspaceAccess("api")
        await revokeApiKey(ws.id, parsed.data)
        return ok({ id: parsed.data })
    } catch (err) {
        return fail(err, "keys.revoke")
    }
}
