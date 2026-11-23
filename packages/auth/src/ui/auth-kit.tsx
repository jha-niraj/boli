"use client"

/**
 * THE auth frame and the controls every auth screen is built from (main's sign-in, sign-up, verify, forgot / reset,
 * admin's sign-in and invitation). Built on @repo/ui's own Input, Button and InputOTP, so the screens read like every
 * other form in light and dark.
 *
 * Layout: the product on the LEFT, the form on the RIGHT from `lg` (see AuthFrame); on a phone the form alone. Neutral only - rose for an error notice and green for a met password rule, nothing else.
 * An app can bring its own left panel (`panel`), a mark above the form (`formMark`) and serif titles (`display`).
 * A screen is: a title, at most one sentence, the controls, one footnote.
 */
import * as React from "react"
import { Check, Eye, EyeOff, LayoutGrid, ShieldCheck, MessagesSquare } from "lucide-react"
import { usePathname } from "next/navigation"
import { SITE } from "@repo/core/site"
import { cn } from "@repo/ui/lib/utils"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Label } from "@repo/ui/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/components/ui/input-otp"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Skeleton } from "@repo/ui/components/ui/skeleton"

// -- The frame ---------------------------------------------------------------------------------------------------

export interface AuthSwitchLinks {
    /** Shown on every page except sign-in ("Already have an account? Sign in"). */
    signIn: string
    /** Shown on sign-in ("New here? Create an account"). Omit when people cannot sign themselves up (admin). */
    signUp?: string
}

/**
 * Two halves on a wide screen: the product on the LEFT (a dark, deliberate panel: name, one headline, a drawn preview
 * of the product, three lines on what you get), the form on the RIGHT with a top bar that switches between sign-in and
 * sign-up and a footer with the legal links. The halves meet with a soft shadow, not a hairline. On a phone: the form
 * column alone, brand in its top bar.
 */
/** How the screens inside a frame draw their titles: the base sans, or an app's serif display face (`font-serif`). */
type AuthDisplay = "sans" | "serif"
const AuthDisplayContext = React.createContext<AuthDisplay>("sans")

export function AuthFrame({
    children,
    panelTitle,
    panelLine,
    points,
    homeHref = "/",
    eyebrow,
    links,
    legal = { terms: "/terms", privacy: "/privacy" },
    panel,
    formMark,
    display = "sans",
    className,
}: {
    children: React.ReactNode
    /**
     * The app's own left half (from `lg`), drawn edge to edge in place of the default dark panel - an illustration with a
     * card on it. `panelTitle`, `panelLine` and `points` are ignored when it is set.
     */
    panel?: React.ReactNode
    /** A mark above every screen's title (all widths). When set, the top bar's brand is not drawn. */
    formMark?: React.ReactNode
    /** Title face for every screen in this frame. */
    display?: AuthDisplay
    /** Extra classes on the root (an app's ground colour). */
    className?: string
    /** The left panel's headline. Defaults to the product's tagline. */
    panelTitle?: React.ReactNode
    /** One line under it. Defaults to the product's description. */
    panelLine?: React.ReactNode
    /** Three short lines on what the product gives you. */
    points?: readonly { icon: React.ComponentType<{ className?: string }>; text: string }[]
    /** Where the product name links. */
    homeHref?: string
    /** A small label next to the name ("Admin console"). */
    eyebrow?: string
    /** Sign-in / sign-up switch in the form's top bar. */
    links?: AuthSwitchLinks
    /** Footer links; null hides them. */
    legal?: { terms: string; privacy: string } | null
}) {
    const pathname = usePathname() ?? ""
    const onSignIn = links ? pathname === links.signIn || pathname.startsWith(`${links.signIn}/`) : false
    const year = new Date().getFullYear()
    const list = points ?? DEFAULT_POINTS

    const showHeader = !formMark || Boolean(links)

    return (
        <AuthDisplayContext.Provider value={display}>
        <div className={cn("flex min-h-dvh w-full bg-white text-neutral-900 dark:bg-[#121314] dark:text-white", className)}>
            {panel ? (
                <aside className="sticky top-0 hidden h-dvh w-1/2 shrink-0 overflow-hidden lg:block">{panel}</aside>
            ) : (
            <aside className="relative z-10 hidden w-[46%] max-w-[44rem] shrink-0 overflow-hidden bg-[#0d0e10] text-white shadow-[10px_0_40px_-12px_rgba(0,0,0,0.45)] lg:flex">
                <PanelGlow />
                <div className="relative flex min-h-dvh w-full flex-col px-10 py-9 xl:px-14 xl:py-11">
                    <Brand homeHref={homeHref} eyebrow={eyebrow} tone="dark" />

                    <div className="my-auto py-10">
                        <h2 className="max-w-md text-balance text-3xl font-semibold leading-tight tracking-tight">{panelTitle ?? SITE.tagline}</h2>
                        <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">{panelLine ?? SITE.description}</p>
                        <ProductPreview />
                        <ul className="mt-8 space-y-3">
                            {list.map((p) => (
                                <li key={p.text} className="flex items-center gap-3 text-sm text-neutral-300">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
                                        <p.icon className="size-3.5 text-neutral-200" />
                                    </span>
                                    {p.text}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xs text-neutral-500">&copy; {year} {SITE.name}</p>
                </div>
            </aside>
            )}

            {/* Right: the form */}
            <main className="flex min-h-dvh min-w-0 flex-1 flex-col">
                {showHeader && (
                <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 sm:px-8">
                    <div className={cn("lg:invisible", formMark && "invisible")}><Brand homeHref={homeHref} eyebrow={eyebrow} tone="auto" /></div>
                    {links && (onSignIn ? links.signUp : true) && (
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                            <span className="hidden text-neutral-600 sm:inline dark:text-neutral-400">{onSignIn ? "New here?" : "Have an account?"}</span>
                            <Button asChild variant="outline" size="sm" className="h-8 rounded-xl">
                                <AppLink href={onSignIn ? links.signUp! : links.signIn}>{onSignIn ? "Create an account" : "Sign in"}</AppLink>
                            </Button>
                        </div>
                    )}
                </header>
                )}

                <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
                    <div className="w-full max-w-[23rem]">
                        {formMark && <div className={cn("mb-6 flex", display === "serif" && "justify-center")}>{formMark}</div>}
                        {children}
                    </div>
                </div>

                {legal && (
                    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-1 px-5 pb-6 text-xs text-neutral-600 sm:px-8 dark:text-neutral-400">
                        <AppLink href={homeHref} className="hover:text-neutral-900 dark:hover:text-white">Home</AppLink>
                        <AppLink href={legal.terms} className="hover:text-neutral-900 dark:hover:text-white">Terms</AppLink>
                        <AppLink href={legal.privacy} className="hover:text-neutral-900 dark:hover:text-white">Privacy</AppLink>
                    </footer>
                )}
            </main>
        </div>
        </AuthDisplayContext.Provider>
    )
}

const DEFAULT_POINTS = [
    { icon: MessagesSquare, text: "An assistant that asks before it acts" },
    { icon: ShieldCheck, text: "Sign in with a password, Google or an email code" },
    { icon: LayoutGrid, text: "Everything in one calm workspace" },
] as const

function Brand({ homeHref, eyebrow, tone }: { homeHref: string; eyebrow?: string; tone: "dark" | "auto" }) {
    const dark = tone === "dark"
    return (
        <AppLink href={homeHref} className="inline-flex min-w-0 items-center gap-2.5 rounded-lg">
            <span className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold",
                dark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
            )}>
                {SITE.name.slice(0, 1).toUpperCase()}
            </span>
            <span className={cn("truncate text-sm font-semibold", dark ? "text-white" : "text-neutral-900 dark:text-white")}>{SITE.name}</span>
            {eyebrow && (
                <span className={cn(
                    "truncate rounded-md px-1.5 py-0.5 text-xs",
                    dark ? "bg-white/10 text-neutral-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
                )}>{eyebrow}</span>
            )}
        </AppLink>
    )
}

/** Soft light from the top corner and a faint dot grid - decoration only. */
function PanelGlow() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.10),transparent)]" />
            <div className="absolute -bottom-48 right-[-10rem] size-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(168,127,31,0.16),transparent)]" />
            <div
                className="absolute inset-0 text-white/[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
                style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }}
            />
        </div>
    )
}

/** A drawn preview of the workspace: a chat on the left, a waiting question in the right column. Decoration only. */
function ProductPreview() {
    return (
        <div aria-hidden className="mt-8 overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10">
            <div className="flex items-center gap-1.5 px-3 py-2.5">
                <span className="size-2 rounded-full bg-white/15" />
                <span className="size-2 rounded-full bg-white/15" />
                <span className="size-2 rounded-full bg-white/15" />
            </div>
            <div className="grid grid-cols-[1fr_9.5rem] gap-0">
                <div className="space-y-2.5 px-4 pb-4">
                    <div className="ml-auto w-fit max-w-[80%] rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-medium text-neutral-900">Draft a note for the team</div>
                    <div className="w-fit max-w-[85%] rounded-xl bg-white/[0.07] px-3 py-1.5 text-[11px] text-neutral-300">Two quick questions first - they are on the right.</div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1 ring-white/10">
                        <span className="size-1.5 rounded-full bg-[#d8b56a]" />
                        <span className="text-[11px] text-neutral-400">2 questions - waiting for you</span>
                    </div>
                </div>
                <div className="space-y-2 bg-white/[0.03] p-3 shadow-[-8px_0_16px_-12px_rgba(0,0,0,0.6)]">
                    <p className="text-[11px] font-medium text-neutral-200">Who is it for?</p>
                    <div className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-900">Everyone</div>
                    <div className="rounded-md px-2 py-1 text-[11px] text-neutral-400 ring-1 ring-white/10">Only admins</div>
                </div>
            </div>
        </div>
    )
}

// -- Text ------------------------------------------------------------------------------------------------------------

export function AuthTitle({ title, sub }: { title: React.ReactNode; sub?: React.ReactNode }) {
    const serif = React.useContext(AuthDisplayContext) === "serif"
    return (
        <div className={cn("mb-7", serif && "text-center")}>
            <h1 className={cn(
                "text-neutral-900 dark:text-white",
                serif ? "font-serif text-[2.5rem] font-normal leading-[1.1] tracking-tight" : "text-2xl font-semibold tracking-tight",
            )}>{title}</h1>
            {sub && <p className={cn("text-sm leading-relaxed text-neutral-600 dark:text-neutral-400", serif ? "mt-2.5" : "mt-1.5")}>{sub}</p>}
        </div>
    )
}

export function Footnote({ children }: { children: React.ReactNode }) {
    return <div className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 [&_a]:text-sm">{children}</div>
}

/** An inline link inside a footnote or a field row. */
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <AppLink href={href} className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white [font-size:inherit]">
            {children}
        </AppLink>
    )
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "error"; children: React.ReactNode }) {
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn(
                "mb-5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
                tone === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
            )}
        >
            {children}
        </div>
    )
}

export function Divider({ children = "or" }: { children?: React.ReactNode }) {
    return (
        <div className="my-5 flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            {children}
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>
    )
}

/** A status mark for one-line states (sent, done, failed), above the title. */
export function StatusMark({ kind }: { kind: "mail" | "done" | "error" | "key" }) {
    const serif = React.useContext(AuthDisplayContext) === "serif"
    return (
        <span className={cn("mb-5 grid size-11 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white", serif && "mx-auto")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {kind === "mail" && <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>}
                {kind === "done" && <path d="m5 12.5 4.5 4.5L19 7.5" />}
                {kind === "error" && <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.2v.3" /></>}
                {kind === "key" && <><circle cx="8.5" cy="12" r="4" /><path d="M12.5 12H21M18 12v3M21 12v2" /></>}
            </svg>
        </span>
    )
}

// -- Fields ----------------------------------------------------------------------------------------------------------

export const authInputCls = "h-11 rounded-xl"

export function Field({ label, htmlFor, action, hint, children }: {
    label: string
    htmlFor: string
    action?: React.ReactNode
    hint?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
                <Label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</Label>
                {action && <span className="text-xs [&_a]:font-medium [&_a]:text-neutral-600 dark:[&_a]:text-neutral-400 [&_a:hover]:text-neutral-900 dark:[&_a:hover]:text-white">{action}</span>}
            </div>
            {children}
            {hint && <div className="text-xs text-neutral-600 dark:text-neutral-400">{hint}</div>}
        </div>
    )
}

export function PasswordInput({ id, value, onChange, disabled, autoComplete = "current-password", placeholder, autoFocus }: {
    id: string
    value: string
    onChange: (v: string) => void
    disabled?: boolean
    autoComplete?: "current-password" | "new-password"
    placeholder?: string
    autoFocus?: boolean
}) {
    const [show, setShow] = React.useState(false)
    return (
        <div className="relative">
            <Input
                id={id}
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                autoComplete={autoComplete}
                placeholder={placeholder}
                autoFocus={autoFocus}
                required
                className={cn(authInputCls, "pr-11")}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
        </div>
    )
}

/** The six-digit email code: one real input under six drawn boxes, so paste and autofill work. */
export function CodeInput({ value, onChange, onComplete, disabled, autoFocus = true }: {
    value: string
    onChange: (v: string) => void
    onComplete?: (v: string) => void
    disabled?: boolean
    autoFocus?: boolean
}) {
    return (
        <InputOTP
            maxLength={6}
            value={value}
            onChange={(v) => onChange(v.replace(/\D/g, ""))}
            onComplete={onComplete}
            disabled={disabled}
            autoFocus={autoFocus}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="^[0-9]*$"
            containerClassName="w-full"
        >
            <InputOTPGroup className="flex w-full">
                {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 flex-1 text-lg font-medium" />
                ))}
            </InputOTPGroup>
        </InputOTP>
    )
}

// -- Password strength -----------------------------------------------------------------------------------------------

const RULES: readonly { hint: string; test: (pw: string) => boolean }[] = [
    { hint: "at least 8 characters", test: (p) => p.length >= 8 },
    { hint: "a capital letter", test: (p) => /[A-Z]/.test(p) },
    { hint: "a number", test: (p) => /[0-9]/.test(p) },
    { hint: "a symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
]
const LEVEL = ["Too weak", "Weak", "Fair", "Strong", "Excellent"]
const FILL = ["", "bg-neutral-400 dark:bg-neutral-600", "bg-neutral-500", "bg-neutral-700 dark:bg-neutral-300", "bg-neutral-900 dark:bg-white"]

export function passwordScore(pw: string): number {
    return pw ? RULES.reduce((n, r) => (r.test(pw) ? n + 1 : n), 0) : 0
}

/**
 * The strength meter. It NAMES the first missing rule - a bar stuck at three of four that will not say why reads as
 * broken. Monochrome ramp, not a traffic light. Only length (8+) is enforced; the rest is advice.
 */
export function PasswordStrength({ value }: { value: string }) {
    // Always takes its space (empty until typing), so the form below never jumps when the meter appears.
    if (!value) return <div aria-hidden className="h-[1.625rem]" />
    const score = passwordScore(value)
    const missing = RULES.find((r) => !r.test(value))
    return (
        <div className="space-y-1.5 pt-1">
            <div className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={RULES.length} aria-valuenow={score} aria-label="Password strength">
                {RULES.map((_, i) => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < score ? FILL[score] : "bg-neutral-200 dark:bg-neutral-800")} />
                ))}
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">{LEVEL[score]}</span>
                {missing ? ` - add ${missing.hint}` : null}
            </p>
        </div>
    )
}

/**
 * The sign-up rules, shown as a live checklist (each line turns green as it is met). The server's own rule is still
 * the length (8 to 128, better-auth); this list is the stricter bar the form asks for before it lets you submit.
 */
import { PASSWORD_RULES } from "../password-rules"
export { PASSWORD_RULES, passwordMeetsRules } from "../password-rules"

export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
    return (
        <ul id={id} aria-label="Password rules" className="grid gap-1 pt-1.5 text-xs sm:grid-cols-3 sm:gap-2">
            {PASSWORD_RULES.map((r) => {
                const met = r.test(value)
                return (
                    <li key={r.key} className={cn("flex items-center gap-1.5 transition-colors", met ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500 dark:text-neutral-400")}>
                        <span aria-hidden className={cn(
                            "grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors",
                            met ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500" : "border-neutral-300 dark:border-neutral-700",
                        )}>
                            {met && <Check className="size-2.5" strokeWidth={3} />}
                        </span>
                        {r.label}
                        <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
                    </li>
                )
            })}
        </ul>
    )
}

// -- Terms -----------------------------------------------------------------------------------------------------------

/** The required "I accept" box. The links open in a new tab so the half-filled form stays. */
export function TermsCheckbox({ id = "terms", checked, onChange, terms, privacy, disabled }: {
    id?: string
    checked: boolean
    onChange: (v: boolean) => void
    terms: string
    privacy: string
    disabled?: boolean
}) {
    const link = "font-medium text-neutral-900 underline underline-offset-4 dark:text-white"
    return (
        <div className="flex items-start gap-2.5">
            <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" aria-required />
            <Label htmlFor={id} className="block text-sm font-normal leading-snug text-neutral-700 dark:text-neutral-300">
                I accept the{" "}
                <a href={terms} target="_blank" rel="noreferrer" className={link}>Terms of Service</a>
                {" "}and{" "}
                <a href={privacy} target="_blank" rel="noreferrer" className={link}>Privacy Policy</a>
            </Label>
        </div>
    )
}

// -- Buttons ---------------------------------------------------------------------------------------------------------

const authButton = "h-11 w-full gap-2 rounded-xl text-sm"

export function PrimaryButton({ children, loading, disabled, type = "submit", onClick }: {
    children: React.ReactNode
    loading?: boolean
    disabled?: boolean
    type?: "submit" | "button"
    onClick?: () => void
}) {
    return (
        <Button type={type} onClick={onClick} disabled={disabled || loading} className={authButton}>
            {loading && <InlineLoader size={14} className="text-current" />}
            {children}
        </Button>
    )
}

export function SecondaryButton({ children, loading, disabled, type = "button", onClick }: {
    children: React.ReactNode
    loading?: boolean
    disabled?: boolean
    type?: "submit" | "button"
    onClick?: () => void
}) {
    return (
        <Button type={type} variant="outline" onClick={onClick} disabled={disabled || loading} className={authButton}>
            {loading && <InlineLoader size={14} />}
            {children}
        </Button>
    )
}

// Google's four-colour "G" is their mark, used unaltered as their brand rules require - the one place these hues appear.
export function GoogleButton({ onClick, loading, disabled, setup }: { onClick: () => void; loading?: boolean; disabled?: boolean; setup?: boolean }) {
    const button = (
        <Button type="button" variant="outline" onClick={onClick} disabled={setup || disabled || loading} className={authButton}>
            {loading ? <InlineLoader size={14} /> : (
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
                </svg>
            )}
            Continue with Google
        </Button>
    )
    if (!setup) return button
    return (
        <div className="space-y-1.5">
            {button}
            <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                Development only: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local to turn this on.
            </p>
        </div>
    )
}

/** Two or three sign-in methods as one segmented control ("Password" | "Email code"). */
export function MethodTabs<T extends string>({ value, options, onChange, className }: {
    value: T
    options: { value: T; label: string }[]
    onChange: (v: T) => void
    /** Extra classes on the track (an app with pill controls rounds it fully). */
    className?: string
}) {
    return (
        <div role="tablist" aria-label="Sign-in method" className={cn("mb-5 grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900", className)}>
            {options.map((o) => (
                <Button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={value === o.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(o.value)}
                    className={cn(
                        "h-8 rounded-lg text-sm",
                        value === o.value
                            ? "bg-white text-neutral-900 shadow-sm hover:bg-white dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-800"
                            : "text-neutral-600 hover:bg-transparent hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                    )}
                >
                    {o.label}
                </Button>
            ))}
        </div>
    )
}

// -- Loading ---------------------------------------------------------------------------------------------------------

/** The form column while an auth route loads (the frame itself stays - it is the layout). Title, `fields`, a button. */
export function AuthFormSkeleton({ fields = 2, tabs = false }: { fields?: number; tabs?: boolean }) {
    return (
        <div aria-busy="true" aria-label="Loading">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="mt-2.5 mb-6 h-4 w-64 max-w-full rounded-md" />
            {tabs && <Skeleton className="mb-5 h-10 w-full rounded-xl" />}
            <div className="space-y-4">
                {Array.from({ length: fields }, (_, i) => (
                    <div key={i} className="space-y-1.5">
                        <Skeleton className="h-4 w-20 rounded-md" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
                <Skeleton className="h-11 w-full rounded-xl" />
            </div>
        </div>
    )
}
