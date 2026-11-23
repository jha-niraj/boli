/**
 * Plain value lists for the Settings hub, safe in the browser (no schema import). The server reads and writes them in
 * `lib/settings.ts` and `actions/settings.action.ts`.
 */

/** What a notification is about. A topic with `emailLocked` always emails (a security notice you cannot turn off). */
export const NOTIFICATION_TOPICS = [
    { key: "account", label: "Account and security", description: "Sign-ins from a new device, password and email changes.", emailLocked: true },
    { key: "ai", label: "AI", description: "Long AI jobs finishing, and anything the AI needs you to look at." },
    { key: "billing", label: "Billing and credits", description: "Receipts, low credits, a payment that did not go through." },
    { key: "product", label: "Product updates", description: "New features and changes worth knowing about." },
] as const

export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number]["key"]

export interface NotificationPreferenceView {
    topic: NotificationTopic
    email: boolean
    inApp: boolean
}

export function isNotificationTopic(value: string): value is NotificationTopic {
    return NOTIFICATION_TOPICS.some((t) => t.key === value)
}

/** user_setting keys. One place, so a typo is a type error. */
export const SETTING_KEYS = {
    density: "appearance.density",
    reducedMotion: "appearance.reducedMotion",
    /** What Boli calls the person (a string). Set on /welcome step 1. */
    preferredName: "onboarding.preferredName",
    /** /welcome answers, each an `OnboardingPicks` value ({ picks, other }). */
    onboardingBuild: "onboarding.build",
    onboardingLanguages: "onboarding.languages",
    onboardingRole: "onboarding.role",
    onboardingTeamSize: "onboarding.teamSize",
} as const

/** One /welcome answer as stored: the chosen options (from ONBOARDING in lib/boli.ts) plus the free "Other" text. */
export interface OnboardingPicks {
    picks: string[]
    other: string | null
}

export const ONBOARDING_OTHER_MAX = 80

/** Read a stored answer back, dropping anything that is not one of `allowed` (the lists can change). */
export function readOnboardingPicks(value: unknown, allowed: readonly string[]): OnboardingPicks {
    if (!value || typeof value !== "object") return { picks: [], other: null }
    const v = value as { picks?: unknown; other?: unknown }
    const picks = Array.isArray(v.picks) ? v.picks.filter((p): p is string => typeof p === "string" && allowed.includes(p)) : []
    const other = typeof v.other === "string" && v.other.trim() ? v.other.trim().slice(0, ONBOARDING_OTHER_MAX) : null
    return { picks, other }
}

export type Density = "comfortable" | "compact"

export interface AppearancePrefs {
    density: Density
    reducedMotion: boolean
}

export const DEFAULT_APPEARANCE: AppearancePrefs = { density: "comfortable", reducedMotion: false }
