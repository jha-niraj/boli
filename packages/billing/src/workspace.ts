// @repo/billing - the WORKSPACE side of the billing owner (server only). Plan: plan/main/jawaf/jawaf-v1.md.
//
// Credits belong to a workspace: billing_account (ownerType 'workspace', ownerId = workspace.id). Every user has one
// PERSONAL workspace (workspace.personal_owner_id = user.id, unique). It is created here, next to the account, so every
// path that gives credits (the welcome grant in @repo/auth's hooks, an admin grant, a purchase) creates it the same way.
//
// Accounts made before workspaces were ('user', user.id). scripts/backfill-workspaces.mjs moves them IN PLACE (same
// account id, so ledger keys like `welcome:<accountId>` still match); until it has run for someone, the first
// `accountForWorkspace` on their personal workspace adopts the old row the same way - no balance is ever split.
//
// Idempotent without transactions (neon-http): unique personal_owner_id, unique (workspace_id, user_id), unique
// (owner_type, owner_id) on billing_account - a racing second insert does nothing and the re-read finds the winner.
import { and, db, eq } from '@repo/db'
import { billingAccount, user, workspace, workspaceMember } from '@repo/db/schema'
import { getOrCreateAccount, type BillingAccountRow } from './ledger'

export interface PersonalWorkspace {
    id: string
    name: string
}

/** Keep equal to @repo/boli/workspace-access `personalWorkspaceName` (billing does not depend on @repo/boli). */
function personalName(name: string | null | undefined): string {
    const first = (name ?? '').trim().split(/\s+/)[0]
    return first ? `${first.slice(0, 40)}'s workspace` : 'My workspace'
}

/** The person's personal workspace, or null. A read: never creates. */
export async function findPersonalWorkspace(userId: string): Promise<PersonalWorkspace | null> {
    const [row] = await db.select({ id: workspace.id, name: workspace.name }).from(workspace).where(eq(workspace.personalOwnerId, userId)).limit(1)
    return row ?? null
}

/**
 * The person's personal workspace, created with their owner membership on first use. Safe to call any number of times
 * and from racing requests. One read on the fast path.
 */
export async function ensurePersonalWorkspace(userId: string, name?: string | null): Promise<PersonalWorkspace> {
    const [found] = await db
        .select({ id: workspace.id, name: workspace.name, memberId: workspaceMember.id })
        .from(workspace)
        .leftJoin(workspaceMember, and(eq(workspaceMember.workspaceId, workspace.id), eq(workspaceMember.userId, userId)))
        .where(eq(workspace.personalOwnerId, userId))
        .limit(1)
    if (found?.memberId) return { id: found.id, name: found.name }

    let ws: PersonalWorkspace | undefined = found ? { id: found.id, name: found.name } : undefined
    if (!ws) {
        let display = name
        if (display === undefined) {
            const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
            if (!u) throw new Error(`No user ${userId} to make a workspace for`)
            display = u.name
        }
        const inserted = await db.insert(workspace)
            .values({ name: personalName(display), personalOwnerId: userId, createdById: userId })
            .onConflictDoNothing()
            .returning({ id: workspace.id, name: workspace.name })
        ws = inserted[0] ?? (await findPersonalWorkspace(userId)) ?? undefined
        if (!ws) throw new Error(`Personal workspace for ${userId} neither inserted nor found`)
    }
    await db.insert(workspaceMember).values({ workspaceId: ws.id, userId, role: 'owner', access: {} }).onConflictDoNothing()
    return ws
}

function isUniqueViolation(err: unknown): boolean {
    const e = err as { code?: unknown; cause?: { code?: unknown } } | null
    return e?.code === '23505' || e?.cause?.code === '23505'
}

/**
 * A workspace's billing account, created on first use. For a personal workspace whose owner still has a pre-workspace
 * ('user', userId) account, that row is MOVED to the workspace (same id, same balance and ledger) instead.
 */
export async function accountForWorkspace(workspaceId: string): Promise<BillingAccountRow> {
    const find = () => db.select().from(billingAccount)
        .where(and(eq(billingAccount.ownerType, 'workspace'), eq(billingAccount.ownerId, workspaceId))).limit(1)
    const [existing] = await find()
    if (existing) return existing

    const [ws] = await db.select({ personalOwnerId: workspace.personalOwnerId, createdById: workspace.createdById }).from(workspace)
        .where(eq(workspace.id, workspaceId)).limit(1)
    if (!ws) throw new Error(`No workspace ${workspaceId}`)

    if (ws.personalOwnerId) {
        try {
            const [moved] = await db.update(billingAccount)
                .set({ ownerType: 'workspace', ownerId: workspaceId, updatedAt: new Date() })
                .where(and(eq(billingAccount.ownerType, 'user'), eq(billingAccount.ownerId, ws.personalOwnerId)))
                .returning()
            if (moved) return moved
        } catch (err) {
            // A racing request created the workspace account first: use it.
            if (!isUniqueViolation(err)) throw err
            const [raced] = await find()
            if (raced) return raced
            throw err
        }
    }
    return getOrCreateAccount({ type: 'workspace', id: workspaceId, contactUserId: ws.personalOwnerId ?? ws.createdById })
}

/**
 * The account a balance read should use, never creating anything: the workspace's own account, or (personal workspace,
 * backfill not run yet) the owner's pre-workspace user account. Null = no account yet (a zero balance).
 */
export async function findWorkspaceAccount(workspaceId: string): Promise<BillingAccountRow | null> {
    const [own] = await db.select().from(billingAccount)
        .where(and(eq(billingAccount.ownerType, 'workspace'), eq(billingAccount.ownerId, workspaceId))).limit(1)
    if (own) return own
    const [ws] = await db.select({ personalOwnerId: workspace.personalOwnerId }).from(workspace).where(eq(workspace.id, workspaceId)).limit(1)
    if (!ws?.personalOwnerId) return null
    const [legacy] = await db.select().from(billingAccount)
        .where(and(eq(billingAccount.ownerType, 'user'), eq(billingAccount.ownerId, ws.personalOwnerId))).limit(1)
    return legacy ?? null
}

/** A person's own account for reads (their personal workspace's, or the pre-workspace one). Never creates. */
export async function findAccountForUser(userId: string): Promise<BillingAccountRow | null> {
    const ws = await findPersonalWorkspace(userId)
    if (ws) return findWorkspaceAccount(ws.id)
    const [legacy] = await db.select().from(billingAccount)
        .where(and(eq(billingAccount.ownerType, 'user'), eq(billingAccount.ownerId, userId))).limit(1)
    return legacy ?? null
}

/** A workspace's balance in micro-credits; no account yet = 0 (a read never creates one). */
export async function balanceMicroForWorkspace(workspaceId: string): Promise<number> {
    return (await findWorkspaceAccount(workspaceId))?.balanceMicro ?? 0
}
