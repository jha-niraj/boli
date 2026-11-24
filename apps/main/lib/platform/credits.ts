import "server-only"
import { db } from "@repo/db"
import { inferenceRequest } from "@repo/db/schema"
import { accountForWorkspace, appliedBalance, balanceMicroForWorkspace, creditsEnforced, grantWelcome, ledgerEntrySql, workspaceHasCredits } from "@repo/billing"
import { costMicro, CREDIT_PACKS, MICRO_PER_CREDIT, modelById, WELCOME_CREDITS } from "@repo/boli"
import {
    CREDIT_PACKS as BILLING_PACKS, findPack, PAISA_PER_CREDIT, WELCOME_CREDITS as BILLING_WELCOME_CREDITS, MICRO_PER_CREDIT as BILLING_MICRO_PER_CREDIT,
} from "@repo/billing/plans"

/**
 * Credits for Kura and the API, in integer micro-credits (1 credit = Rs 1 = 1,000,000). Money moves INLINE, never in
 * after(): a charge is one db.batch (one round trip, one transaction on Neon HTTP) and is idempotent on the request id.
 * Credits belong to a WORKSPACE (plan/main/jawaf/jawaf-v1.md): every read and charge here takes the workspace id - the
 * current one for Kura (lib/workspace.ts), the key's own for the API.
 */

if (WELCOME_CREDITS !== BILLING_WELCOME_CREDITS || MICRO_PER_CREDIT !== BILLING_MICRO_PER_CREDIT) {
    console.error("[credits] lib/boli.ts and @repo/billing/plans disagree on WELCOME_CREDITS or MICRO_PER_CREDIT - keep them equal")
}

// The packs shown (lib/boli.ts) and the packs charged (@repo/billing, the server-side table) must be the same list.
if (
    CREDIT_PACKS.length !== BILLING_PACKS.length ||
    CREDIT_PACKS.some((p) => {
        const b = findPack(p.id)
        return !b || b.credits !== p.credits || b.price.NPR !== p.rupees * PAISA_PER_CREDIT
    })
) {
    console.error("[credits] lib/boli.ts CREDIT_PACKS and @repo/billing/plans CREDIT_PACKS disagree - keep them equal")
}

export type ChargeInput = {
    id?: string
    /** Who made the call (kept on the row for history). */
    userId: string
    /** The workspace charged. */
    workspaceId: string
    apiKeyId?: string | null
    source: "kura" | "api"
    model: string
    conversationId?: string | null
    inputTokens: number
    outputTokens: number
    reasoningTokens?: number
    latencyMs?: number | null
    firstTokenMs?: number | null
    stream: boolean
    status: "ok" | "error"
    errorCode?: string | null
}

/** A workspace's balance in micro-credits; no account yet = 0 (a read never creates one). */
export async function getBalanceMicro(workspaceId: string): Promise<number> {
    return balanceMicroForWorkspace(workspaceId)
}

/**
 * Whether the person may START a model call: true when CREDITS_ENFORCED is off, else balance > 0. A call already
 * running always finishes and is charged, so a balance can end slightly below zero.
 */
export async function hasBalance(workspaceId: string): Promise<boolean> {
    if (!creditsEnforced()) return true
    return workspaceHasCredits(workspaceId)
}

/** The one-time welcome grant (WELCOME_CREDITS, key `welcome:<accountId>`) on the person's PERSONAL workspace. Idempotent. */
export async function grantWelcomeCredits(userId: string): Promise<{ applied: boolean }> {
    const r = await grantWelcome(userId)
    return { applied: r.applied }
}

const whole = (n: number | null | undefined): number => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : 0)

/**
 * Record one model call and charge it. ONE db.batch: the `inference_request` row (insert, ignored when the id exists)
 * + the ledger spend row `spend:<requestId>` with the balance decrement in the same statement (ignored when the key
 * exists). A retry with the same `id` changes nothing. Errors cost 0 but are still recorded. Charged whether or not
 * credits are enforced (enforcement only decides whether a call may START).
 */
export async function chargeInference(row: ChargeInput): Promise<{ requestId: string; costMicro: number; balanceMicro: number }> {
    const requestId = row.id ?? crypto.randomUUID()
    const inputTokens = whole(row.inputTokens)
    const outputTokens = whole(row.outputTokens)
    const model = modelById(row.model)
    const cost = row.status === "ok" && model ? costMicro(model, inputTokens, outputTokens) : 0
    const account = await accountForWorkspace(row.workspaceId)

    const insertRow = db.insert(inferenceRequest).values({
        id: requestId,
        userId: row.userId,
        workspaceId: row.workspaceId,
        apiKeyId: row.apiKeyId ?? null,
        source: row.source,
        model: row.model,
        conversationId: row.conversationId ?? null,
        inputTokens,
        outputTokens,
        reasoningTokens: whole(row.reasoningTokens),
        costMicro: cost,
        latencyMs: row.latencyMs == null ? null : whole(row.latencyMs),
        firstTokenMs: row.firstTokenMs == null ? null : whole(row.firstTokenMs),
        stream: row.stream ? 1 : 0,
        status: row.status,
        errorCode: row.errorCode ?? null,
    }).onConflictDoNothing({ target: inferenceRequest.id })

    if (cost <= 0) {
        await insertRow
        return { requestId, costMicro: 0, balanceMicro: account.balanceMicro }
    }

    const [, ledger] = await db.batch([
        insertRow,
        db.execute(ledgerEntrySql(account.id, {
            kind: "spend",
            amountMicro: -cost,
            key: `spend:${requestId}`,
            description: row.source === "kura" ? "Kura chat" : "API call",
        })),
    ])
    const after = appliedBalance(ledger)
    return { requestId, costMicro: cost, balanceMicro: after ?? (await balanceMicroForWorkspace(row.workspaceId)) }
}
