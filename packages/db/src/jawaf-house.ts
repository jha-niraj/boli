// The "Boli Demos" house workspace (plan/admin/jawaf/admin-v1.md): where the Boli team builds demo bots for prospects.
// Its id lives in ONE admin_system_settings row (key below), written by scripts/jawaf-house.mjs, so apps/admin and
// apps/main read the same value. A missing row = the house is not set up yet (null, never a guess).
import { eq } from 'drizzle-orm'
import { db } from './client'
import { adminSystemSettings } from './schema'

export const JAWAF_HOUSE_SETTING_KEY = 'jawaf.house_workspace_id'

/** The house workspace's id, or null when scripts/jawaf-house.mjs has not run on this database. */
export async function getJawafHouseWorkspaceId(): Promise<string | null> {
    const [row] = await db.select({ value: adminSystemSettings.value }).from(adminSystemSettings)
        .where(eq(adminSystemSettings.key, JAWAF_HOUSE_SETTING_KEY)).limit(1)
    const v = row?.value
    return typeof v === 'string' && v.trim() ? v.trim() : null
}
