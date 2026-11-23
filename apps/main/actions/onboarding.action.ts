"use server"

/**
 * /welcome's writes (four steps, plan Q14). Every export checks the session itself and returns ActionResult. Answers
 * go to `user_setting` under the `onboarding.*` keys in lib/settings-values.ts; the name goes to `user.name`.
 */
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireSession } from "@repo/auth/next"
import { db, eq } from "@repo/db"
import { user, userSetting } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { needsAcceptance, recordCurrentAcceptances } from "@repo/legal"
import { ONBOARDING } from "@/lib/boli"
import { ONBOARDING_OTHER_MAX, SETTING_KEYS, type OnboardingPicks } from "@/lib/settings-values"

type AnswerKind = "build" | "languages" | "role" | "teamSize"

const ANSWERS: Record<AnswerKind, { key: string; allowed: readonly string[]; single: boolean; other: boolean }> = {
    build: { key: SETTING_KEYS.onboardingBuild, allowed: ONBOARDING.build, single: false, other: true },
    languages: { key: SETTING_KEYS.onboardingLanguages, allowed: ONBOARDING.languages, single: false, other: true },
    role: { key: SETTING_KEYS.onboardingRole, allowed: ONBOARDING.roles, single: true, other: true },
    teamSize: { key: SETTING_KEYS.onboardingTeamSize, allowed: ONBOARDING.teamSizes, single: true, other: false },
}

async function putSetting(userId: string, key: string, value: unknown): Promise<void> {
    await db.insert(userSetting)
        .values({ userId, key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: [userSetting.userId, userSetting.key], set: { value, updatedAt: new Date() } })
}

function cleanText(v: unknown, max: number): string {
    return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

/**
 * Step 1: the account name and what Boli should call the person. It also records the terms and privacy acceptance
 * the person gave on the sign-up form (or by continuing with Google) - this is the first signed-in moment to do it.
 */
export async function saveWelcomeName(input: { name: string; preferredName: string }): Promise<ActionResult<{ name: string; preferredName: string }>> {
    try {
        const session = await requireSession()
        const name = typeof input.name === "string" ? input.name.replace(/\s+/g, " ").trim() : ""
        if (!name) return failWith("validation", "Enter your name.")
        if (name.length > 80) return failWith("validation", "Keep the name under 80 characters.")
        const preferredName = cleanText(input.preferredName, 40) || (name.split(" ")[0] ?? name)

        const h = await headers()
        const missing = await needsAcceptance(session.user.id)
        await Promise.all([
            db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, session.user.id)),
            putSetting(session.user.id, SETTING_KEYS.preferredName, preferredName),
            missing.length > 0
                ? recordCurrentAcceptances(session.user.id, missing, {
                    ipAddress: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
                    userAgent: h.get("user-agent"),
                })
                : Promise.resolve(),
        ])
        return ok({ name, preferredName })
    } catch (err) {
        return fail(err, "welcome.name")
    }
}

/** Steps 2-4: one or more answers. Options outside the lists in lib/boli.ts are dropped; "Other" is free text. */
export async function saveOnboardingAnswers(input: { answers: Partial<Record<AnswerKind, OnboardingPicks>> }): Promise<ActionResult<null>> {
    try {
        const session = await requireSession()
        const answers = input && typeof input.answers === "object" && input.answers ? input.answers : {}
        const writes: Promise<void>[] = []
        for (const kind of Object.keys(ANSWERS) as AnswerKind[]) {
            const raw = answers[kind]
            if (!raw) continue
            const spec = ANSWERS[kind]
            const picks = Array.isArray(raw.picks)
                ? [...new Set(raw.picks.filter((p): p is string => typeof p === "string" && spec.allowed.includes(p)))]
                : []
            const other = spec.other ? cleanText(raw.other, ONBOARDING_OTHER_MAX) || null : null
            if (spec.single && picks.length + (other ? 1 : 0) > 1) return failWith("validation", "Pick one answer.")
            writes.push(putSetting(session.user.id, spec.key, { picks, other } satisfies OnboardingPicks))
        }
        await Promise.all(writes)
        return ok(null)
    } catch (err) {
        return fail(err, "welcome.answers")
    }
}

/** The last step. Refused until the current terms and privacy are accepted (step 1 records them). */
export async function finishOnboarding(): Promise<ActionResult<null>> {
    try {
        const session = await requireSession()
        const missing = await needsAcceptance(session.user.id)
        if (missing.length > 0) return failWith("validation", "Go back to the first step and save your name to accept the terms.")
        await db.update(user).set({ onboardedAt: new Date(), updatedAt: new Date() }).where(eq(user.id, session.user.id))
        revalidatePath("/", "layout")
        return ok(null)
    } catch (err) {
        return fail(err, "welcome.finish")
    }
}
