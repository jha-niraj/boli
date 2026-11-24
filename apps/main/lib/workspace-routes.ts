/**
 * Account-level workspace routes (plan/main/jawaf/jawaf-v1.md, Wave 1 task 1). Kept out of lib/navigation.ts while the
 * shell is rebuilt; the lead wires `members` into the rail (account items at the rail bottom). Page URLs have no
 * hyphens. `/join` lives outside (main) (app/(join)) and is public in middleware.ts: it shows the invitation first, then
 * asks to sign in or sign up with returnTo back to itself.
 */
export const WORKSPACE_ROUTES = {
    members: "/members",
    join: "/join",
} as const
