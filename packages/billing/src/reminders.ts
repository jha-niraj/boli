// @repo/billing - renewal reminders, run daily by @repo/cron (`billing-renewal-reminders`).
//
// A prepaid period (eSewa / Khalti, or a card paid for 1 / 3 / 12 months) ends on its own; three days before, the
// account's contact gets ONE email per period. Auto-renew periods are reminded too ("renews on ..."), so nobody is
// surprised by a charge. The row is CLAIMED (reminder_sent_for = the period end) before the mail goes out, so two runs
// never send twice; a failed send un-claims it for the next run. Bounded batch - a cron job stays short.
import { defineCronJob } from '@repo/cron'
import { and, db, eq, gt, isNull, lte, ne, or, sql } from '@repo/db'
import { billingAccount, subscription, user } from '@repo/db/schema'
import { SITE } from '@repo/core/site'
import { button, esc, heading, layout, paragraph, sendEmail, type EmailContent } from '@repo/email'
import { formatMoney, PLANS, type PlanCode } from './plans'

const DAY_MS = 24 * 60 * 60 * 1000
const BATCH = 100

export function renewalReminderEmail(input: {
    name: string | null
    planName: string
    endsAt: Date
    autoRenew: boolean
    amount: string | null
    billingUrl: string
}): EmailContent {
    const hi = (input.name ?? '').trim().split(/\s+/)[0] || 'there'
    const date = input.endsAt.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    const line = input.autoRenew
        ? `Your ${input.planName} plan renews on ${date}${input.amount ? ` for ${input.amount}` : ''}. Nothing to do if you want to keep it.`
        : `Your ${input.planName} plan ends on ${date}. Renew before then to keep your monthly credits.`
    return {
        subject: input.autoRenew ? `Your ${SITE.name} plan renews on ${date}` : `Your ${SITE.name} plan ends on ${date}`,
        html: layout({
            preheader: line,
            body: heading(`Hi ${esc(hi)}`) + paragraph(esc(line)) + button(input.autoRenew ? 'Manage billing' : 'Renew now', input.billingUrl),
            footnote: 'You are receiving this because you have a paid plan on this account.',
        }),
        text: `Hi ${hi}\n\n${line}\n\n${input.autoRenew ? 'Manage billing' : 'Renew now'}: ${input.billingUrl}`,
    }
}

/** Send the reminders due now. Returns counts for the cron run log (no personal data). */
export async function sendRenewalReminders(now: Date = new Date()): Promise<{ due: number; sent: number; failed: number; expired: number }> {
    // Housekeeping first: a period that ended is expired (the plan is computed from the end date anyway; this keeps the
    // admin list honest).
    const expired = await db.update(subscription).set({ status: 'expired', updatedAt: now })
        .where(and(lte(subscription.currentPeriodEnd, now), ne(subscription.status, 'expired'), eq(subscription.autoRenew, false)))
        .returning({ id: subscription.id })

    const base = (process.env.MAIN_APP_URL ?? process.env.BETTER_AUTH_URL ?? '').trim().replace(/\/+$/, '')
    if (!base) {
        console.error('[billing] MAIN_APP_URL is not set - renewal reminders skipped')
        return { due: 0, sent: 0, failed: 0, expired: expired.length }
    }
    const horizon = new Date(now.getTime() + 3 * DAY_MS)
    // Claim the batch in one statement: only rows not yet reminded for THIS period end.
    const claimed = await db.update(subscription)
        .set({ reminderSentFor: sql`${subscription.currentPeriodEnd}` })
        .where(and(
            gt(subscription.currentPeriodEnd, now),
            lte(subscription.currentPeriodEnd, horizon),
            or(eq(subscription.status, 'active'), eq(subscription.status, 'past_due')),
            or(isNull(subscription.reminderSentFor), ne(subscription.reminderSentFor, subscription.currentPeriodEnd)),
            sql`${subscription.id} IN (SELECT id FROM subscription WHERE current_period_end > ${now.toISOString()}::timestamptz
                AND current_period_end <= ${horizon.toISOString()}::timestamptz AND status IN ('active', 'past_due')
                AND (reminder_sent_for IS NULL OR reminder_sent_for <> current_period_end)
                ORDER BY current_period_end LIMIT ${BATCH})`,
        ))
        .returning()

    let sent = 0
    let failed = 0
    for (const sub of claimed) {
        const [contact] = await db.select({ email: user.email, name: user.name }).from(billingAccount)
            .innerJoin(user, eq(user.id, billingAccount.contactUserId))
            .where(eq(billingAccount.id, sub.accountId)).limit(1)
        if (!contact) continue
        const plan = PLANS[sub.planCode as PlanCode] ?? PLANS.pro
        const content = renewalReminderEmail({
            name: contact.name,
            planName: plan.name,
            endsAt: sub.currentPeriodEnd,
            autoRenew: sub.autoRenew,
            amount: sub.autoRenew && sub.amountMinor && sub.currency ? formatMoney(sub.amountMinor, sub.currency) : null,
            billingUrl: `${base}/billing`,
        })
        const r = await sendEmail({ kind: 'transactional', to: contact.email, ...content })
        if (r.status === 'failed') {
            failed++
            await db.update(subscription).set({ reminderSentFor: null }).where(eq(subscription.id, sub.id))
        } else {
            sent++
        }
    }
    return { due: claimed.length, sent, failed, expired: expired.length }
}

export const renewalRemindersJob = defineCronJob({
    name: 'billing-renewal-reminders',
    slot: 'daily',
    description: 'Emails each paid plan 3 days before its period ends (once per period) and marks ended prepaid plans expired.',
    run: ({ now }) => sendRenewalReminders(now),
})
