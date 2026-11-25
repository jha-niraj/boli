/**
 * @repo/email - Resend over fetch, typed by kind, one neutral layout.
 *
 *   import { sendEmail, verifyEmail } from '@repo/email'
 *   const r = await sendEmail({ kind: 'transactional', to, ...verifyEmail({ name, url }) })
 *   // r.status: 'sent' | 'skipped' (no RESEND_API_KEY - logged, body printed in development) | 'failed'
 *
 * Never a literal `from:` - RESEND_FROM_EMAIL is read at call time.
 */
export { sendEmail, isEmailConfigured, htmlToText } from './send'
export type { EmailKind, SendEmailInput, SendEmailResult, TransactionalEmailInput, MarketingEmailInput } from './send'
export { layout, heading, paragraph, button, fallbackLink, codeBlock, esc, escUrl } from './layout'
export {
    welcomeEmail,
    verifyEmail,
    resetPasswordEmail,
    passwordChangedEmail,
    signInCodeEmail,
    adminInvitationEmail,
    workspaceInvitationEmail,
    jawafClaimEmail,
    jawafBotPausedEmail,
} from './templates'
export type { EmailContent, CodePurpose } from './templates'
