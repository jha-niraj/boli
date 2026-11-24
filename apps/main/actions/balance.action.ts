"use server"

/** The rail's credits chip. Imported by the shared (main) layout's shell, so this file holds only this one read. */
import { requireSession } from "@repo/auth/next"
import { fail, ok, type ActionResult } from "@repo/errors"
import { getBalanceMicro } from "@/lib/platform/credits"
import { getCurrentWorkspaceFor } from "@/lib/workspace"

export async function getMyBalance(): Promise<ActionResult<{ balanceMicro: number }>> {
    try {
        const session = await requireSession()
        // The CURRENT workspace's credits (every member sees the pool they spend from).
        const ws = await getCurrentWorkspaceFor(session.user.id)
        const balanceMicro = await getBalanceMicro(ws.id)
        return ok({ balanceMicro })
    } catch (err) {
        return fail(err, "balance.read")
    }
}
