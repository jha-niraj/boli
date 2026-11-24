# Payments and billing - five gateways, plans, credits

| | |
|---|---|
| **App / module** | `main/billing` (+ `packages/payments`, `packages/billing`, `admin/billing`) |
| **Status** | Built, not verified (no typecheck, no sandbox run yet) |
| **Opened** | 2026-11-23 |
| **Last updated** | 2026-11-23 |
| **Files** | packages/payments/src/*, packages/billing/src/{plans,ledger,checkout,overview,reminders,index}.ts, packages/db/src/schema/{billing,payments}.ts, packages/db/scripts/billing-2026-11-23.sql, apps/main/app/api/payments/[provider]/[...action]/route.ts, apps/main/actions/billing.action.ts, apps/main/schemas/billing.ts, apps/main/app/(main)/settings/billing/**, apps/main/app/(main)/checkout/[paymentId]/**, apps/main/app/api/ai/chat/route.ts, apps/main/app/api/cron/[job]/route.ts, apps/admin/actions/billing.action.ts, apps/admin/app/(main)/billing/** |

## What was asked

Owner pickers 2026-11-23: eSewa + Khalti (NPR), Razorpay + Cashfree (INR), Stripe (cards) behind one interface in
`@repo/payments`; checkout offers only providers matching the currency with keys set. Prepaid Free / Pro periods
(1 / 3 / 12 months, reminder before the end), auto-renew where the gateway supports it, credit top-ups spent by AI.
Billing owner = the user today, shaped for a workspace owner later. Test mode by default.

## What "done" looks like

A user picks a currency, buys Pro for 1/3/12 months or monthly auto-renew, or a credit pack, pays on the gateway,
lands on /checkout/<id> which says verifying / paid / failed / cancelled; the payment applies ONCE whether the return
or the webhook arrives first. With CREDITS_ENFORCED=1 an AI turn needs credits and spends its metered cost. Admins
see payments and subscriptions at /billing and grant credits with an audit row.

## Open questions

- Cashfree PERIODIC subscriptions: assumed the authorization charge (= one month, not refunded) pays the first period
  and Cashfree raises later charges itself. Unverified without a sandbox.
- Free plan credits are a one-time starter grant (500), not a monthly refill.

---

## Tasks

- [ ] **1. Schema: billing_account, subscription, payment, credit_ledger, payment_provider_plan**
  - Acceptance: tables in schema files; SQL script runs twice cleanly on staging.
  - Verified: _(not run - owner runs the script / db:push)_
- [ ] **2. @repo/payments interface + five providers + registry**
  - Verified: _(not typechecked; no sandbox keys)_
- [ ] **3. @repo/billing plans, ledger, checkout/confirm, webhooks, reminders cron**
  - Verified: _(not typechecked)_
- [ ] **4. Dispatcher route, actions, /settings/billing, /checkout/[paymentId]**
  - Verified: _(not typechecked, not opened in a browser)_
- [ ] **5. Chat route: 402 out of credits + spend after the turn**
  - Verified: _(not run)_
- [ ] **6. Admin /billing: payments, subscriptions, recheck, grant credits + audit**
  - Verified: _(not run; route needs adding to admin nav)_
- [-] **7. /api/webhooks/stripe** - folded into /api/payments/stripe/webhook and deleted (one dispatcher route).
- [ ] **8. Billing payment rows open a right sheet (`/billing?checkout=<id>`), not /checkout/<id>** (2026-11-25)
  - Asked: a payment row on Billing opens the keep-open sheet with the id in the URL (deep-linkable, a reload reopens
    it, closing removes the param). /checkout/<id> stays: the gateways return there.
  - Done: one result card `components/platform/payment-result.tsx` (status, Check again, auto checks) used by the page
    and by `billing/_components/payment-sheet.tsx`; one access check `lib/platform/payment.ts` (`findViewablePayment`)
    used by the page, the sheet's read `getPaymentDetail` (stored row only, never the gateway) and `checkPayment`.
    Rows carry `data-sheet-keep-open` (a press swaps the sheet); the id clears in `onExitComplete`; `?checkout=` is
    written with `history.replaceState` and followed through `useSearchParams`. "Try again" in the sheet closes it
    and opens Plans; the page's "Try again" now links to `/billing?tab=plans`.
  - Audit of other list-to-detail navigations in apps/main: none left to convert (Usage, Home activity and Members
    already open sheets; Kura chats are full pages; notification links go to other modules; Jawaf out of scope).
  - Verified: _(not typechecked, not opened in a browser - the lead runs both)_
