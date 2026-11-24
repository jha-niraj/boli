import "server-only"
// Server only: reads next/headers (the workspace cookie) and the session.
import { cache } from "react"
import { cookies } from "next/headers"
import { and, asc, count, db, eq } from "@repo/db"
import { workspace, workspaceMember } from "@repo/db/schema"
import { accountForWorkspace, ensurePersonalWorkspace } from "@repo/billing"
import { AppError } from "@repo/errors"
import {
    canUseProduct, effectiveAccess, FULL_ACCESS, MAX_OWNED_WORKSPACES, WORKSPACE_COOKIE, type JawafLevel, type WorkspaceAccess, type WorkspaceProduct, type WorkspaceRole,
} from "@repo/boli/workspace-access"
import { getSession } from "@/lib/session"

/**
 * The CURRENT workspace (plan/main/jawaf/jawaf-v1.md, "Accounts and teams"). Credits, API keys, Kura conversations and
 * (later) Jawaf bots belong to a workspace; a person can belong to several. The current one is remembered in a cookie
 * (WORKSPACE_COOKIE) that is only a HINT: every read validates it against the person's memberships and falls back to
 * their personal workspace. React `cache`: one membership read per request, shared by the page, its actions and guards.
 */

export interface MyWorkspace {
    id: string
    name: string
    role: WorkspaceRole
    isPersonal: boolean
}

export interface CurrentWorkspace extends MyWorkspace {
    /** Effective access: an owner has everything. */
    access: WorkspaceAccess
}

type Membership = MyWorkspace & { storedAccess: unknown }

async function membershipsOf(userId: string): Promise<Membership[]> {
    const rows = await db
        .select({ id: workspace.id, name: workspace.name, role: workspaceMember.role, personalOwnerId: workspace.personalOwnerId, access: workspaceMember.access })
        .from(workspaceMember)
        .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
        .where(eq(workspaceMember.userId, userId))
        .orderBy(asc(workspace.createdAt))
    return rows.map((r) => ({ id: r.id, name: r.name, role: r.role, isPersonal: r.personalOwnerId === userId, storedAccess: r.access }))
}

const membershipsFor = cache(async (userId: string): Promise<Membership[]> => {
    let list = await membershipsOf(userId)
    if (!list.some((w) => w.isPersonal)) {
        // Someone created before workspaces whose backfill has not run yet: their personal workspace is made once here
        // (idempotent; the only write a read in this module ever does, and it happens once per person).
        await ensurePersonalWorkspace(userId)
        list = await membershipsOf(userId)
    }
    return [...list].sort((a, b) => Number(b.isPersonal) - Number(a.isPersonal))
})

/** Every workspace the person belongs to, personal first. */
export async function listMyWorkspacesFor(userId: string): Promise<MyWorkspace[]> {
    return (await membershipsFor(userId)).map(({ id, name, role, isPersonal }) => ({ id, name, role, isPersonal }))
}

/** The signed-in person's workspaces. Throws AppError('auth') without a session. */
export async function listMyWorkspaces(): Promise<MyWorkspace[]> {
    const s = await getSession()
    if (!s) throw new AppError("auth", "Your session ended. Sign in again.")
    return listMyWorkspacesFor(s.user.id)
}

/** The current workspace for a given person (the cookie's, when they are a member; else their personal one). */
export const getCurrentWorkspaceFor = cache(async (userId: string): Promise<CurrentWorkspace> => {
    const [list, jar] = await Promise.all([membershipsFor(userId), cookies()])
    const wanted = jar.get(WORKSPACE_COOKIE)?.value
    const pick = list.find((w) => w.id === wanted) ?? list.find((w) => w.isPersonal) ?? list[0]
    if (!pick) throw new AppError("unknown", "Your workspace could not be found. Refresh the page.")
    const { storedAccess, ...rest } = pick
    return { ...rest, access: effectiveAccess({ role: pick.role, access: storedAccess }) }
})

/** The signed-in person's current workspace: { id, name, role, access, isPersonal }. Throws AppError('auth'). */
export async function getCurrentWorkspace(): Promise<CurrentWorkspace> {
    const s = await getSession()
    if (!s) throw new AppError("auth", "Your session ended. Sign in again.")
    return getCurrentWorkspaceFor(s.user.id)
}

const PRODUCT_NAME: Record<WorkspaceProduct, string> = { kura: "Kura", api: "the API", jawaf: "Jawaf" }

/**
 * The guard for product pages and actions: the current workspace when the person may use `product` (at `level`, for
 * products with levels), else a THROWN AppError('forbidden') naming who can change it.
 */
export async function requireWorkspaceAccess(product: WorkspaceProduct, level?: JawafLevel): Promise<CurrentWorkspace> {
    const ws = await getCurrentWorkspace()
    if (!canUseProduct({ role: ws.role, access: ws.access }, product, level)) {
        throw new AppError("forbidden", `You do not have access to ${PRODUCT_NAME[product]} in ${ws.name}. Ask its owner, or switch workspace.`)
    }
    return ws
}

/** The guard for billing, members and deleting: the current workspace when the person is its owner. */
export async function requireWorkspaceOwner(): Promise<CurrentWorkspace> {
    const ws = await getCurrentWorkspace()
    if (ws.role !== "owner") throw new AppError("forbidden", `Only the owner of ${ws.name} can do that.`)
    return ws
}

/**
 * A new SHARED workspace owned by `userId` (the rail's "Create workspace"): the workspace and the owner membership in
 * one batch (one round trip, all or nothing), then its own billing account ('workspace', id) - created empty: extra
 * workspaces get NO welcome credits. At most MAX_OWNED_WORKSPACES owned per person, the personal one included.
 */
export async function createOwnedWorkspace(userId: string, name: string): Promise<{ id: string; name: string }> {
    const [owned] = await db.select({ n: count() }).from(workspaceMember)
        .where(and(eq(workspaceMember.userId, userId), eq(workspaceMember.role, "owner")))
    if ((owned?.n ?? 0) >= MAX_OWNED_WORKSPACES) {
        throw new AppError("forbidden", `You already own ${MAX_OWNED_WORKSPACES} workspaces, the most one person can. Rename or reuse one of them.`)
    }
    const id = crypto.randomUUID()
    await db.batch([
        db.insert(workspace).values({ id, name, createdById: userId }),
        db.insert(workspaceMember).values({ workspaceId: id, userId, role: "owner", access: FULL_ACCESS }),
    ])
    // Idempotent; were it to fail here, the first credit read or purchase creates it the same way.
    await accountForWorkspace(id)
    return { id, name }
}

/** The cookie options for the current-workspace hint (set by switchWorkspace and acceptInvitation). */
export const WORKSPACE_COOKIE_OPTIONS = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
}
