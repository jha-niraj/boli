"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { authClient, signIn } from "@repo/auth/client"
import { clientErrorMessage } from "@repo/auth/errors"
import {
    AuthTitle, CodeInput, Divider, Field, Footnote, GoogleButton, MethodTabs, Notice, PasswordInput, PrimaryButton,
    TextLink, authInputCls,
} from "@repo/auth/ui"
import type { GoogleMode } from "@repo/auth/google"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { SigningInScreen } from "@repo/ui/components/ui/signing-in-screen"
import { AUTH_ROUTES } from "@/lib/auth-routes"
import { BRAND } from "@/lib/boli"

export interface SignInNotice {
    tone: "neutral" | "error"
    text: string
}

type Method = "password" | "code"

const RESEND_SECONDS = 30

/**
 * Sign in by password or by a one-time email code (a method tab), plus Google first when configured. On success the
 * page hard-navigates straight to `returnTo` (or Kura) with the signing-in screen up - no intermediate page.
 */
export function SignInForm({ google, returnTo, initialMethod, initialEmail, notice }: {
    google: GoogleMode
    returnTo: string
    initialMethod: Method
    initialEmail: string
    notice: SignInNotice | null
}) {
    const router = useRouter()
    const [method, setMethod] = React.useState<Method>(initialMethod)
    const [email, setEmail] = React.useState(initialEmail)
    const [password, setPassword] = React.useState("")
    const [code, setCode] = React.useState("")
    const [codeSentTo, setCodeSentTo] = React.useState<string | null>(null)
    const [cooldown, setCooldown] = React.useState(0)
    const [busy, setBusy] = React.useState<null | "password" | "send" | "verify" | "google">(null)
    const [error, setError] = React.useState<string | null>(null)
    const [arriving, setArriving] = React.useState(false)

    React.useEffect(() => {
        if (cooldown <= 0) return
        const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
        return () => window.clearTimeout(t)
    }, [cooldown])

    function arrive() {
        setArriving(true)
        // A hard navigation: the next page renders on the server with the new cookie, nothing cached from before.
        window.location.assign(returnTo)
    }

    function switchMethod(next: Method) {
        setMethod(next)
        setError(null)
    }

    async function onPassword(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setBusy("password")
        const { error: err } = await signIn.email({ email: email.trim(), password })
        if (err) {
            setBusy(null)
            if (err.code === "EMAIL_NOT_VERIFIED") {
                router.push(`${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(email.trim())}&resent=1`)
                return
            }
            setError(clientErrorMessage(err))
            return
        }
        arrive()
    }

    async function sendCode(e?: React.FormEvent) {
        e?.preventDefault()
        setError(null)
        const to = email.trim()
        if (!to) {
            setError("Enter your email address first.")
            return
        }
        setBusy("send")
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: to, type: "sign-in" })
        setBusy(null)
        if (err) {
            setError(clientErrorMessage(err))
            return
        }
        setCodeSentTo(to)
        setCode("")
        setCooldown(RESEND_SECONDS)
    }

    async function verifyCode(value: string) {
        if (!codeSentTo || value.length !== 6) return
        setError(null)
        setBusy("verify")
        const { error: err } = await signIn.emailOtp({ email: codeSentTo, otp: value })
        if (err) {
            setBusy(null)
            setCode("")
            setError(clientErrorMessage(err))
            return
        }
        arrive()
    }

    async function onGoogle() {
        setError(null)
        setBusy("google")
        const { error: err } = await signIn.social({
            provider: "google",
            callbackURL: returnTo,
            errorCallbackURL: `${AUTH_ROUTES.signIn}?returnTo=${encodeURIComponent(returnTo)}`,
        })
        // On success the browser is already leaving for Google.
        if (err) {
            setBusy(null)
            setError(clientErrorMessage(err))
        }
    }

    if (arriving) return <SigningInScreen />

    return (
        <div>
            <AuthTitle title={`Log in to ${BRAND.name}`} sub="Welcome back. Pick how you want to sign in." />

            {notice && !error && <Notice tone={notice.tone}>{notice.text}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {google !== "off" && (
                <>
                    <GoogleButton onClick={onGoogle} loading={busy === "google"} disabled={busy !== null && busy !== "google"} setup={google === "setup"} />
                    <Divider>OR</Divider>
                </>
            )}

            <MethodTabs<Method>
                className="rounded-full border border-neutral-200 bg-neutral-950/[0.03] dark:border-neutral-800"
                value={method}
                onChange={switchMethod}
                options={[{ value: "password", label: "Password" }, { value: "code", label: "Email code" }]}
            />

            {method === "password" && (
                <form onSubmit={onPassword} className="space-y-4">
                    <Field label="Email" htmlFor="email">
                        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                    </Field>
                    <Field
                        label="Password"
                        htmlFor="password"
                        action={<TextLink href={`${AUTH_ROUTES.forgotPassword}${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}>Forgot password?</TextLink>}
                    >
                        <PasswordInput id="password" value={password} onChange={setPassword} />
                    </Field>
                    <PrimaryButton loading={busy === "password"} disabled={busy !== null}>Log in</PrimaryButton>
                </form>
            )}

            {method === "code" && !codeSentTo && (
                <form onSubmit={sendCode} className="space-y-4">
                    <Field label="Email" htmlFor="code-email" hint="We email you a 6-digit code. No password needed.">
                        <Input id="code-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                    </Field>
                    <PrimaryButton loading={busy === "send"} disabled={busy !== null}>Email me a code</PrimaryButton>
                </form>
            )}

            {method === "code" && codeSentTo && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        If an account exists for <span className="font-medium text-neutral-900 dark:text-white">{codeSentTo}</span>, a code is on its way. It works for 10 minutes.
                    </p>
                    <CodeInput value={code} onChange={setCode} onComplete={verifyCode} disabled={busy === "verify"} />
                    <PrimaryButton type="button" onClick={() => verifyCode(code)} loading={busy === "verify"} disabled={code.length !== 6 || busy !== null}>
                        Log in
                    </PrimaryButton>
                    <div className="flex items-center justify-between gap-3">
                        <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={() => { setCodeSentTo(null); setError(null) }}>
                            Use another email
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => sendCode()} disabled={cooldown > 0 || busy !== null}>
                            {busy === "send" && <InlineLoader size={12} />}
                            {cooldown > 0 ? `Send again in ${cooldown}s` : "Send a new code"}
                        </Button>
                    </div>
                </div>
            )}

            <Footnote>
                <p className="text-center">
                    Don&apos;t have an account? <TextLink href={AUTH_ROUTES.signUp}>Create one</TextLink>
                </p>
                <p className="mt-3 text-center text-xs leading-relaxed">
                    By continuing you agree to the <TextLink href={AUTH_ROUTES.terms}>Terms of Service</TextLink> and the{" "}
                    <TextLink href={AUTH_ROUTES.privacy}>Privacy Policy</TextLink>.
                </p>
            </Footnote>
        </div>
    )
}
