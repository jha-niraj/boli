import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { railPinnedFromCookie, railWidthCookie, railWidthFromCookie } from "@repo/ui/lib/shell"
import { getSession } from "@/lib/session"
import { getShellPrefs } from "@/lib/settings"
import { MAIN_RAIL_COOKIE, ROUTES } from "@/lib/navigation"
import { listConversationsFor } from "@/lib/ai/conversations"
import { getCurrentWorkspaceFor, listMyWorkspacesFor } from "@/lib/workspace"
import { canUseProduct, formatWorkspaceRole } from "@repo/boli/workspace-access"
import type { KuraHistorySeed } from "@/components/kura/kura-sidebar"
import type { ShellWorkspace } from "@repo/ui/lib/shell"
import { MainShell } from "./_components/main-shell"
import { AppearanceStyle } from "./_components/appearance-style"

/**
 * The signed-in area's SERVER layout. It reads only the session (React-cached, cookie-first), the rail cookie and the
 * shell prefs (onboarding done + appearance: one cached batch, `lib/settings.ts`), so the shell's first frame is right
 * and every page's loading.tsx still paints at once - it never awaits page data.
 *
 * No session here means the cookie the middleware let through is dead (expired, revoked elsewhere): `?stale=1` makes
 * the sign-in page say so in a sentence and clear the cookie. Each page and every server action still checks the
 * session itself - this check is not enough on its own.
 *
 * Kura's chat history lives in the shell's Kura sidebar: its read STARTS here as a promise (never awaited, so the
 * shell and every loading.tsx still paint at once) and streams into the sidebar, which reads it with `use()` and keeps
 * it fresh with the client query (components/kura/kura-sidebar.tsx). A failed read is an empty list there, not an
 * error page.
 *
 * Not onboarded -> /welcome, which lives OUTSIDE this group (`app/(onboarding)`), so the redirect never loops (a
 * layout cannot read the pathname).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const [session, jar] = await Promise.all([getSession(), cookies()])
    if (!session) redirect(`${ROUTES.signIn}?stale=1`)
    // The rail's workspace switcher: the person's workspaces (personal first) with the current one marked. Two small
    // cached membership reads, run beside the prefs read - shell data, not page data.
    const [prefs, workspaces] = await Promise.all([
        getShellPrefs(session.user.id),
        Promise.all([listMyWorkspacesFor(session.user.id), getCurrentWorkspaceFor(session.user.id)])
            .then(([list, current]): ShellWorkspace[] => list.map((w) => ({ id: w.id, name: w.name, current: w.id === current.id, detail: formatWorkspaceRole(w.role) })))
            .catch((): ShellWorkspace[] => []),
    ])
    if (!prefs.onboarded) redirect(ROUTES.onboarding)
    const initialPinned = railPinnedFromCookie(jar.get(MAIN_RAIL_COOKIE)?.value)
    const initialRailWidth = railWidthFromCookie(jar.get(railWidthCookie(MAIN_RAIL_COOKIE))?.value)
    const { user } = session
    // `at`: when it was read, so the client query refetches once it is older than its staleTime (the layout is not
    // re-rendered on client navigation; a seed from an hour ago must not count as fresh). 0 = failed, refetch at once.
    // The current workspace's chats (React-cached membership read, shared with the page); none without Kura access.
    const kuraHistory = getCurrentWorkspaceFor(user.id)
        .then((ws) => (canUseProduct(ws, "kura") ? listConversationsFor(user.id, ws.id) : []))
        .then((rows): KuraHistorySeed => ({ rows, at: Date.now() }))
        .catch((): KuraHistorySeed => ({ rows: [], at: 0 }))

    return (
        <MainShell
            user={{ name: user.name, email: user.email, image: user.image }}
            initialPinned={initialPinned}
            initialRailWidth={initialRailWidth}
            kuraHistory={kuraHistory}
            workspaces={workspaces}
        >
            <AppearanceStyle prefs={prefs.appearance} />
            {children}
        </MainShell>
    )
}
