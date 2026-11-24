"use server"

/**
 * The workspace SWITCHER (the product rail's top): list the person's workspaces, change the current one and create a
 * new one (the switcher's "Create workspace"). Split from ./workspace.action.ts because the shell layout imports it,
 * and a 'use server' file registers EVERY export on every route whose tree imports it - so the layout pulls in only
 * what the rail uses. Each checks the session itself.
 */
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { WORKSPACE_COOKIE } from "@repo/boli/workspace-access"
import { requireSession } from "@/lib/session"
import { createOwnedWorkspace, getCurrentWorkspaceFor, listMyWorkspacesFor, WORKSPACE_COOKIE_OPTIONS } from "@/lib/workspace"
import { createWorkspaceSchema, workspaceIdSchema } from "@/schemas/workspace"
import type { WorkspaceSummary } from "@/types/workspace"

/** The switcher's list: every workspace the person belongs to, personal first, the current one marked. */
export async function listMyWorkspaces(): Promise<ActionResult<WorkspaceSummary[]>> {
    try {
        const s = await requireSession()
        const [list, current] = await Promise.all([listMyWorkspacesFor(s.user.id), getCurrentWorkspaceFor(s.user.id)])
        return ok(list.map((w) => ({ ...w, current: w.id === current.id })))
    } catch (err) {
        return fail(err, "workspace.list")
    }
}

/** Make another of the person's workspaces the current one (remembered in a cookie; checked against membership). */
export async function switchWorkspace(id: string): Promise<ActionResult<{ id: string; name: string }>> {
    try {
        const s = await requireSession()
        const parsed = workspaceIdSchema.safeParse(id)
        if (!parsed.success) return failWith("validation", "That workspace could not be found.")
        const target = (await listMyWorkspacesFor(s.user.id)).find((w) => w.id === parsed.data)
        if (!target) return failWith("notfound", "That workspace could not be found, or you are no longer a member.")
        const jar = await cookies()
        jar.set(WORKSPACE_COOKIE, target.id, WORKSPACE_COOKIE_OPTIONS)
        revalidatePath("/", "layout")
        return ok({ id: target.id, name: target.name })
    } catch (err) {
        return fail(err, "workspace.switch")
    }
}

/**
 * A new workspace owned by the signed-in person: full access, its own (empty) credit balance - no welcome credits for
 * extra workspaces. At most MAX_OWNED_WORKSPACES (@repo/boli/workspace-access). The client then calls switchWorkspace
 * and reloads the product home, like any switch.
 */
export async function createWorkspace(name: string): Promise<ActionResult<{ id: string; name: string }>> {
    try {
        const s = await requireSession({ fresh: true })
        const parsed = createWorkspaceSchema.safeParse({ name })
        if (!parsed.success) return failWith("validation", parsed.error.issues[0]?.message ?? "Give the workspace a name.")
        const created = await createOwnedWorkspace(s.user.id, parsed.data.name)
        return ok(created)
    } catch (err) {
        return fail(err, "workspace.create")
    }
}
