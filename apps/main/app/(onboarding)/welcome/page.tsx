import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { and, db, eq, inArray } from "@repo/db"
import { user, userSetting } from "@repo/db/schema"
import { getSession } from "@/lib/session"
import { ROUTES } from "@/lib/navigation"
import { ONBOARDING } from "@/lib/boli"
import { SETTING_KEYS, readOnboardingPicks } from "@/lib/settings-values"
import { WelcomeFlow, type WelcomeData } from "./welcome-flow"

export const metadata: Metadata = { title: "Welcome" }

const KEYS = [
    SETTING_KEYS.preferredName,
    SETTING_KEYS.onboardingBuild,
    SETTING_KEYS.onboardingLanguages,
    SETTING_KEYS.onboardingRole,
    SETTING_KEYS.onboardingTeamSize,
]

/**
 * Read fresh (the cookie session can be minutes behind). Already onboarded -> Kura. Answers saved on an earlier visit
 * come back, so leaving half way keeps what was done.
 */
export default async function WelcomePage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1`)
    const [rows, settings] = await Promise.all([
        db.select({ name: user.name, email: user.email, onboardedAt: user.onboardedAt })
            .from(user).where(eq(user.id, session.user.id)).limit(1),
        db.select({ key: userSetting.key, value: userSetting.value }).from(userSetting)
            .where(and(eq(userSetting.userId, session.user.id), inArray(userSetting.key, KEYS))),
    ])
    const me = rows[0]
    if (!me) redirect(`${ROUTES.signIn}?stale=1`)
    if (me.onboardedAt) redirect(ROUTES.kura)

    const get = (key: string) => settings.find((s) => s.key === key)?.value
    const preferred = get(SETTING_KEYS.preferredName)

    const data: WelcomeData = {
        name: me.name,
        email: me.email,
        preferredName: typeof preferred === "string" ? preferred : null,
        build: readOnboardingPicks(get(SETTING_KEYS.onboardingBuild), ONBOARDING.build),
        languages: readOnboardingPicks(get(SETTING_KEYS.onboardingLanguages), ONBOARDING.languages),
        role: readOnboardingPicks(get(SETTING_KEYS.onboardingRole), ONBOARDING.roles),
        teamSize: readOnboardingPicks(get(SETTING_KEYS.onboardingTeamSize), ONBOARDING.teamSizes),
    }
    return <WelcomeFlow data={data} />
}
