# Admin v1 - module rail, Jawaf demos and claims, inbox

| | |
|---|---|
| **App / module** | `admin/*` (+ `main/jawaf` claim flow, `web/contact`) |
| **Status** | In progress |
| **Opened** | 2026-11-25 |
| **Last updated** | 2026-11-25 |
| **Files** | per task |

## What was asked

Owner, 2026-11-25: start admin properly - the Jawaf admin features (demo bots for prospects, claim transfer, all bots,
demo tracker) and bring the whole admin up to the main app's standard, with the same sidebar and module-wise sections.

## Decisions (owner picker answers, 2026-11-25)

**Shell and look**
- Same product rail as main: the icon rail = admin MODULES, the sidebar = that module's pages, Sarvam-style collapse.
  Modules: Home (on the mark), People (Users, Admins, Access, Audit log), Money (Billing, Payments, Credits, Reports),
  Jawaf (Demos, All bots, Claims), Communications (Inbox, Announcements, Broadcasts), System (Settings, Health).
- Everything at main's standard: StatBand, tables with sticky headers and edge-to-edge lines, right sheets for details
  (non-modal, swap), loading skeletons shaped like each page, Boli Dhaka empty states, light AND dark both great.
- Admin Home: StatBand (new users 7 days, active workspaces, credits sold this month, Jawaf bots live, demos by stage),
  Needs attention (pilot requests unanswered, demo follow-ups due, stuck Jawaf jobs, payments waiting), charts
  (sign-ups per day, credits spent per day by Kura / API / Jawaf, 30 days), recent admin activity (audit, 10).

**Jawaf in admin**
- Demo bots live in ONE "Boli Demos" workspace owned by the super admin, every admin a member; its credits pay for demo
  answers (granted from admin).
- New demo: admin form (business, website, type, contact person, city) -> creates the bot in Boli Demos and runs the
  same crawl / read / draft; the admin reviews, tests and goes live in the Jawaf dashboard in main (one Jawaf UI).
- Claim: one-time claim link, 30 days, shown once; the business signs up / signs in and the bot moves to their
  workspace with everything; Demo ribbon removed; link dead after use; audited.
- Claim email: NOT automatic - an admin presses Send; from hello@bolihq.com (RESEND_FROM_EMAIL), Nepali + English,
  reply-to the owning admin; we track Sent, Link opened, Claimed.
- Demo tracker per prospect: business, sector, city, contact name, phone, email; stage Sent / Met / Pilot / Paying /
  Lost + next step date; notes; owning admin; live numbers from the bot (questions, answer rate, last visit).
- All bots overview: customer bots show NUMBERS ONLY (owner workspace, status, pages, answers this month, answer rate,
  credits used, last active) - never conversation text. Boli Demos bots show everything. Details open in a right
  sheet; a demo bot's conversation opens as a page /jawaf/conversations/<id> (transcript with sources, the visitor's
  contact card - who we are talking to - channel, time, ratings, link back to the prospect).
- Bot tools: pause / resume the public page (page says it is paused; owner notified; audited), raise limits, grant
  credits to its workspace, open its public page, health panel (last read, failed pages, stuck jobs, embedding status,
  answer rate this week, top unanswered; Re-read now / Retry failed), quality check (run the eval set from admin),
  copy demo message (Nepali + English with bot + claim link), change owner manually by email (audited).
- Nav: a Jawaf module with Demos, All bots, Claims; a new `jawaf` permission module (read / write) in the access matrix.

**Inbox**
- Communications > Inbox: contact messages (with a Jawaf pilot filter) and app feedback with ratings, right sheets; a
  pilot request has "Create demo" that pre-fills the demo form. The site's contact form, for the Jawaf topic, asks for
  what a demo needs (business name, website, type, city, phone) so the demo can be built from it.

---

## Tasks

- [ ] **1. Admin shell + standard** - module rail like main, Home, existing pages to main's standard.
  - Verified: not yet - code written 2026-11-25, no typecheck / browser pass (the lead runs task 4).
  - Shell: `AdminShell` now passes `productRail` to the shared `AppShell` (same ProductShell as main: 56px icon rail
    widening on hover, module sidebar, Sarvam collapse to the 64px compact rail on the button or Cmd/Ctrl+\, cookie
    `boliadmin_rail_hidden` read by the server layout, phone bottom bar + "Modules" sheet). Brand = Boli mark + "Boli
    Admin" -> /home; no workspace switcher, no credits card; foot = bell + account row (menu above).
  - packages/ui (additive, main unchanged): `ProductRailConfig.workspaces` / `onSwitchWorkspace` optional (empty = no
    switcher); `productsLabel` (default "Products"; admin "Modules") for the rail's aria-label and the compact
    Modules menu; the foot's Feedback + Notifications grid is two columns only when `footerExtra` is given (admin has
    none, so the bell takes the full row). apps/main/CLAUDE.md still says "apps/admin (the classic AppShell) are
    unchanged" - stale now, out of this task's boundary (owner / lead to fix).
  - Modules (lib/navigation.ts `adminModulesFor`, filtered by `adminCan` read): People (Users /users, Sign-ups
    /analytics, Admins /admins, Access /admins/access, Audit log /admins/audit), Money (Billing /billing, Payments
    /billing/payments, Credits /billing/credits, Reports: Admin activity /reports/adminactivity, Financial
    /reports/financial), Jawaf (Demos /jawaf/demos, All bots /jawaf/bots, Claims /jawaf/claims), Communications
    (Overview /communications, Inbox /communications/inbox, Announcements, Broadcasts), System (Settings
    /system/settings, Health /system/health). Home, /admins/profile and /accessdenied have no sidebar.
  - Permission `jawaf` (read / write) added to lib/permissions.ts (`ADMIN_MODULES` gained an optional `levels`; the
    access matrix shows "-" for Delete / Full on Jawaf); SUPER_ADMIN defaults include it.
  - Billing tabs split into pages: /billing = StatBand + paid plans (Grant), /billing/payments = the payments table +
    payment sheet (`?status=` kept with replaceState; Home links `?status=pending`), /billing/credits = every ledger
    grant (new `getCreditGrants` in actions/billing.action.ts).
  - Home: lib/home-data.ts (server-only, one db.batch per permission): new users 7 days, active workspaces 30 days
    (Kura/API request or Jawaf answer), credits sold this month (ledger `purchase`, Nepal month), Jawaf bots live
    (non-demo), demos by stage ("Not set up yet" + demo bot count); Needs attention (pending payments, stuck jawaf_job:
    queued 15+ min or running past lease); charts sign-ups and credits spent per Nepal day by Kura / API / Jawaf (30
    days, ResponsiveChart); recent audit (10). Sky glow header (components/brand/sky-glow.tsx), Dhaka-edged cards.
    `actions/home.action.ts` = client refetch.
  - Hooks for the other tasks (in lib/home-data.ts `HomeData`, rendered as "Not set up yet" until non-null):
    `jawaf.demosByStage` (task 2, demo tracker stages), `jawaf.followUpsDue` (task 2, next step date <= today),
    `pilotRequests` (task 3, unanswered Jawaf pilot requests). Health's Retry / Re-read is task 2's bot health panel.
  - Health: /system/health (lib/health-data.ts): database + latency, errors logged 7 days, Jawaf jobs running / queued
    / stuck / failed 24h, table of stuck + failed jobs. Settings keeps its own band.
  - Placeholders (owned by tasks 2 and 3 from here): jawaf/{demos,bots,claims}/_components/<page>-view.tsx and
    <page>-skeleton.tsx, communications/inbox/_components/inbox-view.tsx + inbox-skeleton.tsx; page.tsx + loading.tsx
    are thin shells (`requireAdminPage("jawaf")` / `("communications")`).
  - Tables: new `components/table-card.tsx` (`TableCard`, `TABLE_CARD`, `TABLE_EDGES`): bordered white card, edge to
    edge row lines with 16px on first / last cells; applied to team, access, audit, users, announcements, broadcasts,
    admin activity, financial, billing, payments, credits, health, the permission matrix. /analytics retitled
    "Sign-ups".
- [ ] **2. Jawaf admin** - Boli Demos workspace, demos + tracker, claims + email + tracking, claim flow in main, all
  bots + tools, demo conversation page, permission module.
  - Built (2026-11-25, the task 2 agent; NOT typechecked, built or clicked through - the lead does that):
    - Data: `packages/db/src/schema/jawaf.ts` (jawaf_bot `paused` / `paused_reason` / `paused_at`; tables
      `jawaf_prospect`, `jawaf_claim`; limit overrides already existed as `jawaf_bot.limits`), SQL
      `packages/db/scripts/jawaf-admin.sql`. House: `packages/db/scripts/jawaf-house.mjs` (`pnpm --filter @repo/db
      jawaf:house [--apply]`, reads apps/admin/.env.local for SEED_ADMIN_EMAIL), id in admin_system_settings
      `jawaf.house_workspace_id`, read by `getJawafHouseWorkspaceId()` (@repo/db, `src/jawaf-house.ts`). The bot move
      shared by claim and Change owner: `moveJawafBot()` (@repo/db, `src/jawaf-move.ts`, one db.batch over the 11 tables).
    - Choices: (1) a demo bot is created by admin with a direct insert of the same row main's onboarding makes (+ demo =
      true, no 10-bot cap in the house); the crawl / read / draft runs in main's Jawaf setup when the admin presses
      Open in Jawaf (the bot starts at setup step "pages"; mapping needs Firecrawl, which only main has). (2) What only
      the engine can do (quality check, embedding check, one job slice) goes through main's EXISTING dispatcher as
      `POST /api/jawaf/admin/<eval|health|tick>` with `Bearer JAWAF_ADMIN_SECRET` (new key, added to all six env files
      of main + admin: one value for local + staging, another for production). (3) Open in Jawaf = `GET
      /api/jawaf/open?workspace=&bot=` on main (membership checked, only cookies change); the admin is added to the
      house as a member first. (4) The quality check runs the slug's question set from ml/jawaf-eval/questions
      (`apps/admin/lib/jawaf-eval-sets.ts`, gurukulhq only today) in batches of 3 with progress. (5) "House" bot = in
      Boli Demos OR demo flag (the eval bot sits in the seed admin's own workspace with demo = true).
    - Admin: `lib/jawaf.ts` (reads, privacy line), `lib/jawaf-bridge.ts`, `actions/jawaf/{demos,bots,claims}.action.ts`,
      `schemas/jawaf.ts`, `types/jawaf.ts`, pages `jawaf/{demos,bots,claims}` (page.tsx now seeds initialData),
      `jawaf/conversations/[id]` (403 StatusView for customer bots).
    - Main: `/claim/[token]` (`app/(claim)/claim/[token]`, PUBLIC in middleware), `lib/jawaf/claim.ts`,
      `actions/jawaf/claim.action.ts`, `schemas/jawaf-claim.ts`; paused bot -> "This assistant is paused" on /j/<slug>
      and its api routes refuse; `lib/jawaf/admin-bridge.ts`. Email: `jawafClaimEmail`, `jawafBotPausedEmail`.
    - Ran: jawaf-admin.sql preview, --apply, --apply (11 statements each, no error); jawaf:house preview, --apply
      (created workspace 7990cc3b..., 1 member, setting written), --apply again (everything "exists", no change);
      admin reads against staging (2 bots, health, transcript); a scripted claim of a throwaway demo bot (preview valid
      -> opened -> claimed into the seed admin's personal workspace, 0 child rows left in the house, demo false,
      second claim refused, prospect Sent -> Pilot; bot deleted after); bridge auth (wrong secret refused); eval call
      path returns "offline" (local model servers were down).
    - Open: the public demo ribbon still links to `/signup?intent=claim&bot=<slug>` (no token) - point it at the
      contact page or drop it; the poster page ignores `paused`; new admins after the script need `jawaf:house
      --apply` again (or are added on their first New demo / Open in Jawaf).
  - Verified:
- [ ] **3. Inbox** - contact messages + feedback in admin; richer Jawaf pilot form on the site.
  - Plan (2026-11-25): (a) `contact_message.details` jsonb + `handled_at` / `handled_by` on contact_message and
    feedback, additive SQL `packages/db/scripts/contact-details.sql` (preview, then --apply twice on staging) + schema.
    (b) Site /contact: topic Jawaf shows business name, website (optional), business type (pills from
    `JAWAF_BUSINESS_TYPE_INFO`), city, phone (optional, Nepal 98/97); zod with a Jawaf-only refine; stored in `details`
    as `{ kind: "jawaf_pilot", ... }`; honeypot (`website`) + 5/hour kept, so the business site field is
    `businessWebsite`. (c) Admin /communications/inbox: StatBand, tabs Contact messages / Feedback (?tab=),
    ListToolbar (search + topic / status / date), table in a ring card, sticky header, non-modal swapping sheet with
    mark handled, mailto reply, Create demo -> `/jawaf/demos?new=1&from=<id>`. Actions `actions/inbox.action.ts`
    (communications read / write, audit row in the same batch), reads in `lib/inbox.ts` (server-only), zod in
    `schemas/inbox.ts`, types in `types/inbox.ts`. (d) `getInboxAttention()` in `lib/inbox.ts` for the Home's Needs
    attention.
  - Done (code, 2026-11-25): schema + script; site form (`PillChoices` now serves the topic and the business kind);
    admin `types/inbox.ts`, `schemas/inbox.ts`, `lib/inbox.ts` (`listContactMessages`, `listFeedback`, `inboxStats`,
    `getInboxAttention`), `actions/inbox.action.ts`, inbox `page.tsx` (now reads the first page of both tabs + the band
    on the server), `_components/` inbox-view, contact-sheet, feedback-sheet, inbox-bits, inbox-skeleton.
  - Script output (staging `ep-cold-violet-bigh1how-pooler`): preview listed 5 statements; `--apply` run twice, both
    printed `ran:` for all 5 (idempotent). Read-only check of the raw SQL (filtered counts, handler subquery,
    `details->>'businessName'`) returned rows without error (0 open messages, 1 open feedback).
  - Not verified yet: typecheck, the browser pass (light / dark / 390px) and a real Jawaf pilot submit - task 4.
  - Verified:
- [ ] **4. Typecheck + Chrome pass (light and dark, 390px).**
  - Verified:
- [ ] **5. Fixes from the lead's Chrome pass (2026-11-25).** Code written, NOT typechecked or clicked through (the lead).
  - Demos: `?new=1` opens New demo on load; `?new=1&from=<contactMessageId>` pre-fills it from the message (`details`
    + name / email), read on the server (`demoPrefill` in lib/jawaf.ts, called by page.tsx) - the client fetch
    `getDemoPrefill` is gone. The view drops `new` / `from` / `prospect` with history.replaceState once open.
  - Nepal time: `lib/nepal-time.ts` (day / month starts, day keys, `nepalDaySql`); Sign-ups, Admin activity and the
    Financial report count in Nepal days and say so; `admin-format` and `admin-bits` dates print in Asia/Kathmandu.
  - Financial report: `lib/money-data.ts` `loadFinancialReport` - rupees received (succeeded NPR payments, 30 days +
    all time), credits sold (ledger purchase) vs granted (ledger grant), failed payments of started, credits spent per
    day Kura / API / Jawaf (Home's sources, Home's SpendChart), the payment events table. No USD, no ai_usage_log.
  - Billing: `loadBillingOverview` - band = rupees received / payments / credits sold / credits granted this Nepal
    month; credit packs sold (CREDIT_PACKS + custom top-up, month and all time, counts and rupees); top 10 buying
    workspaces. The plan / subscription reads (`getBillingStats`, `getBillingSubscriptions`) stay as actions, unused.
  - Audit log and Admin activity empty states are BoliEmpty. All bots: band hint "this month, Nepal time"; the sheet's
    Last read = newest of source stamp, read page stamp, finished read job; every number names its window.
  - Verified:
