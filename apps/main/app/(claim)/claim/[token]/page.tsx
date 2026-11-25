import type { Metadata } from "next"
import { ArrowLeft, Mail } from "lucide-react"
import { AuthFrame } from "@repo/auth/ui"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { AUTH_PANEL_CLASS, AuthArtBand, AuthArtPanel, AuthDhaka, AuthLogo } from "@repo/brand/auth-art"
import { BoliStatus } from "@repo/brand/status/status-screen"
import { DISPLAY } from "@repo/brand/type"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { listMyWorkspacesFor } from "@/lib/workspace"
import { previewClaim } from "@/lib/jawaf/claim"
import { formatDay } from "@/lib/platform-display"
import { WEB } from "@/lib/web-links"
import { jawafClaimTokenSchema } from "@/schemas/jawaf-claim"
import type { JawafClaimState } from "@/types/jawaf"
import { ClaimForm, MarkOpened } from "./_components/claim-actions"

export const metadata: Metadata = {
    title: "Claim your Jawaf",
    robots: { index: false, follow: false },
}

type Params = Promise<{ token: string }>

const DEAD: Record<Exclude<JawafClaimState, "valid">, { kind: "not-found" | "forbidden"; eyebrow: string; title: string; line: string }> = {
    notfound: { kind: "not-found", eyebrow: "Claim link - not valid", title: "This claim link does not work", line: "The link is not valid, or it was copied only in part. Ask the Boli team to send it again." },
    expired: { kind: "not-found", eyebrow: "Claim link - expired", title: "This claim link expired", line: "Claim links work for 30 days. Reply to the email it came in, or write to us, and we will send a new one." },
    revoked: { kind: "not-found", eyebrow: "Claim link - replaced", title: "A newer link replaced this one", line: "Use the latest claim link the Boli team sent you, or ask for a new one." },
    claimed: { kind: "forbidden", eyebrow: "Claim link - used", title: "This bot was already claimed", line: "A claim link works once. Sign in with the account that claimed it to open the bot in Jawaf." },
}

/**
 * /claim/<token> - a demo Jawaf bot's one-time claim link (plan/admin/jawaf/admin-v1.md). PUBLIC (middleware.ts):
 * - dead link (not valid / expired / replaced / used): a Boli status screen;
 * - signed out: the bot and Create an account / Sign in, both with returnTo back here;
 * - signed in: the bot and "Move to my workspace" (a workspace the person OWNS), then /jawaf with that bot current.
 * The render only reads; the page marks the link opened with a POST after it loads (MarkOpened).
 */
export default async function ClaimPage({ params }: { params: Params }) {
    const { token: raw } = await params
    const token = jawafClaimTokenSchema.safeParse(raw)
    const [preview, session] = await Promise.all([token.success ? previewClaim(token.data) : null, getSession()])

    if (!preview || preview.state !== "valid" || !token.success) {
        const d = DEAD[preview && preview.state !== "valid" ? preview.state : "notfound"]
        return (
            <BoliStatus
                kind={d.kind}
                fullScreen
                eyebrow={d.eyebrow}
                title={d.title}
                description={preview?.botName && preview.state === "claimed" ? `${preview.botName}: ${d.line}` : d.line}
                actions={(
                    <>
                        <Button asChild className="h-10 cursor-pointer gap-2 px-5">
                            <AppLink href={session ? ROUTES.jawaf : ROUTES.signIn}><ArrowLeft className="h-4 w-4" /> {session ? "Open Jawaf" : "Sign in"}</AppLink>
                        </Button>
                        <Button asChild variant="outline" className="h-10 cursor-pointer gap-2 px-5">
                            <AppLink href={WEB.contactAbout("Jawaf")}><Mail className="h-4 w-4" /> Write to us</AppLink>
                        </Button>
                    </>
                )}
            />
        )
    }

    const here = encodeURIComponent(`/claim/${token.data}`)
    const owned = session ? (await listMyWorkspacesFor(session.user.id)).filter((w) => w.role === "owner") : []

    return (
        <AuthFrame
            panel={<AuthArtPanel />}
            panelClassName={AUTH_PANEL_CLASS}
            mobilePanel={<AuthArtBand />}
            formTop={<AuthLogo />}
            formFooter={<AuthDhaka />}
            formClassName="max-w-md"
            display="serif"
            align="start"
            className="bg-background"
            legal={null}
        >
            <MarkOpened token={token.data} />
            <section className="space-y-6 py-2">
                <div>
                    <h1 className="text-4xl leading-[1.04] text-foreground sm:text-[2.5rem]" style={DISPLAY.display}>Claim {preview.botName}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">The Boli team built this answer assistant for you. Claim it and it moves into your own account with everything it knows.</p>
                </div>

                <dl className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white text-sm">
                    <Row label="Assistant" value={preview.botName ?? "-"} />
                    <Row label="Pages it read" value={preview.pages.toLocaleString("en-US")} />
                    <Row label="Facts and answers" value={(preview.facts + preview.qa).toLocaleString("en-US")} />
                    <Row label="Link works until" value={formatDay(preview.expiresAt)} />
                </dl>

                {!session ? (
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-600">Create an account or sign in to claim it. It is free.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild className="h-10 cursor-pointer px-5">
                                <AppLink href={`${ROUTES.signUp}?returnTo=${here}`}>Create an account</AppLink>
                            </Button>
                            <Button asChild variant="outline" className="h-10 cursor-pointer px-5">
                                <AppLink href={`${ROUTES.signIn}?returnTo=${here}`}>Sign in</AppLink>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <ClaimForm token={token.data} botName={preview.botName ?? "the bot"} workspaces={owned.map((w) => ({ id: w.id, name: w.name, isPersonal: w.isPersonal }))} email={session.user.email} />
                )}
            </section>
        </AuthFrame>
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
