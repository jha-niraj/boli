/**
 * THE one place an email leaves the platform: Resend over plain `fetch` (no SDK - Workers-safe, nothing to bundle).
 *
 * - `kind` is required. Marketing mail MUST carry `unsubscribeUrl` (header + visible footer); transactional mail MUST
 *   NOT (an unsubscribe on a password reset is how someone locks themselves out). The union makes both mistakes a type
 *   error, and `sendEmail` re-checks at run time for untyped callers.
 * - Env is read at CALL time (RESEND_API_KEY, RESEND_FROM_EMAIL), never at module load, so a Worker with the key set
 *   after build still sends. Whitespace-only counts as missing.
 * - No key = `skipped`, logged, never a throw. In development the skipped mail's plain text (with its link or code) is
 *   printed to the server console, so sign-up, the email code and password reset can be tested with no provider.
 * - Resend answers errors as JSON with a non-2xx status; that is `failed` with Resend's own message, never `sent`.
 */

import { SITE } from '@repo/core/site'

export type EmailKind = 'transactional' | 'marketing'

/** The sender as `<product name> <address>` (SITE.name, "Boli"), whatever display name RESEND_FROM_EMAIL carries. */
function withSenderName(from: string): string {
    const address = /<([^>]+)>/.exec(from)?.[1]?.trim() ?? from.trim()
    const name = SITE.name.replace(/["<>]/g, '')
    return `${name} <${address}>`
}

interface BaseEmailInput {
    to: string | string[]
    subject: string
    html: string
    /** Plain-text alternative. Generated from `html` when omitted. */
    text?: string
    replyTo?: string
}

/** Mail the person asked for by using the product: a code, a link, an invitation. Never an unsubscribe. */
export interface TransactionalEmailInput extends BaseEmailInput {
    kind: 'transactional'
    /** Not a field: passing an unsubscribe URL on transactional mail is a type error. */
    unsubscribeUrl?: never
}

/** Mail the person did not ask for individually (a digest, an announcement). Unsubscribe required. */
export interface MarketingEmailInput extends BaseEmailInput {
    kind: 'marketing'
    /** One click stops this mail. Becomes `List-Unsubscribe` (+ one-click POST) and a visible footer link. */
    unsubscribeUrl: string
}

export type SendEmailInput = TransactionalEmailInput | MarketingEmailInput

export type SendEmailResult =
    | { status: 'sent'; id: string | null }
    | { status: 'skipped'; reason: string }
    | { status: 'failed'; error: string }

function env(name: string): string | undefined {
    const value = process.env[name]?.trim()
    return value ? value : undefined
}

/** True when RESEND_API_KEY is set - for a UI that wants to say "email is not set up" instead of "sent". */
export function isEmailConfigured(): boolean {
    return Boolean(env('RESEND_API_KEY'))
}

const isDev = process.env.NODE_ENV !== 'production'

/** A newline in a subject is a header injection; subjects are often built from user data. */
function cleanSubject(subject: string): string {
    return subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
}

/** A rough plain-text part from HTML. A message with no text part scores worse with spam filters. */
export function htmlToText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, '\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim()
}

function withUnsubscribeFooter(html: string, url: string): string {
    if (html.includes(url)) return html
    const footer =
        `<div style="margin:24px auto 0;max-width:520px;padding:16px 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;` +
        `font-size:12px;color:#525252;text-align:center">You are receiving this because you subscribed to updates. ` +
        `<a href="${url}" style="color:#525252;text-decoration:underline">Unsubscribe</a>.</div>`
    return html.includes('</body>') ? html.replace('</body>', `${footer}</body>`) : html + footer
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const subject = cleanSubject(input.subject)
    const to = Array.isArray(input.to) ? input.to : [input.to]

    // The type forbids this already; untyped callers (a template from the database, a JS script) reach here too.
    if (input.kind === 'marketing' && !input.unsubscribeUrl) {
        console.error(`[email] refused "${subject}": marketing email needs an unsubscribeUrl`)
        return { status: 'failed', error: 'Marketing email needs an unsubscribe link' }
    }

    const html = input.kind === 'marketing' ? withUnsubscribeFooter(input.html, input.unsubscribeUrl) : input.html
    const text = input.text ?? htmlToText(html)

    const apiKey = env('RESEND_API_KEY')
    if (!apiKey) {
        console.warn(`[email] skipped (RESEND_API_KEY is not set) kind=${input.kind} to=${to.join(',')} subject="${subject}"`)
        if (isDev) console.info(`[email] --- body of "${subject}" (development only) ---\n${text}\n[email] --- end ---`)
        return { status: 'skipped', reason: 'RESEND_API_KEY is not set' }
    }

    const fromEnv = env('RESEND_FROM_EMAIL')
    if (!fromEnv) {
        console.error(`[email] failed "${subject}": RESEND_FROM_EMAIL is not set`)
        return { status: 'failed', error: 'RESEND_FROM_EMAIL is not set' }
    }
    const from = withSenderName(fromEnv)

    const headers =
        input.kind === 'marketing'
            ? { 'List-Unsubscribe': `<${input.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
            : undefined

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from,
                to,
                subject,
                html,
                text,
                ...(input.replyTo ? { reply_to: input.replyTo } : {}),
                ...(headers ? { headers } : {}),
            }),
        })
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
            const message =
                body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
                    ? body.message
                    : `HTTP ${res.status}`
            console.error(`[email] Resend rejected "${subject}": ${message}`)
            return { status: 'failed', error: message }
        }
        const id = body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' ? body.id : null
        return { status: 'sent', id }
    } catch (err) {
        console.error(`[email] send threw for "${subject}":`, err)
        return { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
