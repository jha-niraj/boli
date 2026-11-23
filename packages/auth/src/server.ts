/**
 * THE better-auth instance. @repo/auth is the ONLY package that depends on better-auth: an app importing
 * `better-auth/*` itself can resolve a second physical copy, and better-auth's request-scoped AsyncLocalStorage is
 * invisible across two copies ("No request state found" on Cloudflare).
 *
 * Per-app differences come from env, read at module load:
 *   BETTER_AUTH_URL       this app's own origin (its /api/auth lives there)
 *   BETTER_AUTH_SECRET    32+ random characters; local and staging share one, production has its own
 *   AUTH_COOKIE_PREFIX    this app's cookie prefix ('main', 'admin') - set in next.config.js `env` (see ./cookies)
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   Google sign-in, only when both are set
 *   MAIN_APP_URL, ADMIN_APP_URL, NEXT_PUBLIC_SITE_URL   trusted origins
 *
 * Sign-in methods: email + password (verified email required), Google, and a one-time email code (emailOTP; sign-in
 * only - it never creates an account, the sign-up page is the front door).
 */
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'
import { after } from 'next/server'
import { db, eq } from '@repo/db'
import { user as userTable, session as sessionTable, account as accountTable, verification as verificationTable } from '@repo/db/schema'
import { hashPassword, verifyPassword } from '@repo/crypto/password'
import { grantWelcome } from '@repo/billing/ledger'
import {
    sendEmail,
    verifyEmail,
    resetPasswordEmail,
    passwordChangedEmail,
    signInCodeEmail,
    welcomeEmail,
    type EmailContent,
} from '@repo/email'
import { authCookiePrefix } from './cookies'
import { passwordRuleMessage } from './password-rules'

const isDev = process.env.NODE_ENV !== 'production'

function env(name: string): string | undefined {
    const value = process.env[name]?.trim()
    return value ? value : undefined
}

/** Google sign-in is offered only when both keys are set. Pages pass this to the client as a boolean. */
export function isGoogleConfigured(): boolean {
    return Boolean(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET'))
}

/** This app's origin, for links in emails. */
function appUrl(): string {
    return env('BETTER_AUTH_URL') ?? env('MAIN_APP_URL') ?? 'http://localhost:3100'
}

/** Mail the person is WAITING for (a code, a link): a failed send throws, so the page says it was not sent. */
async function deliver(to: string, content: EmailContent): Promise<void> {
    const result = await sendEmail({ kind: 'transactional', to, ...content })
    if (result.status === 'failed') throw new Error(`Email could not be sent: ${result.error}`)
}

/**
 * Best-effort work the person does not wait for (a welcome, a "password changed" notice): after the response when a
 * request is in scope (`after` = `waitUntil` on Workers), inline otherwise. Never a floating promise.
 */
/**
 * The one-time welcome credits (100, keyed `welcome:<accountId>`, so every path below may call it). INLINE, never
 * after(): it is money the person is told they have. A failure is logged and does not undo the verification; the next
 * verified update grants it.
 */
async function grantWelcomeCredits(userId: string): Promise<void> {
    try {
        await grantWelcome(userId)
    } catch (err) {
        console.error('[auth] welcome credits failed:', err instanceof Error ? err.message : err)
    }
}

async function inBackground(task: () => Promise<unknown>): Promise<void> {
    const run = async () => {
        try {
            await task()
        } catch (err) {
            console.error('[auth] background task failed:', err)
        }
    }
    try {
        after(run)
    } catch {
        await run()
    }
}

function trustedOrigins(): string[] {
    const list = [env('BETTER_AUTH_URL'), env('MAIN_APP_URL'), env('ADMIN_APP_URL'), env('NEXT_PUBLIC_SITE_URL')]
    if (isDev) {
        // 127.0.0.1 is a different origin from localhost; a dev opening either must be able to sign in.
        list.push('http://localhost:3100', 'http://127.0.0.1:3100', 'http://localhost:3101', 'http://127.0.0.1:3101')
    }
    return [...new Set(list.filter((v): v is string => Boolean(v)))]
}

const googleClientId = env('GOOGLE_CLIENT_ID')
const googleClientSecret = env('GOOGLE_CLIENT_SECRET')

export const auth = betterAuth({
    baseURL: env('BETTER_AUTH_URL'),
    secret: env('BETTER_AUTH_SECRET'),
    trustedOrigins: trustedOrigins(),

    // neon-http has no transactions (`db.transaction()` throws): better-auth runs its writes one after another.
    database: drizzleAdapter(db, {
        provider: 'pg',
        transaction: false,
        schema: { user: userTable, session: sessionTable, account: accountTable, verification: verificationTable },
    }),

    // The checklist's rules, enforced here too (owner, 2026-11-24): sign-up, reset, change and set password all pass through.
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            const body = ctx.body as { password?: unknown; newPassword?: unknown } | undefined
            const pw = ctx.path === '/sign-up/email' ? body?.password : ctx.path === '/reset-password' || ctx.path === '/change-password' || ctx.path === '/set-password' ? body?.newPassword : undefined
            if (typeof pw !== 'string') return
            const message = passwordRuleMessage(pw)
            if (message) throw new APIError('BAD_REQUEST', { message, code: 'PASSWORD_RULES' })
        }),
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        revokeSessionsOnPasswordReset: true,
        resetPasswordTokenExpiresIn: 60 * 60,
        // Native scrypt in better-auth's own format (~30 ms on Workers). Never bcrypt.
        password: {
            hash: hashPassword,
            verify: ({ hash, password }) => verifyPassword(hash, password),
        },
        sendResetPassword: async ({ user, url }) => {
            await deliver(user.email, resetPasswordEmail({ name: user.name, url }))
        },
        onPasswordReset: async ({ user }) => {
            await inBackground(() => sendEmail({ kind: 'transactional', to: user.email, ...passwordChangedEmail({ name: user.name }) }))
        },
    },

    emailVerification: {
        sendOnSignUp: true,
        // A sign-in with an unverified email answers EMAIL_NOT_VERIFIED and mails a fresh link.
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        expiresIn: 60 * 60 * 24,
        sendVerificationEmail: async ({ user, url }) => {
            await deliver(user.email, verifyEmail({ name: user.name, url }))
        },
        afterEmailVerification: async (user) => {
            await grantWelcomeCredits(user.id)
            await inBackground(() => sendEmail({ kind: 'transactional', to: user.email, ...welcomeEmail({ name: user.name, appUrl: appUrl() }) }))
        },
    },

    socialProviders:
        googleClientId && googleClientSecret
            ? { google: { clientId: googleClientId, clientSecret: googleClientSecret, prompt: 'select_account' } }
            : {},

    account: {
        // "Continue with Google" on an address that already has a password account joins the two (Google verifies the
        // address), instead of failing with account_not_linked.
        accountLinking: { enabled: true, trustedProviders: ['google'] },
    },

    user: {
        additionalFields: {
            // input: false on all of them - sign-up must never be able to set its own role or flags.
            role: { type: 'string', defaultValue: 'USER', input: false },
            isActive: { type: 'boolean', defaultValue: true, required: false, input: false },
            bio: { type: 'string', required: false, input: false },
            address: { type: 'string', required: false, input: false },
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
        // The session is answered from a signed cookie for 5 minutes - no database read on most requests. Writes and
        // admin gates read fresh (`getFreshSession`).
        cookieCache: { enabled: true, maxAge: 5 * 60, strategy: 'compact' },
    },

    databaseHooks: {
        user: {
            create: {
                // Google (and any path that creates a verified user) gets the welcome at once; email + password users
                // get it after they confirm their email (afterEmailVerification).
                after: async (u) => {
                    if (!u.emailVerified) return
                    await grantWelcomeCredits(u.id)
                    await inBackground(() => sendEmail({ kind: 'transactional', to: u.email, ...welcomeEmail({ name: u.name, appUrl: appUrl() }) }))
                },
            },
            update: {
                // A path that verifies without afterEmailVerification (the one-time email code, Google linking an
                // unverified password account) still gets the grant; it is keyed, so a repeat adds nothing.
                after: async (u) => {
                    if (u.emailVerified === true && typeof u.id === 'string') await grantWelcomeCredits(u.id)
                },
            },
        },
        session: {
            create: {
                // A deactivated account gets no new session, whichever way it signs in.
                before: async (s) => {
                    const [row] = await db.select({ isActive: userTable.isActive }).from(userTable).where(eq(userTable.id, s.userId)).limit(1)
                    if (row && row.isActive === false) return false
                },
            },
        },
    },

    // An OAuth failure lands on the sign-in page with `?error=<code>` (shown as a sentence), not better-auth's own page.
    onAPIError: { errorURL: '/signin' },

    advanced: {
        cookiePrefix: authCookiePrefix(),
    },

    plugins: [
        emailOTP({
            otpLength: 6,
            expiresIn: 10 * 60,
            allowedAttempts: 5,
            storeOTP: 'hashed',
            // Sign-in only: a code for an unknown address creates nothing.
            disableSignUp: true,
            sendVerificationOTP: async ({ email, otp, type }) => {
                await deliver(email, signInCodeEmail({ code: otp, purpose: type, minutes: 10 }))
            },
        }),
        // Must be last: lets server actions that call auth.api (change password, revoke) set cookies.
        nextCookies(),
    ],
})

export type Auth = typeof auth
export type Session = typeof auth.$Infer.Session
export type SessionUser = Session['user']
