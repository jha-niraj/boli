// @repo/billing - the billing account and the credit ledger (server only).
//
// Units: integer MICRO-credits everywhere (Boli: 1 credit = Rs 1 = 1,000,000 micro-credits).
// The account is per USER today (`ownerType 'user'`, `ownerId = user.id`); a workspace owner is a new ownerType, not a
// new table. The ledger is append-only; the balance is its sum, cached on billing_account and moved in the SAME SQL
// statement as the ledger insert (a CTE), so a retry (same idempotency key) inserts nothing and moves nothing.
import { and, db, desc, eq, gte, sql, type SQL } from '@repo/db'
import { billingAccount, creditLedger, type BillingOwnerType, type CreditEntryKind } from '@repo/db/schema'
import { MICRO_PER_CREDIT, WELCOME_CREDITS } from './plans'

export type BillingAccountRow = typeof billingAccount.$inferSelect

/** The account for an owner, created on first use (safe under a race: unique owner index + re-read). No credits are
 * added here: the welcome grant is `grantWelcome`, called when the email is verified. */
export async function getOrCreateAccount(owner: { type: BillingOwnerType; id: string; contactUserId?: string | null }): Promise<BillingAccountRow> {
    const find = () => db.select().from(billingAccount)
        .where(and(eq(billingAccount.ownerType, owner.type), eq(billingAccount.ownerId, owner.id))).limit(1)
    const found = await find()
    if (found[0]) return found[0]
    const inserted = await db.insert(billingAccount)
        .values({ ownerType: owner.type, ownerId: owner.id, contactUserId: owner.contactUserId ?? (owner.type === 'user' ? owner.id : null) })
        .onConflictDoNothing()
        .returning()
    const row = inserted[0] ?? (await find())[0]
    if (!row) throw new Error(`billing_account for ${owner.type}/${owner.id} neither inserted nor found`)
    return row
}

/** The signed-in user's own account (the only owner type in use today). */
export function accountForUser(userId: string): Promise<BillingAccountRow> {
    return getOrCreateAccount({ type: 'user', id: userId, contactUserId: userId })
}

export interface LedgerEntryInput {
    kind: CreditEntryKind
    /** Signed MICRO-credits (integer). */
    amountMicro: number
    /** One real-world event = one key. A repeat inserts nothing. */
    key: string
    description?: string | null
    paymentId?: string | null
    grantedBy?: string | null
}

/**
 * The ledger insert + balance move as ONE statement, for callers that put it inside a `db.batch` with other writes
 * (the inference charge). RETURNING `balance_micro` only when the row was new.
 */
export function ledgerEntrySql(accountId: string, e: LedgerEntryInput): SQL {
    if (!Number.isSafeInteger(e.amountMicro)) throw new Error('A credit amount must be a whole number of micro-credits')
    return sql`
        WITH ins AS (
            INSERT INTO credit_ledger (id, account_id, kind, amount_micro, idempotency_key, description, payment_id, granted_by, created_at)
            VALUES (${crypto.randomUUID()}, ${accountId}, ${e.kind}, ${e.amountMicro}, ${e.key}, ${e.description ?? null},
                    ${e.paymentId ?? null}, ${e.grantedBy ?? null}, now())
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING amount_micro
        )
        UPDATE billing_account
           SET balance_micro = balance_micro + (SELECT amount_micro FROM ins), updated_at = now()
         WHERE id = ${accountId} AND EXISTS (SELECT 1 FROM ins)
        RETURNING balance_micro
    `
}

/**
 * Read `balance_micro` from a ledgerEntrySql result (`db.execute` result, a `db.batch` item, or its rows); null = the
 * key was already used (nothing changed).
 */
export function appliedBalance(result: unknown): number | null {
    const rows: unknown[] = Array.isArray(result)
        ? result
        : typeof result === 'object' && result !== null && 'rows' in result && Array.isArray(result.rows) ? result.rows : []
    const row = rows[0] as { balance_micro?: number | string | null } | undefined
    return row && row.balance_micro !== undefined && row.balance_micro !== null ? Number(row.balance_micro) : null
}

async function balanceOfAccount(accountId: string): Promise<number> {
    const [acct] = await db.select({ balance: billingAccount.balanceMicro }).from(billingAccount).where(eq(billingAccount.id, accountId)).limit(1)
    return acct?.balance ?? 0
}

/**
 * Append a ledger row and move the cached balance in ONE statement. Returns `{ applied: false }` when the key was
 * already used (a retry, a webhook racing a return) - nothing changed. `balanceMicro` is the balance after.
 */
export async function addCredits(accountId: string, e: LedgerEntryInput): Promise<{ applied: boolean; balanceMicro: number }> {
    const res = await db.execute(ledgerEntrySql(accountId, e))
    const after = appliedBalance(res.rows)
    if (after !== null) return { applied: true, balanceMicro: after }
    return { applied: false, balanceMicro: await balanceOfAccount(accountId) }
}

/** Whole credits -> micro-credits (purchases, grants). */
export function creditsToMicro(credits: number): number {
    if (!Number.isInteger(credits)) throw new Error('A credit amount must be a whole number')
    return credits * MICRO_PER_CREDIT
}

/**
 * The one-time welcome grant (WELCOME_CREDITS, keyed `welcome:<accountId>`): called inline when an email is verified
 * and when a user is created already verified (Google). Safe to call any number of times.
 */
export async function grantWelcome(userId: string): Promise<{ applied: boolean; balanceMicro: number }> {
    const account = await accountForUser(userId)
    return addCredits(account.id, {
        kind: 'grant',
        amountMicro: creditsToMicro(WELCOME_CREDITS),
        key: `welcome:${account.id}`,
        description: `Welcome credits (${WELCOME_CREDITS})`,
    })
}

/** Repair tool: set the cached balance to the ledger's sum (should never be needed; safe to run any time). */
export async function recomputeBalance(accountId: string): Promise<number> {
    const res = await db.execute(sql`
        UPDATE billing_account
           SET balance_micro = COALESCE((SELECT sum(amount_micro) FROM credit_ledger WHERE account_id = ${accountId}), 0), updated_at = now()
         WHERE id = ${accountId}
        RETURNING balance_micro
    `)
    return appliedBalance(res.rows) ?? 0
}

/** CREDITS_ENFORCED=1 (or true): a model call needs a positive balance. Blank / 0 = calls are still charged but never
 * refused. */
export function creditsEnforced(): boolean {
    const v = (process.env.CREDITS_ENFORCED ?? '').trim().toLowerCase()
    return v === '1' || v === 'true'
}

/** The person's balance in micro-credits; an account that does not exist yet is 0 (a read never creates one). */
export async function balanceMicroForUser(userId: string): Promise<number> {
    const [acct] = await db.select({ balance: billingAccount.balanceMicro }).from(billingAccount)
        .where(and(eq(billingAccount.ownerType, 'user'), eq(billingAccount.ownerId, userId))).limit(1)
    return acct?.balance ?? 0
}

/** Whether the person may start a model call: always true when credits are not enforced, else balance > 0. */
export async function hasCredits(userId: string): Promise<boolean> {
    if (!creditsEnforced()) return true
    return (await balanceMicroForUser(userId)) > 0
}

/**
 * Spend micro-credits. `ref` names the event - the idempotency key `spend:<ref>`, so a retried write never charges
 * twice. Runs INLINE (never `after()`); the balance may go below zero by one call's cost, and the next call is refused
 * when credits are enforced. The inference charge uses its own batch (apps/main lib/platform/credits.ts).
 */
export async function spendCredits(userId: string, amountMicro: number, ref: string, description = 'Model call'): Promise<{ spentMicro: number; balanceMicro: number }> {
    const micro = Math.max(0, Math.ceil(amountMicro))
    const acct = await accountForUser(userId)
    if (micro === 0) return { spentMicro: 0, balanceMicro: acct.balanceMicro }
    const r = await addCredits(acct.id, { kind: 'spend', amountMicro: -micro, key: `spend:${ref}`, description })
    return { spentMicro: r.applied ? micro : 0, balanceMicro: r.balanceMicro }
}

/** Start of the current UTC month. */
export function startOfUtcMonth(at: Date = new Date()): Date {
    return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1))
}

/** Micro-credits spent since the start of this UTC month (a positive number). */
export async function creditsSpentThisMonth(accountId: string): Promise<number> {
    const [row] = await db.select({ total: sql<string | null>`sum(${creditLedger.amountMicro})` }).from(creditLedger)
        .where(and(eq(creditLedger.accountId, accountId), eq(creditLedger.kind, 'spend'), gte(creditLedger.createdAt, startOfUtcMonth())))
    return Math.abs(Number(row?.total ?? 0))
}

export type LedgerRow = typeof creditLedger.$inferSelect

/** The latest ledger rows, every kind (spends are one row per model call). */
export async function recentLedger(accountId: string, limit = 50): Promise<LedgerRow[]> {
    return db.select().from(creditLedger).where(eq(creditLedger.accountId, accountId)).orderBy(desc(creditLedger.createdAt)).limit(limit)
}

export interface DailySpend {
    /** UTC day, `YYYY-MM-DD`. */
    day: string
    /** Positive micro-credits spent that day. */
    spentMicro: number
    calls: number
}

/** Spends summed per UTC day (the Billing page's ledger shows these instead of one row per call). Newest first. */
export async function dailySpend(accountId: string, days = 30): Promise<DailySpend[]> {
    const since = new Date(Date.now() - days * 86_400_000)
    const rows = await db.select({
        day: sql<string>`to_char(date_trunc('day', ${creditLedger.createdAt}), 'YYYY-MM-DD')`,
        total: sql<string>`sum(${creditLedger.amountMicro})`,
        calls: sql<string>`count(*)`,
    }).from(creditLedger)
        .where(and(eq(creditLedger.accountId, accountId), eq(creditLedger.kind, 'spend'), gte(creditLedger.createdAt, since)))
        .groupBy(sql`1`)
        .orderBy(sql`1 desc`)
    return rows.map((r) => ({ day: r.day, spentMicro: Math.abs(Number(r.total)), calls: Number(r.calls) }))
}
