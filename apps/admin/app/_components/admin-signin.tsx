"use client"

import * as React from "react"
import { authClient, signIn } from "@repo/auth/client"
import { clientErrorMessage } from "@repo/auth/errors"
import { AuthTitle, CodeInput, Field, MethodTabs, Notice, PasswordInput, PrimaryButton, authInputCls } from "@repo/auth/ui"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { HomeLoader } from "@repo/brand/loaders/full-page"

export interface AdminNotice {
    tone: "neutral" | "error"
    text: string
}

type Method = "password" | "code"

/**
 * Admin sign-in: password or a one-time email code. No Google and no sign-up - admin accounts come only from an
 * invitation (/join). Admin ACCESS (the adminAccess row) is checked by the (main) layout after this.
 */
export function AdminSignIn({ returnTo, notice }: { returnTo: string; notice: AdminNotice | null }) {
    const [method, setMethod] = React.useState<Method>("password")
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [code, setCode] = React.useState("")
    const [codeSentTo, setCodeSentTo] = React.useState<string | null>(null)
    const [busy, setBusy] = React.useState<null | "password" | "send" | "verify">(null)
    const [error, setError] = React.useState<string | null>(null)
    const [arriving, setArriving] = React.useState(false)

    function arrive() {
        setArriving(true)
        window.location.assign(returnTo)
    }

    async function onPassword(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setBusy("password")
        const { error: err } = await signIn.email({ email: email.trim(), password })
        if (err) {
            setBusy(null)
            setError(clientErrorMessage(err))
            return
        }
        arrive()
    }

    async function sendCode(e?: React.FormEvent) {
        e?.preventDefault()
        setError(null)
        const to = email.trim()
        if (!to) return setError("Enter your email address first.")
        setBusy("send")
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: to, type: "sign-in" })
        setBusy(null)
        if (err) return setError(clientErrorMessage(err))
        setCodeSentTo(to)
        setCode("")
    }

    async function verifyCode(value: string) {
        if (!codeSentTo || value.length !== 6) return
        setError(null)
        setBusy("verify")
        const { error: err } = await signIn.emailOtp({ email: codeSentTo, otp: value })
        if (err) {
            setBusy(null)
            setCode("")
            return setError(clientErrorMessage(err))
        }
        arrive()
    }

    // The same Boli arrival loader as apps/main after sign-in, in the console's words.
    if (arriving) return <HomeLoader lines={["Welcome back...", "Opening the console...", "Gathering the numbers...", "Almost there..."]} />

    return (
        <div>
            <AuthTitle title="Boli Admin" sub="For the Boli team. Sign in with the account you were invited with." />
            {notice && !error && <Notice tone={notice.tone}>{notice.text}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <MethodTabs<Method>
                value={method}
                onChange={(m) => { setMethod(m); setError(null) }}
                options={[{ value: "password", label: "Password" }, { value: "code", label: "Email code" }]}
            />

            {method === "password" && (
                <form onSubmit={onPassword} className="space-y-4">
                    <Field label="Email" htmlFor="email">
                        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                    </Field>
                    <Field label="Password" htmlFor="password" hint="Forgot it? Sign in with an email code instead.">
                        <PasswordInput id="password" value={password} onChange={setPassword} />
                    </Field>
                    <PrimaryButton loading={busy === "password"} disabled={busy !== null}>Sign in</PrimaryButton>
                </form>
            )}

            {method === "code" && !codeSentTo && (
                <form onSubmit={sendCode} className="space-y-4">
                    <Field label="Email" htmlFor="code-email" hint="We email you a 6-digit code.">
                        <Input id="code-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                    </Field>
                    <PrimaryButton loading={busy === "send"} disabled={busy !== null}>Email me a code</PrimaryButton>
                </form>
            )}

            {method === "code" && codeSentTo && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        If an account exists for <span className="font-medium text-neutral-900 dark:text-white">{codeSentTo}</span>, a code is on its way.
                    </p>
                    <CodeInput value={code} onChange={setCode} onComplete={verifyCode} disabled={busy === "verify"} />
                    <PrimaryButton type="button" onClick={() => verifyCode(code)} loading={busy === "verify"} disabled={code.length !== 6 || busy !== null}>
                        Sign in
                    </PrimaryButton>
                    <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={() => { setCodeSentTo(null); setError(null) }}>
                        Use another email
                    </Button>
                </div>
            )}
        </div>
    )
}
