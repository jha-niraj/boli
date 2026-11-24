/**
 * The app (sign-in, sign-up, Kura, keys, billing, the /v1 API) is apps/main on its OWN origin: app.bolihq.com in
 * production, http://localhost:3100 locally (NEXT_PUBLIC_APP_URL). Its paths do not exist on this site, so NEVER link to
 * them relatively (`/signin`, `/kura`) - build every URL with the helpers below and render it as a plain `<a>` in the
 * same tab (owner, 2026-11-24). `next/link` cannot navigate across origins anyway.
 *
 * No fallback to the live domain (AGENTS.md section 4): a missing URL on staging must not send people to production.
 * Local dev only: localhost:3100.
 */
function appOrigin(): string {
    const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim()
    return (raw || "http://localhost:3100").replace(/\/+$/, "")
}

export const APP_URL = appOrigin()

/** Absolute URL to a path on the app: `appUrl("/signin")` -> `https://app.bolihq.com/signin`. */
export const appUrl = (path = "/") => `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`

export const SIGNIN_URL = appUrl("/signin")
export const SIGNUP_URL = appUrl("/signup")
export const KURA_URL = appUrl("/kura")
export const KEYS_URL = appUrl("/keys")

/** Billing, optionally with a pack or a custom amount picked: `BILLING_URL({ pack: "pack-500" })`. */
export function BILLING_URL(params?: { pack?: string; amount?: number }): string {
    const q = new URLSearchParams()
    if (params?.pack) q.set("pack", params.pack)
    if (params?.amount !== undefined) q.set("amount", String(params.amount))
    const s = q.toString()
    return appUrl(s ? `/billing?${s}` : "/billing")
}

/** The API's origin for code samples (`${API_ORIGIN}/v1`): the API is served by the app. */
export const API_ORIGIN = APP_URL
