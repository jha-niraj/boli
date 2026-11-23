"use server"

/** /usage and /home refetches - the same shapes their pages pass as initialData. */
import { requireSession } from "@repo/auth/next"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { getHomeOverview, getUsage } from "@/lib/platform/usage"
import { usageQuerySchema, type UsageQueryInput } from "@/schemas/usage"
import type { HomeData, UsageData } from "@/types/platform"

export async function getUsageData(input: UsageQueryInput): Promise<ActionResult<UsageData>> {
    try {
        const session = await requireSession()
        const parsed = usageQuerySchema.safeParse(input)
        if (!parsed.success) return failWith("validation", "Pick a window and a source.")
        const q = parsed.data
        return ok(await getUsage(session.user.id, q.window, q.source, q.page))
    } catch (err) {
        return fail(err, "usage.read")
    }
}

export async function getHomeData(): Promise<ActionResult<HomeData>> {
    try {
        const session = await requireSession()
        return ok(await getHomeOverview(session.user.id))
    } catch (err) {
        return fail(err, "home.read")
    }
}
