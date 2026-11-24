"use server"

/** /usage and /home refetches - the same shapes their pages pass as initialData. */
import { cookies } from "next/headers"
import { requireSession } from "@repo/auth/next"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { GET_STARTED_COOKIE, GET_STARTED_MAX_AGE } from "@/lib/platform/get-started"
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

/** Home's "Get started" card: hide it for this person (remembered in a cookie keyed by their user id). */
export async function hideGetStarted(): Promise<ActionResult<null>> {
    try {
        const session = await requireSession()
        const jar = await cookies()
        const ids = new Set((jar.get(GET_STARTED_COOKIE)?.value ?? "").split(",").filter(Boolean))
        ids.add(session.user.id)
        jar.set(GET_STARTED_COOKIE, [...ids].slice(-5).join(","), {
            path: "/",
            maxAge: GET_STARTED_MAX_AGE,
            sameSite: "lax",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        })
        return ok(null)
    } catch (err) {
        return fail(err, "home.hide_get_started")
    }
}
