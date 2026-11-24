import type { Metadata } from "next"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { DISPLAY } from "@repo/brand/type"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { previewInvitation } from "@/lib/workspace-members"
import { WORKSPACE_ROUTES } from "@/lib/workspace-routes"
import { formatDay } from "@/lib/platform-display"
import { invitationTokenSchema } from "@/schemas/workspace"
import type { JoinPreview } from "@/types/workspace"
import { AcceptInvitation, SwitchToInvitedAccount } from "./_components/join-actions"

export const metadata: Metadata = {
    title: "Join a workspace",
    robots: { index: false, follow: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const NOT_VALID: JoinPreview = { state: "notfound", workspaceName: null, invitedByName: null, email: null, products: null, expiresAt: null }

const DEAD_COPY: Record<Exclude<JoinPreview["state"], "valid">, { title: string; line: string }> = {
    notfound: { title: "This link does not work", line: "The invitation link is not valid, or a newer one replaced it. Ask the person who invited you to send it again." },
    expired: { title: "This invitation expired", line: "Invitation links work for 7 days. Ask the person who invited you to send it again." },
    revoked: { title: "This invitation was cancelled", line: "The workspace owner cancelled it. Ask them for a new one if you still need access." },
    accepted: { title: "Already accepted", line: "This invitation was used. Sign in to open the workspace - switch to it from the workspace menu." },
}

/**
 * /join?token=... - an emailed workspace invitation. PUBLIC (middleware.ts): it shows who invited whom to what, then
 * - signed out: Create an account / Sign in, both with returnTo back here (safeReturnTo on those pages) and the address;
 * - signed in as the invited address: Accept (actions/workspace.action.ts acceptInvitation), then Home;
 * - signed in as someone else: switch account, back here.
 * The page only reads (the token is hashed and looked up); accepting is the button.
 */
export default async function JoinPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams
    const raw = Array.isArray(sp.token) ? sp.token[0] : sp.token
    const token = invitationTokenSchema.safeParse(raw ?? "")
    const [preview, session] = await Promise.all([
        token.success ? previewInvitation(token.data) : Promise.resolve(NOT_VALID),
        getSession(),
    ])

    if (preview.state !== "valid" || !token.success) {
        const copy = DEAD_COPY[preview.state === "valid" ? "notfound" : preview.state]
        return (
            <section className="space-y-6 py-2">
                <Head title={copy.title} line={copy.line} />
                <Button asChild className="h-10 cursor-pointer px-5">
                    <AppLink href={session ? ROUTES.dashboard : ROUTES.signIn}>{session ? "Go to Boli" : "Sign in"}</AppLink>
                </Button>
            </section>
        )
    }

    const here = `${WORKSPACE_ROUTES.join}?token=${encodeURIComponent(token.data)}`
    const back = encodeURIComponent(here)
    const email = preview.email ?? ""
    const by = preview.invitedByName ? `${preview.invitedByName} invited you` : "You are invited"
    const matches = !!session && session.user.email.trim().toLowerCase() === email.toLowerCase()

    return (
        <section className="space-y-6 py-2">
            <Head title={`Join ${preview.workspaceName ?? "a workspace"}`} line={`${by} to work together in Boli.`} />

            <dl className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white text-sm">
                <Row label="Workspace" value={preview.workspaceName ?? "-"} />
                <Row label="Invited address" value={email} />
                <Row label="You get" value={preview.products ?? "-"} />
                <Row label="Link works until" value={formatDay(preview.expiresAt)} />
            </dl>

            {!session ? (
                <div className="space-y-3">
                    <p className="text-sm text-neutral-600">Create an account or sign in with {email} to accept.</p>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild className="h-10 cursor-pointer px-5">
                            <AppLink href={`${ROUTES.signUp}?returnTo=${back}&email=${encodeURIComponent(email)}`}>Create an account</AppLink>
                        </Button>
                        <Button asChild variant="outline" className="h-10 cursor-pointer px-5">
                            <AppLink href={`${ROUTES.signIn}?returnTo=${back}&email=${encodeURIComponent(email)}`}>Sign in</AppLink>
                        </Button>
                    </div>
                </div>
            ) : matches ? (
                <AcceptInvitation token={token.data} workspaceName={preview.workspaceName ?? "the workspace"} />
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-neutral-600">
                        You are signed in as <span className="font-medium text-neutral-900">{session.user.email}</span>. This invitation is for{" "}
                        <span className="font-medium text-neutral-900">{email}</span> - sign in with that address to accept it.
                    </p>
                    <SwitchToInvitedAccount signInPath={`${ROUTES.signIn}?returnTo=${back}&email=${encodeURIComponent(email)}`} />
                </div>
            )}
        </section>
    )
}

function Head({ title, line }: { title: string; line: string }) {
    return (
        <div>
            <h1 className="text-4xl leading-[1.04] text-foreground sm:text-[2.5rem]" style={DISPLAY.display}>{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{line}</p>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-start justify-between gap-4 px-4 py-3">
            <dt className="shrink-0 text-neutral-600">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-neutral-900">{value}</dd>
        </div>
    )
}
