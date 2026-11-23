// Billing tables: one usage row per model call, priced by @repo/billing's meter (ai_usage_log), and below it the
// billing account, subscription, payment and credit ledger tables.
import { pgTable, text, timestamp, integer, bigint, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { user } from './core'

export const aiUsageLogs = pgTable(
    'ai_usage_log',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
        /** What the call was for, e.g. `ai_page_chat`. */
        feature: text('feature').notNull(),
        /** The task name from @repo/ai's task map. */
        task: text('task').notNull(),
        model: text('model').notNull(),
        conversationId: text('conversation_id'),
        /** Requests made (one per tool-loop step). */
        steps: integer('steps').notNull().default(1),
        /** All input tokens; the three below are SUBSETS of it. */
        inputTokens: integer('input_tokens').notNull().default(0),
        cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
        cacheWrite5mTokens: integer('cache_write_5m_tokens').notNull().default(0),
        cacheWrite1hTokens: integer('cache_write_1h_tokens').notNull().default(0),
        outputTokens: integer('output_tokens').notNull().default(0),
        /** Cost in MILLIONTHS of a US dollar (integer, never a float - the money rule). $0.000123 = 123. */
        costMicroUsd: integer('cost_micro_usd').notNull().default(0),
        /** The model was in the price registry. False = cost is 0 because the price is unknown, not because it was free. */
        priceKnown: boolean('price_known').notNull().default(true),
        /** The turn produced no answer. */
        failed: boolean('failed').notNull().default(false),
        /** Per-request breakdown (long-context pricing is per request). */
        requests: jsonb('requests'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('ai_usage_log_user_created_idx').on(t.userId, t.createdAt),
        index('ai_usage_log_created_idx').on(t.createdAt),
    ],
)

// ---------------------------------------------------------------------------------------------------------------------
// Plans, payments and credits (@repo/billing). Money is integer MINOR units (paisa / cents); credits are stored as
// integer MICRO-credits (Boli: 1 credit = Rs 1 = 1,000,000 micro-credits).
//
// The billing OWNER is a pair (`ownerType`, `ownerId`): today every account is `('user', user.id)`. A later workspace
// owner drops in as `('workspace', workspace.id)` with no new table - every other billing row points at the account.
//
// Idempotency (db.transaction throws on neon-http, so every write is one statement or guarded by a unique index):
// - payment: unique (provider, provider_payment_id) and (provider, provider_order_id) - a webhook and a return verify
//   racing on the same payment find the same row; `fulfilled_at` is set by exactly one conditional UPDATE.
// - credit_ledger: unique `idempotency_key` (`purchase:<paymentId>`, `spend:<ref>`, `grant:<id>`): a retry inserts
//   nothing, and the cached balance moves in the SAME statement as the insert (a CTE), so it can never drift.
// - subscription: one row per account (unique account_id), extended in place.
// ---------------------------------------------------------------------------------------------------------------------

export const BILLING_OWNER_TYPES = ['user', 'workspace'] as const
export type BillingOwnerType = (typeof BILLING_OWNER_TYPES)[number]

export const billingAccount = pgTable(
    'billing_account',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        ownerType: text('owner_type').$type<BillingOwnerType>().notNull().default('user'),
        /** user.id today; a workspace id later. No FK, because the target table depends on owner_type. */
        ownerId: text('owner_id').notNull(),
        /** Who gets billing emails (the user today; a workspace's billing contact later). */
        contactUserId: text('contact_user_id').references(() => user.id, { onDelete: 'set null' }),
        /**
         * Cached sum of credit_ledger.amount_micro for this account, in MICRO-credits (Boli: 1 credit = Rs 1 =
         * 1,000,000 micro-credits, so a 0.0036-credit call is exact). Moved only in the same statement as a ledger insert.
         */
        balanceMicro: bigint('balance_micro', { mode: 'number' }).notNull().default(0),
        /** The currency the owner last chose (NPR / INR / USD). */
        currency: text('currency'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('billing_account_owner_uq').on(t.ownerType, t.ownerId)],
)

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'cancelled', 'expired'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const subscription = pgTable(
    'subscription',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        accountId: text('account_id').notNull().references(() => billingAccount.id, { onDelete: 'cascade' }),
        planCode: text('plan_code').notNull(),
        status: text('status').$type<SubscriptionStatus>().notNull().default('active'),
        /** Which gateway took the last payment for this period. */
        provider: text('provider'),
        /** Set only while an auto-renew subscription is live at the gateway (Stripe sub_..., Razorpay sub_..., Cashfree id). */
        providerSubscriptionId: text('provider_subscription_id'),
        currency: text('currency'),
        /** The price of one renewal in minor units (auto-renew), or of the last prepaid term. */
        amountMinor: integer('amount_minor'),
        /** Months bought in the last prepaid term (1 / 3 / 12), 1 for auto-renew. */
        termMonths: integer('term_months').notNull().default(1),
        currentPeriodStart: timestamp('current_period_start').notNull(),
        currentPeriodEnd: timestamp('current_period_end').notNull(),
        autoRenew: boolean('auto_renew').notNull().default(false),
        /** The period end a reminder was sent for - one reminder per period, even when the cron runs twice. */
        reminderSentFor: timestamp('reminder_sent_for'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('subscription_account_uq').on(t.accountId),
        index('subscription_period_end_idx').on(t.currentPeriodEnd),
        index('subscription_provider_sub_idx').on(t.provider, t.providerSubscriptionId),
    ],
)

export const PAYMENT_KINDS = ['plan', 'credits', 'renewal'] as const
export type PaymentKind = (typeof PAYMENT_KINDS)[number]
export const PAYMENT_STATUSES = ['created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const payment = pgTable(
    'payment',
    {
        /** OUR reference, sent to the gateway (eSewa transaction_uuid, Khalti purchase_order_id, Cashfree order_id...). */
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        /**
         * Null once the owner deleted their account: completed payments are KEPT de-identified for accounting (owner,
         * 2026-11-24), while the balance and ledger go with the billing account.
         */
        accountId: text('account_id').references(() => billingAccount.id, { onDelete: 'set null' }),
        /** Who pressed Pay (null for a renewal the gateway charged on its own). */
        userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
        kind: text('kind').$type<PaymentKind>().notNull(),
        status: text('status').$type<PaymentStatus>().notNull().default('created'),
        provider: text('provider').notNull(),
        currency: text('currency').notNull(),
        /** What we asked for, integer minor units. The gateway's amount must equal this exactly. */
        amountMinor: integer('amount_minor').notNull(),
        planCode: text('plan_code'),
        termMonths: integer('term_months'),
        /** True when this payment started an auto-renew subscription. */
        autoRenew: boolean('auto_renew').notNull().default(false),
        packCode: text('pack_code'),
        credits: integer('credits'),
        /** The gateway's id for the checkout (Khalti pidx, Stripe cs_..., Razorpay order_..., Cashfree order id). */
        providerOrderId: text('provider_order_id'),
        /** The gateway's id for the money once it moved. Unique per provider: the idempotency key. */
        providerPaymentId: text('provider_payment_id'),
        providerSubscriptionId: text('provider_subscription_id'),
        /** Set once, by the one conditional UPDATE that wins - what was bought is applied exactly then. */
        fulfilledAt: timestamp('fulfilled_at'),
        failureReason: text('failure_reason'),
        /** Last answer from the gateway, as received. */
        raw: jsonb('raw').$type<unknown>(),
        livemode: boolean('livemode').notNull().default(false),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('payment_provider_payment_uq').on(t.provider, t.providerPaymentId),
        uniqueIndex('payment_provider_order_uq').on(t.provider, t.providerOrderId),
        index('payment_account_created_idx').on(t.accountId, t.createdAt),
        index('payment_status_idx').on(t.status),
        index('payment_provider_sub_idx').on(t.provider, t.providerSubscriptionId),
    ],
)

export const CREDIT_ENTRY_KINDS = ['grant', 'purchase', 'spend', 'refund', 'expiry'] as const
export type CreditEntryKind = (typeof CREDIT_ENTRY_KINDS)[number]

export const creditLedger = pgTable(
    'credit_ledger',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        accountId: text('account_id').notNull().references(() => billingAccount.id, { onDelete: 'cascade' }),
        kind: text('kind').$type<CreditEntryKind>().notNull(),
        /** Signed MICRO-credits: + for grant / purchase / refund, - for spend / expiry. */
        amountMicro: bigint('amount_micro', { mode: 'number' }).notNull(),
        /** One row per real-world event: `purchase:<paymentId>`, `spend:<messageId>`, `grant:<uuid>`. */
        idempotencyKey: text('idempotency_key').notNull(),
        /** What it was for, in words ("Pro plan, 3 months", "AI chat turn"). */
        description: text('description'),
        paymentId: text('payment_id').references(() => payment.id, { onDelete: 'set null' }),
        /** Who made a manual grant (admin_access.id) - null for everything automatic. */
        grantedBy: text('granted_by'),
        /** The cost that was spent, millionths of a USD (spend rows only). */
        costMicroUsd: integer('cost_micro_usd'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('credit_ledger_idempotency_uq').on(t.idempotencyKey),
        index('credit_ledger_account_created_idx').on(t.accountId, t.createdAt),
        index('credit_ledger_kind_idx').on(t.kind),
    ],
)
