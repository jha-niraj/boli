/**
 * The product's transactional templates. Each returns `{ subject, html, text }` - spread it into `sendEmail`:
 *
 *   await sendEmail({ kind: 'transactional', to: user.email, ...verifyEmail({ name: user.name, url }) })
 *
 * The plain text is written by hand (not derived), so the dev console log of a skipped mail reads cleanly.
 */
import { SITE } from '@repo/core/site'
import { button, codeBlock, esc, fallbackLink, heading, layout, paragraph } from './layout'

export interface EmailContent {
    subject: string
    html: string
    text: string
}

function firstName(name: string | null | undefined): string {
    const first = (name ?? '').trim().split(/\s+/)[0]
    return first || 'there'
}

export function welcomeEmail({ name, appUrl }: { name: string | null | undefined; appUrl: string }): EmailContent {
    const hi = firstName(name)
    return {
        subject: `Welcome to ${SITE.name}`,
        html: layout({
            preheader: `Your ${SITE.name} account is ready.`,
            body:
                heading(`Welcome, ${hi}`) +
                paragraph(`Your ${esc(SITE.name)} account is ready. ${esc(SITE.tagline)}`) +
                button(`Open ${SITE.name}`, appUrl),
            footnote: 'You are receiving this because an account was created with this email address.',
        }),
        text: `Welcome, ${hi}\n\nYour ${SITE.name} account is ready.\n\nOpen ${SITE.name}: ${appUrl}`,
    }
}

export function verifyEmail({ name, url }: { name: string | null | undefined; url: string }): EmailContent {
    const hi = firstName(name)
    return {
        subject: `Confirm your email for ${SITE.name}`,
        html: layout({
            preheader: 'One click to confirm your email address.',
            body:
                heading('Confirm your email') +
                paragraph(`Hi ${esc(hi)}, press the button to confirm this is your email address. The link works for 24 hours.`) +
                button('Confirm email', url) +
                fallbackLink(url),
            footnote: "If you didn't create an account, ignore this email - nothing happens.",
        }),
        text: `Hi ${hi},\n\nConfirm your email address (the link works for 24 hours):\n${url}\n\nIf you didn't create an account, ignore this email.`,
    }
}

export function resetPasswordEmail({ name, url }: { name: string | null | undefined; url: string }): EmailContent {
    const hi = firstName(name)
    return {
        subject: `Reset your ${SITE.name} password`,
        html: layout({
            preheader: 'A link to choose a new password.',
            body:
                heading('Reset your password') +
                paragraph(`Hi ${esc(hi)}, press the button to choose a new password. The link works for one hour and only once.`) +
                button('Choose a new password', url) +
                fallbackLink(url),
            footnote: "If you didn't ask for this, ignore this email - your password stays the same.",
        }),
        text: `Hi ${hi},\n\nChoose a new password (the link works for one hour, once):\n${url}\n\nIf you didn't ask for this, ignore this email.`,
    }
}

export function passwordChangedEmail({ name, when }: { name: string | null | undefined; when?: Date }): EmailContent {
    const hi = firstName(name)
    const at = (when ?? new Date()).toUTCString()
    return {
        subject: `Your ${SITE.name} password was changed`,
        html: layout({
            preheader: 'Your password was just changed.',
            body:
                heading('Your password was changed') +
                paragraph(`Hi ${esc(hi)}, the password on your account was changed on ${esc(at)}.`) +
                paragraph("If this was you, there is nothing to do. If it wasn't, reset your password right away from the sign-in page."),
            footnote: 'You are receiving this because the password on your account changed.',
        }),
        text: `Hi ${hi},\n\nThe password on your account was changed on ${at}.\nIf this wasn't you, reset your password from the sign-in page right away.`,
    }
}

export type CodePurpose = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'

const CODE_COPY: Record<CodePurpose, { subject: string; title: string; line: string }> = {
    'sign-in': { subject: 'Your sign-in code', title: 'Your sign-in code', line: 'Enter this code to sign in.' },
    'email-verification': { subject: 'Your confirmation code', title: 'Confirm your email', line: 'Enter this code to confirm your email address.' },
    'forget-password': { subject: 'Your password reset code', title: 'Reset your password', line: 'Enter this code to choose a new password.' },
    'change-email': { subject: 'Your email change code', title: 'Confirm your new email', line: 'Enter this code to confirm the change.' },
}

export function signInCodeEmail({ code, purpose = 'sign-in', minutes = 10 }: { code: string; purpose?: CodePurpose; minutes?: number }): EmailContent {
    const copy = CODE_COPY[purpose]
    return {
        subject: `${copy.subject}: ${code}`,
        html: layout({
            preheader: `${copy.line} It works for ${minutes} minutes.`,
            body: heading(copy.title) + paragraph(esc(copy.line)) + codeBlock(code, `Works for ${minutes} minutes, once.`),
            footnote: "If you didn't ask for a code, ignore this email - nobody can sign in without it.",
        }),
        text: `${copy.title}\n\n${copy.line}\n\n    ${code}\n\nWorks for ${minutes} minutes, once. If you didn't ask for it, ignore this email.`,
    }
}

export function adminInvitationEmail({
    name,
    roleLabel,
    url,
    invitedBy,
    days = 7,
}: {
    name?: string | null
    roleLabel: string
    url: string
    invitedBy?: string | null
    days?: number
}): EmailContent {
    const hi = firstName(name)
    const by = invitedBy ? ` by ${invitedBy}` : ''
    return {
        subject: `You're invited to the ${SITE.name} admin console`,
        html: layout({
            preheader: `Accept your invitation and set a password.`,
            body:
                heading('You are invited') +
                paragraph(`Hi ${esc(hi)}, you were invited${esc(by)} to the ${esc(SITE.name)} admin console as <strong>${esc(roleLabel)}</strong>.`) +
                paragraph(`Accept the invitation and set your password. The link works for ${days} days.`) +
                button('Accept invitation', url) +
                fallbackLink(url),
            footnote: "If you didn't expect this invitation, ignore this email.",
        }),
        text: `Hi ${hi},\n\nYou were invited${by} to the ${SITE.name} admin console as ${roleLabel}.\nAccept and set your password (works for ${days} days):\n${url}`,
    }
}

export function workspaceInvitationEmail({
    workspaceName,
    invitedBy,
    products,
    url,
    days = 7,
}: {
    workspaceName: string
    invitedBy?: string | null
    /** What they get, in words ("Kura, API"). */
    products: string
    url: string
    days?: number
}): EmailContent {
    const by = invitedBy ? `${invitedBy} invited you` : 'You were invited'
    return {
        subject: `Join ${workspaceName} on ${SITE.name}`,
        html: layout({
            preheader: `${by} to ${workspaceName} on ${SITE.name}.`,
            body:
                heading(`Join ${workspaceName}`) +
                paragraph(`${esc(by)} to the workspace <strong>${esc(workspaceName)}</strong> on ${esc(SITE.name)}. You get access to: ${esc(products)}.`) +
                paragraph(`Sign in or create an account with this email address, then accept. The link works for ${days} days.`) +
                button('Accept invitation', url) +
                fallbackLink(url),
            footnote: "If you didn't expect this invitation, ignore this email - nothing happens.",
        }),
        text: `${by} to the workspace ${workspaceName} on ${SITE.name}.\nYou get access to: ${products}.\n\nAccept (works for ${days} days, sign in or create an account with this email first):\n${url}\n\nIf you didn't expect this, ignore this email.`,
    }
}
