"use server"

/**
 * Home and System > Health reads for the client refetch. The page.tsx files call the lib loaders directly; these exist
 * so a `useQuery` can refresh the same data. Each checks the admin itself and returns ActionResult; the loaders leave
 * out what this admin cannot read.
 */
import { fail, ok, type ActionResult } from "@repo/errors"
import { loadHealthData, type HealthData } from "@/lib/health-data"
import { loadHomeData, type HomeData } from "@/lib/home-data"
import { requireAdminAction } from "./guard"

export async function getHomeData(): Promise<ActionResult<HomeData>> {
    try {
        const admin = await requireAdminAction()
        return ok(await loadHomeData(admin))
    } catch (err) {
        return fail(err)
    }
}

export async function getHealthData(): Promise<ActionResult<HealthData>> {
    try {
        const admin = await requireAdminAction("system", "read")
        return ok(await loadHealthData(admin))
    } catch (err) {
        return fail(err)
    }
}
