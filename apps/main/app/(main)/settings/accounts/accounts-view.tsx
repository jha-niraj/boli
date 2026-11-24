"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Mail } from "lucide-react"
import { authClient } from "@repo/auth/client"
import { authErrorMessage, clientErrorMessage } from "@repo/auth/errors"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { Page } from "@repo/ui/components/ui/page"
import { toast } from "@repo/ui/components/ui/toast"
import { unlinkGoogle } from "@/actions/settings.action"
import { ROUTES } from "@/lib/navigation"
import { Section } from "../../profile/_components/section"

export interface AccountsData {
    email: string
    emailVerified: boolean
    hasPassword: boolean
    google: { linkedAt: string } | null
    /** GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are both set. */
    googleAvailable: boolean
    /** `?error=` from the Google redirect after a failed link. */
    linkError: string | null
}

const SECURITY_TAB = `${ROUTES.profile}?tab=security`

function GoogleMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden className={className}>
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
        </svg>
    )
}

export function AccountsView({ data }: { data: AccountsData }) {
    const router = useRouter()
    const [linking, setLinking] = React.useState(false)
    const lastMethod = !data.hasPassword

    React.useEffect(() => {
        if (!data.linkError) return
        toast.error(authErrorMessage(data.linkError))
        const url = new URL(window.location.href)
        url.searchParams.delete("error")
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`)
    }, [data.linkError])

    async function link() {
        setLinking(true)
        const res = await authClient.linkSocial({ provider: "google", callbackURL: ROUTES.settingsAccounts, errorCallbackURL: ROUTES.settingsAccounts })
        // On success the browser is on its way to Google; only a failure comes back here.
        if (res.error) {
            setLinking(false)
            toast.error(clientErrorMessage(res.error))
        }
    }

    async function unlink() {
        const res = await unlinkGoogle()
        if (!res.success) {
            toast.error(res.error ?? "Could not unlink Google.")
            throw new Error("unlink failed")
        }
        toast.success("Google unlinked")
        router.refresh()
    }

    return (
        <Page width="reading" title="Connected accounts" description="The ways you can sign in to this account.">
            <div className="flex w-full flex-col gap-3">
                <Section title="Sign-in methods" description={`All of them open the same account: ${data.email}.`}>
                    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        <li className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                    <GoogleMark className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Google</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                        {data.google
                                            ? `Linked ${new Date(data.google.linkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                            : data.googleAvailable ? "Not linked" : "Google sign-in is not set up for this app."}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                {data.google ? (
                                    lastMethod ? (
                                        <div className="flex flex-col items-start gap-1 sm:items-end">
                                            <Button type="button" size="sm" variant="outline" disabled>Unlink</Button>
                                            <p className="max-w-xs text-xs text-neutral-600 sm:text-right dark:text-neutral-400">
                                                Google is your only saved way in. <AppLink href={SECURITY_TAB} className="font-medium text-neutral-900 underline underline-offset-2 dark:text-white">Set a password</AppLink> first, then you can unlink it.
                                            </p>
                                        </div>
                                    ) : (
                                        <ConfirmPopover
                                            title="Unlink Google?"
                                            description="You will sign in with your password or an email code instead."
                                            confirmLabel="Unlink"
                                            onConfirm={unlink}
                                            align="end"
                                        >
                                            <Button type="button" size="sm" variant="outline">Unlink</Button>
                                        </ConfirmPopover>
                                    )
                                ) : data.googleAvailable ? (
                                    <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={linking} onClick={() => void link()}>
                                        {linking && <InlineLoader size={14} />}
                                        Link Google
                                    </Button>
                                ) : null}
                            </div>
                        </li>

                        <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                    <KeyRound className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Email and password</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{data.hasPassword ? "Set" : "No password yet"}</p>
                                </div>
                            </div>
                            <Button asChild size="sm" variant="outline" className="shrink-0 self-start sm:self-auto">
                                <AppLink href={SECURITY_TAB}>{data.hasPassword ? "Change password" : "Set a password"}</AppLink>
                            </Button>
                        </li>

                        <li className="flex items-center gap-3 py-3 last:pb-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                <Mail className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">Email code</p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    {data.emailVerified ? "On - a one-time code to your confirmed email always works." : "Confirm your email to sign in with a code."}
                                </p>
                            </div>
                        </li>
                    </ul>
                </Section>
            </div>
        </Page>
    )
}
