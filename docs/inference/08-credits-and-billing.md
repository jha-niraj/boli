# 08 - Credits and billing

> **Status: written from the design on 2026-11-24, before the code was finished - verify every command against the
> code before relying on it.** Source of truth: `plan/main/platform/platform-v0.md` (Decisions Q5-Q10, Q47-Q49,
> Contract "Units" and "Spending"). Prices and units come from `packages/boli/src/boli.ts` (`@repo/boli`); tables from
> `packages/db/src/schema/billing.ts` and `platform.ts`. **(design)** = what the plan says the code will do;
> **(open)** = not settled yet.

**Gets you:** a prepaid credit system for a model API: a free grant on sign-up, a price per token, an exact cost for
every call, a ledger that can always be audited, a cached balance that never drifts from it, and top-ups through a
payment gateway (eSewa / Khalti test mode for Boli).

## Prerequisites

- A `billing_account` per user and an append-only `credit_ledger` (Boli already had both; see step 3).
- 07's gateway calls `chargeInference` after every model call; Kura (the chat page) calls the same function.
- Payments package with eSewa and Khalti (`packages/payments/src/esewa.ts`, `khalti.ts`) for step 7.

## The decisions (plan)

| # | Decision |
|---|---|
| Q5 | **1 credit = Rs 1 (NPR).** NPR only (Q48). |
| Q6 | **100 credits once, on email verification.** Google sign-ups arrive verified, so they get it at creation. |
| Q7 | boli-chat: **2 credits per 1M input tokens, 6 per 1M output tokens.** Thinking tokens billed as output. To be revisited after measuring the real cost of serving (not measured yet). |
| Q8 | Kura chats cost the same as the API. |
| Q9 | At zero: API 402 `insufficient_quota`; Kura shows "Add credits". A request already running finishes. |
| Q10 | Credits never expire. |
| Q47 | Add credits: amount with - / +, chips +100 / +500 / +1,000; pay through eSewa / Khalti sandbox. |
| Q49 | Billing page: balance, Add credits, ledger of purchases and grants, spends summed per day. |

In `@repo/boli`: `MICRO_PER_CREDIT = 1_000_000`, `WELCOME_CREDITS = 100`, `ADD_CREDIT_CHIPS = [100, 500, 1000]`,
`ADD_CREDITS_MIN = 100`, `ADD_CREDITS_MAX = 100_000`, `BOLI_CHAT.pricePerMillion = { input: 2, output: 6 }`,
`costMicro()`, `formatCredits()`, `formatRupees()`.

## Steps

### 1. Store money as integer micro-credits

One call costs a few thousandths of a credit. A typical short call (step 2) is 0.0015 credits. Stored as whole
credits it rounds to 0 and is free; stored as a float, thousands of additions drift (`0.1 + 0.2 !== 0.3`).

So every amount is an **integer number of micro-credits** (1 credit = 1,000,000 micro-credits, written µcr):

| Thing | Column | Unit |
|---|---|---|
| Cached balance | `billing_account.balance_micro` (bigint) | µcr |
| Ledger row | `credit_ledger.amount_micro` (bigint, signed) | µcr, + grant / purchase / refund, - spend / expiry |
| One call | `inference_request.cost_micro` (bigint) | µcr |

`bigint(..., { mode: 'number' })` returns a JS number. That is exact up to 2^53 µcr, about 9 billion credits, far
above `ADD_CREDITS_MAX`. The old whole-credit columns (`credit_balance`, `amount`) are not used for Boli.

**The neat part:** because 1 credit = 1,000,000 µcr and prices are "credits per 1,000,000 tokens", **the price per 1M
tokens is also the price in µcr per token.** 2 credits per 1M input tokens = 2 µcr per input token.

**Verify:** `\d billing_account` shows `balance_micro bigint not null default 0`; `\d credit_ledger` shows
`amount_micro bigint not null` and a unique index on `idempotency_key`.

### 2. The cost of one call

From `@repo/boli`:

```ts
export function costMicro(model: BoliModel, inputTokens: number, outputTokens: number): number {
    const raw = inputTokens * model.pricePerMillion.input + outputTokens * model.pricePerMillion.output
    return raw > 0 ? Math.ceil(raw) : 0
}
```

`inputTokens` = upstream `usage.prompt_tokens`; `outputTokens` = `usage.completion_tokens`, which already includes
thinking tokens. With whole-number prices the `Math.ceil` changes nothing; it is there so a fractional price can never
round a real call down to free.

**Worked examples (boli-chat, 2 µcr per input token, 6 µcr per output token):**

| Call | Input | Output | Cost µcr | Credits (= Rs) |
|---|---|---|---|---|
| Short question, short answer | 300 | 150 | 300x2 + 150x6 = **1,500** | 0.0015 |
| Shaped like the 03 tests (129-token prompt, 44-token answer) | 129 | 44 | 258 + 264 = **522** | 0.000522 |
| The plan's example | 1,200 | 200 | 2,400 + 1,200 = **3,600** | 0.0036 |
| Think on: 150 visible + 600 thinking tokens | 300 | 750 | 600 + 4,500 = **5,100** | 0.0051 |
| Full context, default max answer (8,192 context, 1,024 out) | 7,168 | 1,024 | 14,336 + 6,144 = **20,480** | 0.02048 |
| The 07 rate-limit test call (`max_tokens: 1`, "hi") | about 10 | 1 | about 26 | 0.000026 |

**What 100 free credits (100,000,000 µcr) buy:**

- 100,000,000 / 1,500 = **66,666** short calls like the first row.
- 50,000,000 input tokens alone, or 16,666,666 (about 16.7M) output tokens alone (the plan's "Rs 100 is about 50M
  input or about 16M output").
- At the 30 requests/minute limit, 66,666 calls take at least 37 hours of non-stop calling.

(open) Whether llama-server's `prompt_tokens` counts tokens reused from its cache (03 measured a repeated prompt
prefilling 5 tokens instead of 129). v0 bills `prompt_tokens` as reported, with no cached-input price (Sarvam has
one). Check what your build reports before you advertise a cache discount.

**Verify** (node, prints numbers only):

```bash
node -e 'const c=(i,o)=>Math.ceil(i*2+o*6);console.log(c(300,150),c(1200,200),c(300,750),Math.floor(1e8/c(300,150)))'
```

Expected: `1500 3600 5100 66666`.

### 3. The ledger, and a cached balance moved in the same statement

Rules (already in `packages/billing/src/ledger.ts` and the billing schema comment):

- `credit_ledger` is **append-only**. Every change to money is a row: `grant`, `purchase`, `spend`, `refund`,
  `expiry`. Nothing is updated or deleted.
- Each row has an **idempotency key**, unique: one real-world event = one key. A second insert with the same key
  inserts nothing.
- `billing_account.balance_micro` is a **cache** of `sum(amount_micro)`, moved in the **same SQL statement** as the
  ledger insert (a CTE), only when the insert happened:

```sql
WITH ins AS (
    INSERT INTO credit_ledger (id, account_id, kind, amount_micro, idempotency_key, description, created_at)
    VALUES ($id, $account, $kind, $amountMicro, $key, $description, now())
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING amount_micro
)
UPDATE billing_account
   SET balance_micro = balance_micro + (SELECT amount_micro FROM ins), updated_at = now()
 WHERE id = $account AND EXISTS (SELECT 1 FROM ins)
RETURNING balance_micro;
```

No row returned = the key was already used = nothing changed. A retry is always safe.

Why one statement: `db.transaction()` throws on the neon-http driver (`packages/db/src/client.ts`), and two separate
statements can be split by a crash, leaving the cache wrong. The existing `addCredits` does exactly this with the old
whole-credit columns; Boli's version uses `amount_micro` / `balance_micro` (design: `credits.ts`).

| Event | kind | Key | amount_micro |
|---|---|---|---|
| Welcome grant | `grant` | `welcome:<accountId>` | +100,000,000 |
| Purchase | `purchase` | `purchase:<paymentId>` | + credits x 1,000,000 |
| One model call | `spend` | `spend:<inferenceRequestId>` | - cost_micro |
| Admin grant | `grant` | `grant:<uuid>` (granted_by set) | + amount |

(open) The plan says spends are "summed per day for the Billing ledger view (query, not rows)" and also that
`chargeInference` writes "a ledger spend row". This doc follows the reading that keeps the balance equal to the ledger
sum: **one spend row per call**, and the Billing page **groups them by day in a query** (no daily summary rows are
written). Confirm against `credits.ts`.

**Verify (the invariant, any time):**

```sql
SELECT a.id, a.balance_micro, COALESCE(sum(l.amount_micro), 0) AS ledger_sum
  FROM billing_account a LEFT JOIN credit_ledger l ON l.account_id = a.id
 GROUP BY a.id HAVING a.balance_micro <> COALESCE(sum(l.amount_micro), 0);
```

Expected: **no rows**. Any row is a bug (or a test that changed the balance by hand, like 07's zero-balance check).

### 4. Charging a call (summary; mechanics in 07 step 11)

`chargeInference(row)`: one `db.batch` with the `inference_request` insert (`ON CONFLICT (id) DO NOTHING`) and the
statement above with `kind='spend'`, `amount=-costMicro`, key `spend:<requestId>`. Inline, never in `after()` or
`waitUntil`. The balance may end slightly below zero after the last call that was already running (Q9); the next call
gets 402.

### 5. The welcome grant on verification (design: `grantWelcomeCredits`)

- **Email + password:** Better Auth's `emailVerification.afterEmailVerification(user)` in `packages/auth/src/server.ts`.
- **Google:** `databaseHooks.user.create.after(u)` when `u.emailVerified` is true (Google accounts are verified at
  creation). The same two hooks already send the welcome email, so the grant goes next to it.
- `grantWelcomeCredits(userId)`: get or create the account, then the ledger statement with `kind='grant'`,
  `amount_micro = WELCOME_CREDITS x MICRO_PER_CREDIT`, key `welcome:<accountId>`. Returns `{ applied }`.

Why the key: a user can verify, sign in with Google later on the same address (account linking is on), or the hook
can be retried. Every path calls the same function; the key makes the second call a no-op.

**Await it.** The welcome email in those hooks runs through `inBackground(...)`; the grant must not. Money is inline.

**Trap in the existing code:** `getOrCreateAccount` in `packages/billing/src/ledger.ts` grants
`PLANS.free.monthlyCredits` (500, whole credits, key `welcome:<id>`) when it **creates** an account. If that stays, the
first call to `accountForUser` (for example opening the Billing page before verifying) grants credits the plan does
not intend, and because it uses the **same key** `welcome:<accountId>`, it would block the real 100-credit grant.
Boli's account creation must not grant; only `grantWelcomeCredits` does. Check this first when verifying.

**Verify:**

1. Sign up with a new email; before verifying: `balance_micro` is 0 (or no account row yet).
2. Click the verification link: `balance_micro = 100000000`; one ledger row `grant`, key `welcome:<accountId>`.
3. Call `grantWelcomeCredits` again for the same user (or verify again): `{ applied: false }`, still one row.
4. Google sign-up with a fresh address: 100,000,000 at once.
5. The invariant query in step 3 returns no rows.

### 6. Showing the balance

`formatCredits(micro)` shows 2 decimals; `formatRupees` prefixes `Rs `. Rs and credits are the same number.

Trap: **2 decimals hide small calls.** 100,000,000 - 1,500 = 99,998,500 µcr displays as `100.00`. Measured with
`toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`: 99,998,500, 99,996,400 and
99,995,000 all display `100.00`; 99,960,000 displays `99.96`. A new user's first few calls do not move the shown balance.
Show per-call cost with more precision (in the Usage request log or the playground's per-reply line) so people can see
that metering works. (open) The exact format for per-call cost is the pages' decision.

### 7. Buying credits: eSewa and Khalti test mode (design: `actions/billing.action.ts`)

Flow, built on the existing payments package:

1. The dialog picks an amount: whole credits, `ADD_CREDITS_MIN` (100) to `ADD_CREDITS_MAX` (100,000), chips 100 / 500
   / 1,000. Validate on the server too.
2. Server action creates a `payment` row (pending) with the amount in **paisa** (Rs 100 = 10,000 paisa) and starts the
   gateway checkout:
   - **eSewa ePay v2:** a signed form (HMAC-SHA256 over `total_amount,transaction_uuid,product_code`) that the browser
     posts to `rc-epay.esewa.com.np` in test mode. Test credentials are eSewa's public ones, written in the header
     comment of `packages/payments/src/esewa.ts`. Env: `ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY`, `ESEWA_ENV` (not
     `live` = sandbox).
   - **Khalti ePayment v2:** initiate returns a `pidx` and a payment URL on `dev.khalti.com`. Env: `KHALTI_SECRET_KEY`
     (from a Khalti sandbox merchant account), `KHALTI_ENV` (not `live` = sandbox).
3. The buyer returns to our URL. **The return is a hint only.** The server asks the gateway (eSewa status check,
   Khalti lookup) and only "paid for exactly the stored amount" counts.
4. Fulfil once: a conditional update sets `payment.fulfilled_at` (only one caller wins), then the ledger statement
   with `kind='purchase'`, `amount_micro = credits x 1,000,000`, key `purchase:<paymentId>`. A return and a re-check
   racing on the same payment produce one row.

The person pastes the sandbox keys into `.env.local`; never print them.

**Verify:**

1. Add 100 credits with eSewa test mode: balance goes up by exactly 100,000,000 µcr; one `purchase` row.
2. Reload the success page (repeat the return): no second row.
3. Cancel at the gateway: payment stays not paid, no ledger row.
4. Same with Khalti.
5. Invariant query: no rows.

### 8. The Billing page's ledger view

Purchases and grants are listed row by row; spends are grouped per day in the query:

```sql
SELECT date_trunc('day', created_at) AS day, kind, count(*) AS rows, sum(amount_micro) AS amount_micro
  FROM credit_ledger
 WHERE account_id = $1
 GROUP BY 1, 2
 ORDER BY 1 DESC;
```

(open) `date_trunc` uses the database's time zone (UTC on Neon by default); Nepal is UTC+5:45. Decide whether "a day"
is a UTC day or a Nepal day, and use `AT TIME ZONE 'Asia/Kathmandu'` if it is Nepal's.

## Traps

- **Floats or whole credits for money.** Integers in micro-credits only.
- **Moving the balance in a second statement.** It drifts on the first crash. CTE, one statement.
- **No idempotency key, or a reused one.** Retries double-charge; a shared key (`welcome:` from the old code path)
  silently blocks a real grant.
- **Granting in a background job.** The grant and every charge are awaited.
- **Trusting the payment return URL.** Ask the gateway; match the amount.
- **2-decimal display.** Small calls look free; show per-call cost with more precision somewhere.
- **Prices set before costs are measured.** Q7 prices are a starting point; the real cost per token of the host
  (Unit 3 of the course, doc 06) is not measured yet.

## Done when

- Steps 5 and 7 verify lists pass, the invariant query returns no rows after a sign-up, a purchase and a few dozen
  calls, and every (design) / (open) mark in this doc is replaced by what the code does.
