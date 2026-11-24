// @repo/billing (server only) - the AI usage meter, plus plans, payments and credits.
//
// - Meter: prices each request at cache-read / cache-write / output rates and writes one `ai_usage_log` row per call;
//   a per-person daily cost cap from AI_DAILY_USD_CAP_PER_USER (blank = off).
// - Plans (code, not DB - `@repo/billing/plans`, browser-safe): Free / Pro, NPR / INR / USD, 1 / 3 / 12 months prepaid
//   with a discount, or auto-renew monthly where the gateway supports it (Stripe, Razorpay, Cashfree).
// - The billing account belongs to a workspace (ownerType 'workspace'; ./workspace.ts creates a person's personal
//   workspace on first use). Credits are an append-only ledger; the cached balance moves in the same statement as each
//   ledger row.
// - startCheckout -> the gateway (@repo/payments) -> confirmPayment (return) / applyWebhookNotices (webhook): whichever
//   arrives first applies the purchase, the other changes nothing.
// - Credits are integer MICRO-credits (1 credit = Rs 1 = 1,000,000). The welcome grant (`grantWelcome`) runs on email
//   verification; a model call is charged by apps/main lib/platform/credits.ts with `ledgerEntrySql` inside one batch.
// - CREDITS_ENFORCED=1: a model call needs a positive balance (calls are charged either way).
export { requestCostUsd, priceCall } from './ai-meter'
export type { CallCost } from './ai-meter'
export { logAiUsage, spentTodayMicroUsd, dailyCapMicroUsd, checkDailyCap, startOfUtcDay } from './usage-log'
export * from './plans'
export {
    getOrCreateAccount, accountForUser, addCredits, ledgerEntrySql, appliedBalance, creditsToMicro, grantWelcome, recomputeBalance,
    creditsEnforced, balanceMicroForUser, hasCredits, workspaceHasCredits, spendCredits, startOfUtcMonth, creditsSpentThisMonth, recentLedger, dailySpend,
    type BillingAccountRow, type LedgerEntryInput, type LedgerRow, type DailySpend,
} from './ledger'
export {
    ensurePersonalWorkspace, findPersonalWorkspace, accountForWorkspace, findWorkspaceAccount, findAccountForUser, balanceMicroForWorkspace,
    type PersonalWorkspace,
} from './workspace'
export {
    appBaseUrl, startCheckout, startCreditPurchase, confirmPayment, applyVerified, applyWebhookNotices, markCancelled, getPayment, effectivePlan,
    cancelAutoRenew, type CheckoutRequest, type CreditPurchaseInput, type StartCheckoutInput, type StartedCheckout, type ConfirmOutcome, type PaymentRow,
    type SubscriptionRow, type EffectivePlan,
} from './checkout'
export {
    billingOverview, setPreferredCurrency, adminListPayments, adminListSubscriptions, adminBillingStats, adminGrantCredits,
    adminUserCredits, type BillingOverview, type PaymentView, type SubscriptionView, type AdminPaymentRow, type AdminPaymentFilters,
    type AdminSubscriptionRow, type AdminBillingStats, type AdminLedgerRow, type Paged,
} from './overview'
export { sendRenewalReminders, renewalRemindersJob, renewalReminderEmail } from './reminders'
// For apps that read billing without listing @repo/payments themselves (admin).
export { isProviderId, PROVIDER_IDS, type ProviderId } from '@repo/payments'
