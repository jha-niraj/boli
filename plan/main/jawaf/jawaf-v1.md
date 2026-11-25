# Jawaf v1 - workspaces, the product rail, and the business answer product

| | |
|---|---|
| **App / module** | `main/jawaf` (+ `main/shell`, `main/workspace`, `admin/*`, `packages/*`) |
| **Status** | In progress |
| **Opened** | 2026-11-25 |
| **Last updated** | 2026-11-25 (Wave 2 tasks 4-7 built) |
| **Files** | grows per wave - each task names its files |

## What was asked

Owner, 2026-11-24/25, after the next-product research (`reports/Boli next product research.md`) and a hands-on look at
Diyo Agent Studio: build Boli's flagship business product - a business's "answer brain" that knows its website, files,
facts and Q&A and answers customers in Nepali, Romanized Nepali and English - reachable by a no-login shareable link
and QR code, a website widget and the API. Restructure the app like Sarvam: a product rail, and each product shows only
its own pages. Teams at the account level. Restyle admin to match and let admin build demo bots for prospects and hand
them over. CRM kept small now. Then demo to 20-30 real businesses.

## Decisions (all from the owner's picker answers, 2026-11-25)

**Names and structure**
- Product name **Jawaf** (जवाफ, answer). Products in the rail: Kura, API, Jawaf, Document AI (Soon), Speech (Soon).
- **Product rail + product sidebar** (Sarvam): a thin icon rail on the far left that expands over the page on hover
  (workspace switcher at top, products, credits pill + account at the bottom); next to it a sidebar with ONLY the open
  product's pages. Account-wide things (credits, Add credits, Billing, profile, bell, sign out) live at the rail bottom.
- After sign-in: the **last product used** (per account); a new account lands on a short "Choose where to start" page.
- **Main Home** becomes the Boli overview: sky gradient header + Dhaka-edged product cards with a pixel scene each,
  credits and spend across products, Get started for new accounts. The API quickstart moves to the API product's Home.
- **API product** pages: Home (quickstart + coding-agent prompt + API numbers), Keys, Models, Usage (API only), Docs link.
- **Kura** sidebar: New chat + chat history (Today / Yesterday / Earlier, search); Settings and Code stay in the right
  column; Kura's usage moves into Kura.

**Accounts and teams**
- **Every user gets a workspace** on sign-up; credits, keys, chats and bots belong to the workspace (billing_account
  already has ownerType 'workspace'). One-time idempotent script moves existing rows.
- People can belong to **several workspaces** - switcher at the top of the hovered rail.
- Roles: **Owner + Member**; members get **per-product access** (Kura / API / Jawaf), and inside a product the access
  options exist from day one (e.g. Jawaf: view, answer questions, edit knowledge, settings) so it is easy to extend.
  Reuse the invite/member code from gurukulhq or synchq (copy, don't import).

**Jawaf - knowledge**
- Onboarding: **full-page setup, skippable** (business type with 5 templates - Education/consultancy, Clinic/hospital,
  Shop, Hotel/travel, Real estate - name, website, tone) with a live preview; skip -> Jawaf Home with a setup banner +
  checklist until done.
- Crawl: **map the site, owner picks pages** (pre-ticked up to the limit), read in the background with live progress.
  Firecrawl (hosted; `packages/webdata`, add synchq's scrapeSite + creditUsage). Re-read **weekly + Train on demand**,
  changes highlighted (new / changed / removed).
- **Review what we found**: a drafted fact sheet (About, Services, Prices and fees as a table, Hours, Location and
  contact, Policies, 5-10 FAQs) the owner edits/approves. Pages are also kept in full for search.
- Sources at launch: website pages (+ add a URL), files (PDF, Word, images - read by **Sarvam** until our own document
  model), Q&A pairs (several phrasings) + CSV import, notes (rich text, the gurukulhq editor) and tables.
- **Layers**: Public (crawled pages) / Business facts (owner sections, always sent, win over pages, prices only from
  here) / Visitor (per conversation, remembered 30 days on the same device) / Live data (later).
- Conflicts: **facts win + "Website disagrees" flag** on the page.
- Changes **auto-apply** (indexed in seconds, "Updating..."), widget look has **Publish**, plus a **Train** button
  for an immediate re-read/re-index.
- Limits per bot: **200 pages, 50 files, 20 MB each** (raise per account from admin).

**Jawaf - answers**
- Model: **boli-chat (Gemma 4 E4B) with code-level guards** - answer only on a strong retrieval match; owner facts
  always included; citations checked against real sources; prices only from the facts table.
- Not found: **say so + contact card** (leave name and number, plus the business's phone/WhatsApp). Never guess.
- **Source chips** under replies (owner can hide on the public page; always in the playground).
- Script: **same as the visitor** (Romanized / Devanagari / English / mixed).
- Tone: presets (Friendly, Professional, Casual, Formal; Short / Balanced / Detailed) + own instructions.
- Embeddings: **BGE-M3** (open). Dev/pilots: a second local llama-server with bge-m3 GGUF; production: Cloudflare
  Workers AI bge-m3 (same vectors). One adapter. Stored in **pgvector on Neon** (HNSW, 1024 dims) + Postgres full-text
  / trigram for keywords, merged by reciprocal rank fusion; Romanized queries searched as typed AND transliterated.

**Jawaf - playground, conversations, contacts**
- Playground: sources per reply, **Fix this answer** (right sheet -> saves a Q&A, applies at once), Try as visitor
  (Romanized / Devanagari / English), Unanswered questions list beside it.
- Conversations: **two-pane inbox** - list on the left (1/3 or less, resizable), transcript right; both in ScrollArea;
  soft shallow shadows. Human takeover **later**; v1 = call-back via the contact card.
- Contact ask **only when useful** (can't answer, intent, call-back request), never before the first question. Fields
  the owner picks: name + phone (Nepal format), email, interest (filled by the bot), preferred time, **custom fields**.
- Notify: email at once for new contacts, daily summary email, in-app bell, browser push.
- Visitor thumbs up/down -> "Needs fixing" in the playground.
- Contacts: status (New / Contacted / Converted / Not interested) + notes + follow-up date in the right sheet; AI
  one-line summary + intent tag (High / Medium / Low); source recorded per channel (link, QR `?src=qr`, widget with
  page URL, API). Later: board view, CSV/Sheets export, reminders, SMS/WhatsApp, reports (reference:
  `/Users/nirajjha/Documents/nirajjha/moonshots/gymcrm`).

**Jawaf - ways in**
- Public chat page **`app.bolihq.com/j/<name>`**, no login: cover + logo + name + tagline, chat left with suggested
  questions, business card right (about, hours, address + map iframe, phone, website, socials), phone folds the card into
  an About sheet. Customise: cover, logo, name, tagline, accent colour, light/dark, greeting, suggested questions,
  **custom sections** (rich text, gallery, links/buttons, hours + map). **Voice: hold to speak** via Sarvam STT.
- QR: PNG/SVG + printable A5 poster (logo, "Ask us anything" in Nepali and English, Dhaka border).
- Demo bots show a slim **"Demo by Boli - is this your business? Claim it"** ribbon.
- **Website widget in v1**: one script tag, a bubble that opens the same chat; domain allowlist.
- **API in v1**: `POST /v1/chat/completions` with `model: "jawaf:<name>"`, same keys and SDKs, sources in an extra field.

**Money**
- **Credits only** (like Sarvam): Rs 0.50 per Jawaf answer (review after pilots; maybe Rs 1), **100 free answers a
  month** per workspace (resets on the 1st, Nepal time) then from the credit pool; web pages (first 20 per bot free) and
  file pages cost credits; "Powered by Boli" removal is a monthly credit charge. Voice is included in the answer price.
- Out of credits: visitors see a polite "contact us directly" card (no mention of credits); owner gets email + bell;
  low-balance warning at Rs 100.

**Data and trust**
- A plain **Data page**: Neon (region), R2, our open models, Sarvam for files and voice until our own models; deleting
  a bot deletes everything. **Training on conversations: opt-in per bot, off by default**, personal details removed.

**Admin**
- Restyle to the **same Boli design** as main (fonts, logo + Admin tag, sky, pills, Dhaka), and a single sign-in landing
  page with the form.
- Jawaf in admin: create demo bots for prospects under Boli's house workspace, transfer by one-time claim code (audited),
  all-bots overview, demo pipeline notes (Sent / Met / Pilot / Paying / Lost + next step date).

**Later / parked**: Messenger + Instagram (after the pilots; Meta review), Viber, WhatsApp, live takeover, CRM board,
Tigg tax API, vidhica.

## Quality bar before any demo

~40 real questions per site on 5 public Nepali sites (Romanized, Devanagari, English, plus questions it must refuse).
Bars: >=85% correct, >=90% correct refusals, >=95% right script, 0 invented prices. Re-run after every engine change.

---

## Tasks

### Wave 1 - foundation
- [x] **1. Workspaces + members** - tables (workspace, workspace_member with role + per-product access JSON,
  workspace_invitation), additive SQL, backfill script (preview / --apply, idempotent), billing to ownerType
  'workspace', current-workspace helper, members page (invite, product access, remove), invite email, join page.
  - Built (agent, 2026-11-25; not typechecked, no browser pass - the lead verifies):
    - Schema `packages/db/src/schema/workspace.ts`: `workspace` (personal_owner_id unique = a user's personal one),
      `workspace_member` (role owner/member, `access` jsonb, unique workspace+user), `workspace_invitation` (token
      SHA-256 only, 7-day expiry, status pending/accepted/revoked, one pending per workspace+email). Nullable
      `workspace_id` on `api_key`, `inference_request`, `ai_conversation`. SQL `packages/db/scripts/workspaces.sql`.
    - Access catalogue: `@repo/boli/workspace-access` (roles, `WorkspaceAccess` {kura, api, jawaf {access, level
      view/answer/edit/manage}}, `normalizeAccess`, `canUseProduct`, `effectiveAccess`, `accessSummary`).
    - Billing: `packages/billing/src/workspace.ts` (`ensurePersonalWorkspace`, `accountForWorkspace` - adopts a
      leftover ('user', id) account in place, `findWorkspaceAccount`, `findAccountForUser`, `balanceMicroForWorkspace`);
      `accountForUser` / `balanceMicroForUser` / `grantWelcome` / `adminGrantCredits` / `adminUserCredits` now resolve the
      personal workspace; `startCheckout` / `startCreditPurchase` / `billingOverview` / `setPreferredCurrency` take an
      optional `workspaceId`; admin payment/subscription lists name the account's contact user (ownerId is a
      workspace id now). `@repo/auth` user-create hook calls `ensurePersonalWorkspace`; erasure also deletes the
      personal workspace's billing account.
    - App: `lib/workspace.ts` (`getCurrentWorkspace(For)`, `listMyWorkspaces(For)`, `requireWorkspaceAccess`,
      `requireWorkspaceOwner`, cookie `boli-workspace`), `lib/workspace-members.ts`, `lib/workspace-routes.ts`,
      `actions/workspace.action.ts` + `actions/workspace-switch.action.ts` (switcher only, for the layout),
      `schemas/workspace.ts`, `types/workspace.ts`, `/members` (+ loading, member + invite sheets), `/join` in
      `app/(join)` (public in middleware), `workspaceInvitationEmail` in @repo/email.
    - Per workspace now: credits (balance chip, billing page/actions owner-only, checkout), keys (list/create/revoke,
      API access), /v1 (key -> its workspace's balance and charge), usage + home + billing reads, Kura (list/load/
      new chat/charge filtered by workspace AND user; Kura access needed). Still per user: notifications, settings,
      onboarding, profile, Kura rename/delete/rate (match on user id), rate limit (per user), admin's per-user key list.
    - SQL run (staging `ep-cold-violet-bigh1how-pooler`): preview listed 15 statements; `--apply` ran all 15; second
      `--apply` ran all 15 again without error (IF NOT EXISTS everywhere).
    - Backfill (`pnpm --filter @repo/db backfill:workspaces`): preview `Now: users 3, workspaces 0, members 0,
      user_accounts 2, workspace_accounts 0`; would create 3 workspaces, 3 memberships, move 2 billing accounts, tag 2
      api_key, 44 inference_request, 2 ai_conversation rows. `--apply` -> After: workspaces 3, members 3, user_accounts
      0, workspace_accounts 2, keys/requests/conversations without a workspace 0. Second `--apply`: every step `done: 0`,
      same After. A read check (`ensurePersonalWorkspace` twice, `findAccountForUser`, `accountForWorkspace`,
      `accountForUser`) returned the same workspace and account ids and equal balances for all 3 users.
  - Verified:
- [x] **2. Product rail shell** - rail + product sidebar in `@repo/ui` shell, main navigation per product, account items
  at the rail bottom, last-product landing, Kura history in the sidebar, Soon pages.
  - Verified: not yet - code written by a subagent (2026-11-25), no typecheck / build / browser pass run (the lead does
    those). Needs the light + dark + 390px pass: hover rail, peek / pin sidebar, phone Products sheet, Kura history
    open-in-place, /start, /api, the Jawaf and Soon pages.
  - Done in code:
    - `packages/ui`: `AppShell` takes an opt-in `productRail` (admin passes none -> the classic tree, unchanged). New
      `shell/product-shell.tsx` (frame: 56px icon rail that widens to 248px OVER the page on hover / focus / while a
      menu is open; the product sidebar beside it with the old pin / peek / cookie / Cmd+\ / resize; phone tab bar =
      the product's tab items or, with none, the live products + "Products" sheet), `shell/product-rail.tsx` (brand,
      workspace switcher, products with "Soon", credits / bell / feedback / account at the foot; rows on a fixed inner
      width so nothing moves as it widens), `shell/product-sidebar.tsx` (title + collapse, `top`, nav, `body`),
      `shell/shell-context.tsx` (`useShellNav().openNav()` for pages). `lib/shell.ts`: `ShellProduct`,
      `ShellWorkspace`, `ShellSidebar`, `PRODUCT_RAIL`, `activeProductId()`. `useRailWidth` moved to
      `hooks/use-rail-width.ts`. `MobileTabBar` gained `moreIcon`; `AccountRow` gained `collapsed`.
    - `apps/main/lib/navigation.ts`: `PRODUCTS` (id, label, icon, href, prefixes, line, soon, sidebar) replaces
      `MAIN_NAV`; `productForPath()`, `RAIL_PRODUCTS`; ROUTES gained api, jawaf*, documentAi, speech, start, members
      (from `lib/workspace-routes.ts`); `ROUTES.home` is now `/`.
    - Account pages (/home, /billing, /profile, /members, /settings, /notifications, /start) get the rail with NO
      sidebar: they are few, all reachable from the account menu, and an "Account" sidebar would repeat that menu.
    - Last product: `lib/landing.ts` (`boli_last_product` cookie, `landingFor`), written by `main-shell.tsx` when a
      live product's page opens; `middleware.ts` sends `/` and signed-in auth pages there, else `/start`.
      `AUTH_ROUTES.home` and the manifest `start_url` are `/`.
    - Kura: History moved from the right column to the sidebar (`components/kura/kura-sidebar.tsx`: New chat, search,
      Today / Yesterday / Earlier in Nepal days, rename / delete). Rows are links; on the Kura page a click opens the
      chat in place via `components/kura/kura-bridge.ts`. The (main) layout starts the history read as a promise (never
      awaited; seed carries `at` so the query refetches once stale). `actions/ai/kura-history.action.ts` holds list /
      rename / delete (split out so the layout tree registers only those). Right column = Settings, Code, Needs you;
      phone "History" opens the shell sheet. `history-panel.tsx` deleted.
    - API: `/api` Home (API stat band + Start building moved from /home); /home keeps a one-line pointer to it.
    - Jawaf: 8 real pages (/jawaf, playground, knowledge, conversations, contacts, share, insights, settings) with a
      "Coming in this build" card + loading.tsx; `jawafGuard` checks session + Jawaf access; `components/jawaf/
      bot-switcher.tsx` in the sidebar (prop-driven, "No bot yet - Set up Jawaf").
    - Soon: /documentai and /speech (pixel cover, three "what it will do" lines, disabled "We will email you").
    - /start: three Dhaka-edged cards (Kura scene, developer, shopkeeper), Fraunces display line, pill buttons.
  - Left for the lead: wire real workspaces + switching into `main-shell.tsx` (`personalWorkspace()` placeholder,
    `onSwitchWorkspace` no-op); Jawaf bots into `JawafBotSwitcher` (Wave 2); the welcome flow still ends on "Open Kura";
    Kura's side column width math still assumes a 240px rail (cramped at 1024-1100px with the sidebar pinned).
- [x] **3. Admin restyle** - Boli fonts, logo, sky, pills, Dhaka; sign-in landing; admin env files.
  - Verified: not yet - code written by a subagent (2026-11-25), no typecheck / build / browser pass run (the lead does those).
  - Done in code (apps/admin only; packages/ui, apps/main and apps/web untouched):
    - `package.json`: `@repo/boli` + `@repo/brand` (workspace:*); `pnpm install` run once at the root (linked).
    - Fonts like main: `app/fonts.ts` (Instrument Sans under `--font-geist-sans`, Fraunces `--font-boli-serif`, Geist
      Mono), woff2 copied from main into `app/fonts/`, the old `GeistLatin.woff2` removed. `app/boli.css` imports
      `@repo/brand/styles/boli.css` (which brings the @repo/ui globals + pills); root layout loads it plus
      `@repo/brand/art/art.css` once; metadata title template `%s | Boli Admin`, theme colours `#f7f5f3` / `#121314`.
      `app/global-error.tsx` added (Boli CSS + fonts, `BoliErrorView`). Icons: main's `icon.svg`, `apple-icon.png`,
      `favicon.ico` copied into `app/`. `editor.css` links use the sky ink.
    - Shell: `brand={{ name: "Boli Admin", href, lockup: <AdminLockup /> }}` - `components/brand/admin-lockup.tsx` is
      `BoliLogo` + a small neutral "Admin" pill tag. Same pin/peek rail, nav, permissions. Notifications panel empty
      state uses the Boli bell art.
    - Landing `/` and `/join`: `app/_components/admin-auth-frame.tsx` is now main's A1 split (golden valley left with
      its own line "Keep Boli running, from one place.", `AuthArtBand` on a phone, form right under the logo + Admin
      tag, `AuthDhaka` at the bottom, serif titles, no legal links, no Back link). Sign-in title "Boli Admin", sub "For
      the Boli team. ...". Error / stale / denied / returnTo handling unchanged. `/` and `/join` forced light in
      `app/providers.tsx`. `lib/admin-auth-points.ts` deleted (unused).
    - Status: root + console `not-found.tsx` -> `BoliStatus` (porter, asked-for path); root + console `error.tsx` ->
      `BoliErrorView`; `/accessdenied` (`AccessDeniedView`) -> `BoliStatus kind="forbidden"`.
    - Empty states: `components/empty/boli-empty.tsx` + `dhaka-band.tsx` are COPIES of main's (keep equal; moving them
      into `@repo/brand` would let both share one - not done, packages were out of scope). Used on Admins, Access,
      Invitations, Users, Billing (payments, subscriptions), Home recent activity, Communications overview,
      Announcements / Broadcasts empty table rows, Financial report payment events.
    - `public/` create-next-app SVGs deleted (nothing referenced them; the folder is now gone).
  - Left: admin env files (lead); `reports/adminactivity` "No admins yet" table row kept as text (cannot happen while
    you are signed in); the rest of the console's colour accents (e.g. amber StatBand tones) left as they are.

- Wave 1 verified by the lead (2026-11-25): `tsc --noEmit` main and admin - no errors; workspace switcher wired from the
  layout (listMyWorkspacesFor + getCurrentWorkspaceFor) to `switchWorkspace` + a full reload of the product home; Chrome:
  `/` -> /start (three pixel cards), rail hover shows "Boli's workspace", Kura/API/Jawaf (Soon tags), credits 99.99,
  bell, feedback, account; Kura sidebar New chat + search + history (Yesterday); /api Home with Start building; /jawaf
  with the bot switcher and 8 pages; /members with the owner row; admin sign-in at :3101 in the Boli split frame.
  Admin env files created from main's (no values printed); `pnpm env:check` OK.

- [ ] **3c. Rail polish from the owner's review (2026-11-25)** - code written, not yet typechecked or seen in Chrome
  (the lead runs both).
  - [ ] Account row: no avatar circle; ONE full-width row (user glyph in the 40px cell, name over email, truncating)
    with the rail's row hover. Its menu opens on hover after 120ms (180ms grace on leave) and on a click / Enter.
    `AccountMenu` gained `trigger` + `openDelay` (defaults keep admin's chip as it was).
  - [ ] Send feedback: the whole row opens the popover (`FeedbackButton variant="rail"` on the rail's `RailRowButton`;
    `useProductRail()` keeps the rail wide while it is open). Stars preview on hover (1..N filled, back to the chosen
    value on leave), arrow keys / Home / End move and choose, one tab stop.
  - [ ] Create workspace: "Create workspace" at the foot of the switcher menu -> dialog (Name, "Starts with 0
    credits") -> `createWorkspace` (owner, full access, own empty billing account, max `MAX_OWNED_WORKSPACES` = 5
    owned) -> `switchWorkspace` -> full reload of the product home. The switcher rows show the role (Owner / Member).
    The action lives in `actions/workspace-switch.action.ts`, not workspace.action.ts: the shell imports it, and a
    'use server' file the layout imports must hold only what the layout needs (AGENTS.md section 3).
  - [ ] Product icons: one family in `@repo/brand/product-icons` (Kura, API, Jawaf, Document AI, Speech; 24 grid,
    1.75 stroke, round caps) used by PRODUCTS (rail, phone sheet, tab bar) and the Soon pages' card label.
  - Verified: not yet - needs the lead's scoped typecheck and one Chrome pass (light + dark, hover / keyboard on the
    account row, feedback row, stars, create workspace with 5 owned).

- [ ] **3d. Sarvam collapse (owner, 2026-11-25, screenshots of dashboard.sarvam.ai)** - two states for a product page,
  toggled by the sidebar's collapse button and Cmd/Ctrl+\ (same cookie `boli_rail_hidden`, "1" = collapsed, read by
  the server layout so the first frame is right). No hover-peek any more.
  - [ ] EXPANDED (default): the 56px product rail (hover-widens over the page, unchanged) + the full product sidebar.
  - [ ] COLLAPSED: the product rail slides off screen; the product sidebar becomes ONE 64px icon rail at the far left:
    expand button, the product's own compact controls (Kura: New chat + search popover; Jawaf: bot avatar menu), the
    page items as icons with tooltips (soft pill when active, section gaps kept), then a Products menu, credits,
    feedback, notifications and the account menu as icons. The page's left offset = 64px.
  - [ ] Account pages (no sidebar), phone, admin: unchanged. Cmd/Ctrl+\ does nothing on an account page.
  - [ ] Foot like Sarvam's (owner screenshot): open rail / phone sheet shows a grey card - a hill-coloured band with a
    serif line and a white "See plans" pill (-> /billing?tab=plans), then "N credits left ->" (-> /billing); the 56px
    rail shows a wallet icon. The account row is the name only + chevron up (the closed 56px rail shows the avatar), and its menu opens just above the row, not to the side.
  - [ ] The rail no longer widens on hover over its top (brand + workspace, `data-rail-no-hover`), and after an expand
    / collapse with the mouse where the rail lands it ignores hover until the pointer leaves it once (owner: pressing
    expand slid the rail in under the pointer and it widened at once).
  - Verified: not yet - code written by a subagent (2026-11-25); the lead runs the scoped typecheck and one Chrome
    pass (both states on Kura / API / Jawaf, toggle + shortcut, reload in each state, light + dark, 390px unchanged).

### Wave 2 - Jawaf core
- [ ] **4. Jawaf data model** - bots, sources, pages, chunks (pgvector), facts, Q&A, files, conversations, messages,
  contacts, usage; SQL scripts; embedding adapter (local llama-server bge-m3).
  - Built (agent, 2026-11-25; NOT typechecked - the lead runs the scoped tsc; no dev server, no browser):
    - **Contracts for the dashboard agent (task 7) - build against these:**
      - Constants + value lists: `@repo/boli/jawaf` (`packages/boli/src/jawaf.ts`, new export `./jawaf`): `JAWAF_PRICES`
        (micro-credits: answer 0.5 credit, page 1, file page 2, branding 500/month; 100 free answers / workspace / Nepal
        month; 20 free pages / bot), `JAWAF_LIMITS` (200 pages, 50 files, 20 MB, 10 bots / workspace, ...),
        `jawafLimitsFor`, business types (+ labels, examples, suggested questions), tones, lengths, scripts, channels,
        setup steps, fact keys + titles, source / page / job / contact statuses, `JAWAF_SLUG_PATTERN`,
        `JAWAF_RESERVED_SLUGS`, `JAWAF_NOT_FOUND` (fixed not-found reply per script).
      - Types: `apps/main/types/jawaf.ts` (JawafBot, JawafBotSummary, JawafBotCounts, JawafSlugCheck, JawafSourceView,
        JawafPageView, JawafMapResult, JawafJobView/Progress, JawafUploadTicket, JawafFactSection, JawafTable, JawafQa,
        JawafNote, JawafCsvImportResult, JawafAnswer, JawafAnswerSource, JawafFrame (stream), JawafUnanswered,
        JawafPlaygroundMessage, JawafContact, JawafUsageMonth, and the jsonb shapes JawafContactFields /
        JawafPageLook / JawafCustomSection).
      - Zod: `apps/main/schemas/jawaf.ts` (create / update bot, contact fields, page look, custom sections, map, set
        pages, add URL, list pages, start / finish upload + `JAWAF_FILE_TYPES`, bot item, save fact / Q&A / note, CSV
        import, ask, fix answer, update contact).
      - Actions (all `ActionResult`, session + `requireWorkspaceAccess('jawaf', level)` in each):
        - `actions/jawaf/bots.action.ts`: listJawafBots (view), getJawafBot (view), getJawafBotCounts (view),
          getJawafUsage (view), checkJawafSlug (edit), suggestJawafSlug (view), createJawafBot (manage),
          updateJawafBot (manage; `setupStep` alone = edit), publishJawafLook (manage), deleteJawafBot (manage).
        - `actions/jawaf/knowledge.action.ts`: mapJawafSite (edit, inline, returns the ranked pages pre-ticked),
          setJawafPagesIncluded (edit), addJawafUrl (edit, starts a read job), listJawafPages (view; filter
          all/included/excluded/changed/failed), listJawafSources (view), startJawafReading (edit; first read also
          drafts the fact sheet), trainJawafNow (edit), redraftJawafFacts (edit), getJawafJob (view, read only),
          getActiveJawafJob (view), startJawafFileUpload (edit -> presigned PUT ticket), finishJawafFileUpload (edit ->
          source + file job), listJawafFiles (view), deleteJawafSource (edit).
        - `actions/jawaf/facts.action.ts`: listJawafFacts / saveJawafFact / approveJawafFacts ({botId, ids?: [] = all
          drafts}) / deleteJawafFact; listJawafQa / saveJawafQa / approveJawafQa / deleteJawafQa / importJawafQaCsv
          (`question,answer[,"p1; p2"]`); listJawafNotes / saveJawafNote / deleteJawafNote (view to read, edit to write).
        - `actions/jawaf/playground.action.ts`: fixJawafAnswer (answer level; the visitor's own wording becomes a
          phrasing), listJawafUnanswered (view), getJawafPlaygroundMessages (view).
      - Route `app/api/jawaf/[...path]/route.ts` (ONE dispatcher): `POST /api/jawaf/ask` {botId, conversationId?,
        message} -> NDJSON `JawafFrame` lines: `meta`, `text` deltas (drafts), `final` {answer: JawafAnswer} which
        REPLACES the streamed text (guards may drop sentences / citations), `error`, `done`. `POST
        /api/jawaf/jobs/<jobId>/tick` -> `{ success, data: JawafJobView }` after running one slice; the Knowledge page
        polls it every ~2 s while `status` is queued/running.
    - Schema `packages/db/src/schema/jawaf.ts` (exported from schema/index): jawaf_bot (slug unique globally, look +
      published_look, contact_fields, limits overrides, demo + claim_code_hash + claim_expires_at, free_pages_used),
      jawaf_source, jawaf_page (url_key unique per bot, content_hash, status included/excluded, read_status
      pending/read/failed/removed, change new/changed/removed, billed free/paid, disagrees_with_facts), jawaf_fact_section
      (approved / drafted, table jsonb), jawaf_qa (phrasings text[], source owner/fix/import/draft, approved),
      jawaf_note (kind note | table - tables are notes with columns/rows jsonb: one list, one editor, one chunker),
      jawaf_chunk (origin_kind + origin_id, source_id, heading, text, vector(1024) HNSW cosine, generated
      `tsvector('simple')` GIN, pg_trgm GIN on text), jawaf_job (status / progress / cursor / lease_until; partial unique
      index = one active job per bot+kind+source), jawaf_conversation, jawaf_message (sources jsonb, answered, status,
      rating, latency, tokens, cost_micro, retrieval debug numbers), jawaf_contact, jawaf_usage_month (workspace +
      Nepal month counter). Every row carries workspace_id + bot_id; FK cascade from bot and workspace.
    - Embeddings `apps/main/lib/jawaf/embed.ts`: `embed(texts)` / `embedOne`, batches of 16, L2-normalised,
      JAWAF_EMBED_PROVIDER=llama (default, LLAMA_EMBED_BASE_URL, optional LLAMA_EMBED_API_KEY) | workers_ai (stub that
      throws naming CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN).
  - Verified (2026-11-25):
    - `pnpm --filter @repo/db sql scripts/jawaf.sql` preview: `Target database: ep-cold-violet-bigh1how-pooler - 39
      statement(s)`; `--apply` ran 39; second `--apply` ran 39 again without error. Before: pg_available_extensions
      vector 0.8.7 and pg_trgm 1.6 available, not installed; PostgreSQL 18.7.
    - Embedding server: POST /v1/embeddings -> 2 vectors x 1024 dims (ggml-org/bge-m3-Q8_0-GGUF). Similarity check:
      "fee kati ho" vs "what is the fee" 0.798, vs "शुल्क कति हो" 0.733; "what is the fee" vs "where is the office" 0.500.
    - Tenant check (e2e script): `loadBot(<other workspace>, botId)` -> "That bot could not be found in this workspace.";
      slug checks: taken -> suggestion `eval-gurukulhq-hirj`, `admin` -> reserved (suggests `admin-np`), "Bad Slug!" ->
      invalid.
- [ ] **5. Ingest** - Firecrawl map + scrape in a background job, Sarvam file reading, chunking, embeddings, re-crawl.
  - Built (agent, 2026-11-25):
    - **Job mechanism (no Workflow exists in the repo; `next dev` cannot run one):** a resumable `jawaf_job` row
      advanced in SLICES (`lib/jawaf/jobs.ts runSlice`, 12 s budget for starting steps; a step = 3 parallel scrapes, or
      one model call, or one Sarvam status read) by (1) the page's poll `POST /api/jawaf/jobs/<id>/tick` (a route, not a
      server action - Next runs one client's actions one at a time, so a 20 s action would freeze the page) and (2) the
      hourly cron job `jawaf-jobs` (`lib/jawaf/cron.ts`, registered in `app/api/cron/[job]/route.ts`): runs slices of
      jobs nobody polls (closed tab) for up to 40 s and queues weekly re-reads (`next_read_at`). The lease
      (`lease_until`, one conditional UPDATE, 60 s) keeps two drivers off one job; steps are idempotent. Moving to a
      Workflow later = calling `runSlice` from its steps.
    - Kinds: `read` (pending included pages -> Firecrawl scrape -> cleanMarkdown -> sha256 (unchanged = skipped) ->
      chunk -> embed -> replace chunks; 404/410 = removed + unindexed; new/changed flags; "Website disagrees" when a
      currency amount on the page is not in the approved Prices and fees; then optional draft phase; then sources
      ready + next_read_at +7 days + setup step -> review), `file` (R2 -> txt/md / .docx (`docxToText`) / PDF text
      layer (`extractPdfText`) else Sarvam OCR via NEW resumable `submitDigitise` / `digitiseStatus` /
      `digitiseOutput` (`ne-IN`, md) -> one jawaf_page -> chunks -> bill pages), `draft`, `reindex`.
    - Map: `lib/jawaf/crawl.ts` (Firecrawl map + `fetchRobots` / `robotsAllows` (new in @repo/webdata), drops
      login/cart/account/tag/category/feed/pagination/search/file URLs and other hosts, dedupes by `urlKey`, ranks home,
      then about/contact/fees/admission/courses/services/FAQ/hours/policies, shallow first, blog/news posts -70, top N
      pre-ticked up to the bot limit).
    - Chunking `lib/jawaf/text.ts chunkMarkdown`: heading paths, ~400 target / 500 max tokens, short-paragraph
      overlap. Q&A: each phrasing embedded alone, all pointing at the same answer. Facts / Q&A / notes indexed on save.
    - Draft `lib/jawaf/draft.ts`: 7 steps (about, services, prices table, hours, location, policies, 5-10 FAQs), each
      a JSON-schema constrained boli-chat call over that topic's retrieved excerpts, temperature 0, "copy, do not
      invent"; every line / price row / FAQ with a number not in the excerpts is dropped; saved as drafts (approved =
      false); an approved section is never overwritten.
    - Credits `lib/jawaf/meter.ts` (constants from `@repo/boli/jawaf`): first read of a page billed once (free while
      `free_pages_used < 20`, else `spend:jawaf-page:<pageId>`); re-reads and Train never charge; files
      `spend:jawaf-file:<sourceId>` = pages x 2 credits; out of credits (when enforced) stops the job with errorCode
      `credits`.
    - Packages: `@repo/webdata` gained `firecrawlScrapeSite` + `firecrawlCreditUsage` (from synchq, adapted) and
      `robots.ts`; `@repo/sarvamai` gained `submitDigitise`, `digitiseStatus`, `digitiseOutput`, `docxToText`
      (`digitiseDocument` now composes them).
  - Verified (2026-11-25, `ml/jawaf-eval/build.mts` against https://gurukulhq.com, bot `eval-gurukulhq` in the seed
    admin's workspace, demo = true):
    - Map: `200 pages kept, 8 dropped, 200 pre-ticked (15394 ms)`; Firecrawl 429s mid-read were retried on the next
      slice (`retrying` label) - no page lost.
    - First read (25 ticked): 20 read, then `failed - Stopped: out of credits (20/25)` - the 20 free pages used
      (`free pages used: 20`), the test workspace has 0 credits and CREDITS_ENFORCED is on, so the guard stopped it
      without charging. Trimmed to the 19 read pages; re-run: `job done in 5 slices, 112 s`, chunks 215, drafts:
      about 2 lines, services 8 lines, prices 12 rows (NPR 30 / 45 per student, minimums 54,000 / 81,000, Foundation
      free up to 50 ...), location 2 lines (info@gurukulhq.com, Kathmandu), 8 FAQs; hours and policies "not found"
      (none on the site). `--approve`: `approved 4 fact sections and 8 FAQs`. No money moved.
    - Ranking after the blog penalty (offline re-rank of the stored URLs): `/ /pricing /aboutus /guides/collecting-fees
      /guides/enrolling-students /compare/... /features/timetables ... /refund-policy /privacypolicy ...` (blog posts
      no longer fill the top 20).
    - Files: R2 is blank in `.env.local`, so the upload -> R2 -> file job leg was NOT run (`R2 is not configured -
      R2_ACCOUNT_ID, ... are not set`). Ran the same reading calls directly: txt -> 1 page; PNG -> needs OCR; Sarvam
      `submitDigitise` -> `completed pages 1 / 1 4s 2 polls` -> text exact ("Hostel fee: NPR 12,500 per month ...") ->
      indexed 1 chunk (removed after).
    - e2e (scratch script, cleaned up after): Q&A saved -> 2 chunks (question + phrasing); note saved; CSV import
      `{"added":1,"skipped":1,"problems":["Row 3: no question"]}`; `enqueueJob` twice -> same job id; counts
      `{"pagesIncluded":19,"pagesRead":19,"facts":4,"factsApproved":4,"qa":10,"notes":1,"chunks":232}`.
- [ ] **6. Answer engine + quality test set** - retrieval (vectors + keywords + transliteration), guards, citations,
  script matching, credits metering; the 5-site test set and its bars.
  - Built (agent, 2026-11-25):
    - `lib/jawaf/answer.ts answerQuestion({ bot, question, history?, onDelta? })` - pure engine, used by everything:
      script detect (`lib/jawaf/script.ts`: Devanagari share + a Romanized Nepali word list) -> variants (question;
      for Romanized/mixed a rule-based Devanagari transliteration - no open TS transliterator exists, IndicXlit is
      PyTorch; a short follow-up is ALSO searched with the previous question) -> `lib/jawaf/retrieve.ts searchChunks`:
      ONE db.batch (SET LOCAL hnsw.iterative_scan + ef_search, then per variant: vector top 20, `simple` full text OR
      query top 20, pg_trgm per-word fuzzy top 20) fused by RRF (k 60) -> GATE (Q&A sim >= 0.72, or best vector >=
      0.47, or >= 0.40 with half the words matching; else not-found with NO model call) -> prompt (frozen system prompt;
      bot profile + ALL approved facts numbered [1..m]; excerpts [m+1..]; reply-script instruction; NOT_FOUND sentinel)
      -> boli-chat (thinking off, temp 0.1, streamed with the first 10 chars held back) -> guards: NOT_FOUND sentinel,
      absence detector ("does not state", "jankari chaina", "उल्लेख छैन", or an admission of missing info around an
      off-topic reply) -> not-found; one regeneration when the script is wrong; numbers (2+ digits) not in sources /
      facts / question drop their sentence (+ "contact us for the exact details"); money amounts must be in the FACTS
      when facts have numbers; [n] not mapping to a source stripped, rest renumbered; sources = only cited ones.
    - `lib/jawaf/ask.ts askBot` (conversation + messages + meter): playground free; public channels check
      `canAnswer` (free answers left or credits) -> `credits` status with the polite contact text, else answer, store,
      `chargeAnswer` (Nepal-month counter upsert; after 100, `spend:jawaf-answer:<messageId>` 0.5 credit).
      `unansweredQuestions`, `questionFor`, `playgroundMessages`.
    - Eval `ml/jawaf-eval/` (README, `build.mts`, `run.mts`, `smoke.mts`, `questions/gurukulhq.json`: 15 English +
      10 Romanized + 8 Devanagari answerable, 8 must-refuse). README lists the next 4 sites (KIST College, Grande
      Hospital, Nepal Homes, Goldstar; each answered HTTP 200, nothing scraped).
  - Verified (2026-11-25, `run.mts --questions questions/gurukulhq.json`, local boli-chat + bge-m3, drafts approved
    unchanged):
    - Run 1 (gate vecStrong 0.6 only): correct 23/33 = 69.7% (EN 13/15, RO 4/10, DE 6/8; 9 wrongly refused),
      refusals 6/8 = 75%, script 41/41, invented numbers 0, p50 7.1 s. Similarities of answerable and unanswerable
      questions overlap at 0.50-0.62, so the gate cannot separate them alone.
    - Run 2 (gate floor 0.47 + absence detector + "check first" rule): correct 30/33 = 90.9%, refusals 7/8, script
      41/41, invented 0, one `error` = a transient Neon query failure.
    - Run 4 (final, + off-topic absence rule + follow-up variants): **correct 31/33 = 93.9% (EN 14/15, RO 9/10, DE
      8/8, 0 wrongly refused); correct refusals 8/8 = 100%; right script 40/41 = 97.6% (ro-07 answered in English even
      after the retry); invented numbers 0, invented prices 0; p50 4.7 s, p90 7.0 s.** Misses: en-08 (SMS cost: the
      sentence with "2 credits" also held "NPR 300", a price not in the facts, so the price guard dropped it - by
      design), ro-03 (setup fee: the model hedged instead of saying "no setup fees").
    - e2e: playground Romanized question answered from a just-saved Q&A in Romanized with 39 streamed deltas, cost 0;
      a `link` question went not-found and moved the month counter 0 -> 1, cost 0 (free); unanswered list showed it.
    - One site, one run each - LLM output varies run to run; the bar needs the 5 sites.
  - Open: the other 4 sites; a learned reranker (bge-reranker-v2-m3) would let the gate tighten; follow-ups in a
    conversation are weak (history of 2 turns sometimes pulls the old topic); real transliteration (IndicXlit on the
    GPU box) not done.
- [ ] **6b. Engine fixes from the staging e2e on gurukulhq.com (agent, 2026-11-25)** - code done, not typechecked, eval
  NOT re-run (boli-chat and the embed server were both off: `/health` on :8080 and :8081 did not answer).
  - [ ] Drafting never fails the read: `llm.ts` sends the schema as `response_format` json_schema AND llama.cpp's
    top-level `json_schema` (grammar-constrained; checked against the llama.cpp server docs), reads the reply with
    `parseJsonReply` (as is -> fences stripped -> first balanced object -> a reply cut off at max_tokens closed at its
    last complete row); `draft.ts draftJson` retries ONCE with a stricter "only one JSON object" turn and 1.5x tokens,
    then leaves THAT section empty with a note (`DraftStepResult.note`, collected in the job cursor `draftNotes`).
    `steps.ts draftOneSection` (read + draft jobs): non-outage errors skip the section with a note; outages retry 4x
    with a growing wait (`cursor.retryAt`, both runners). Prices max 25 rows, 1400 tokens. Copy-not-invent + number
    check unchanged. Cause seen: the read failed on section 3 (prices) - likely a truncated reply.
    Verified so far: `parseJsonReply` on 7 sample replies (plain, fenced, prose-wrapped, truncated rows / lines kept,
    junk -> null); live draft not run (boli-chat off).
  - [ ] A read always settles: `rows.ts settleEndedRead` runs from `finishJob` (failed / cancelled) and `failIfActive`
    (dead Workflow): sources leave "reading" (ready if any page read, else failed with the sentence) and setup
    "reading" -> "review". Staging `gurukul-hq` repaired with `pnpm --filter @repo/db jawaf:stuck-reads --slug
    gurukul-hq --apply` (new `packages/db/scripts/jawaf-stuck-reads.mjs`): "1 bot(s) moved to review, 1 source(s)
    out of reading"; second run "Stuck bots: 0". It has 2 drafted sections (prices never drafted) - press Draft
    again once boli-chat is up.
  - [ ] Pre-tick only the free 20: `crawl.ts rankLinks` ranks home, pricing / fees, about, contact, services /
    products / features, admission / booking, FAQ / help (round robin across these so 30 feature pages cannot push
    FAQ out), then the rest; blog / news / changelog / legal / author / tag / dated pages last and never pre-ticked
    (author / tag / category are now listed instead of dropped). `map.ts` pre-ticks up to `JAWAF_PRICES.freePagesPerBot`.
    Setup copy says so. Verified: 56 sample URLs -> 20 ticked, none of blog / terms / privacy / refund / tag / author.
  - [ ] Price questions: `answer.ts priceIntent` (price words in English / Romanized / Devanagari; "kati" / "कति"
    only when the next word is not a count like din / jana / बजे; निःशुल्क is not a price) -> the approved Prices and
    fees section leads the facts (and passes the gate alone, gate "prices"), blog / news / guide pages (`isArticleUrl`)
    drop to the end of the excerpts, a per-turn rule says prices only from that section; with NO approved prices no
    amount is ever quoted (money or price word + number sentences dropped, not streamed) -> not-found / contact line.
    Verified: priceIntent on the 41 eval questions (price ones flagged; ro-02, de-02, de-07, rf-06, rf-07 not).
    Note: reordering the facts for a price question changes the profile block, so llama-server re-reads that prefix.
  - [ ] Re-run `ml/jawaf-eval` on gurukulhq (previous: 93.9% correct, 100% refusals, 97.6% script, 0 invented) once
    the model servers are up.
- [ ] **7. Jawaf dashboard: onboarding, Knowledge, Playground, Settings.**
  - Built (agent, 2026-11-25; NOT typechecked, no dev server, no browser - the lead runs the scoped tsc and the Chrome
    pass):
    - **Current bot:** cookie `boli_jawaf_bot` (`lib/jawaf/bot-cookie.ts`, browser-written, a hint only) read by
      `lib/jawaf/current-bot.ts getJawafContext(userId)` (React-cached: workspace, its bots, the current bot = cookie's
      if it belongs to the workspace else the first, and `can` {answer, edit, manage}). `jawafGuard` now returns
      `{ userId }`. Every page passes `key={bot.id}` and its query keys carry the bot id (`components/jawaf/keys.ts`).
    - **Shell:** `main-shell.tsx` mounts `JawafSidebarSwitcher` (client query of NEW `actions/jawaf/switcher.action.ts
      listJawafBotOptions` - its own file, the only export, because the shell imports it). Switching writes the cookie,
      invalidates `["jawaf"]` and `router.refresh()`es, so you stay on the same page. "New bot" -> `/jawaf/setup?new=1`.
    - **Onboarding** `/jawaf/setup` (+ loading): FlowSteps (Your business / How it talks / Pick pages / Read / Review);
      step 1 business type pills (5 + Other), business name, bot name, public link with debounced live check
      (`components/jawaf/slug-status.tsx`), website; step 2 tone + length pills + "what it should focus on" (template per
      type, editable -> saved as `instructions`); `WidgetPreview` on the right (sky gradient + jawafCounter pixel scene +
      Dhaka hem, greeting with both names, a sample Q&A in the chosen tone/length). Create = createJawafBot then
      updateJawafBot (greeting with the bot name, instructions) - **the bot name has no column; it lives in the greeting
      text**. Pick pages (auto map, search, select all/none, count vs limit, first 20 free + credits for the rest),
      Reading (tick poll 1.5 s via `components/jawaf/use-jawaf-job.ts`, "You can leave, we keep going"), Review
      (FactCards + drafted FAQs: Approve / Edit sheet / Discard, Approve all, Go live = status live + setupStep try).
      Resumes from `setup_step`; a live bot redirects to Home. "Skip for now" in the header -> /jawaf.
    - **Home** `/jawaf`: setup banner (Dhaka, sky wash, Fraunces card title, 5-step checklist with progress) until the bot
      is live; then a "Your Jawaf is live" card (link, Copy - also marks the Share step done - Open). Wave 4 placeholder
      card "Answers at a glance". Playground's first answered question moves setupStep review/try -> share.
    - **Knowledge** `/jawaf/knowledge` tabs facts/pages/files/qa/notes (`useUrlTab`): Facts = FactCards in fixed order +
      custom, keep-open FactSheet (TipTap editor copied from apps/admin -> `components/jawaf/rich-text-editor.tsx`, styles
      as Tailwind selectors, `immediatelyRender: false`; TableEditor for Prices and fees), "Website disagrees" count on
      Prices; Pages = table (sticky header, max-h 44rem, include Switch per row, ChoiceChips filter, Add a page popover,
      re-read schedule note); Files = FileDropzone -> presigned PUT (XHR progress) -> finish, a ticker per file job,
      "File uploads need storage set up" when `isStorageConfigured()` is false; Q&A = list + QaSheet (phrasing chips) +
      Import CSV sheet with a template download; Notes = notes and tables in a NoteSheet. Train now + one page-level
      job followed for the page. Save buttons say "Updating..." while the action indexes (saves index before returning).
    - **Playground** `/jawaf/playground`: chat (NDJSON reader in `use-playground.ts`, rAF-coalesced text, `final`
      replaces the draft), [n] chips -> popover with the snippet, source buttons, script + answered badges, the contact
      card preview on not-found, Fix this answer (QaSheet fix mode -> fixJawafAnswer, toast "Saved - it answers this way
      now"), Try as visitor (Romanized / Devanagari / English). Right column "Needs fixing" (sheet below lg) with Answer
      this. New chat.
    - **Settings** `/jawaf/settings` tabs bot/contact/notifications/data, width reading: Bot (name, link, type,
      website, tone, length, instructions, greeting, suggested questions - partial save), Contact fields (built-in
      switches + custom fields in a SortableList edited in a right sheet), Notifications (stored per person per bot),
      Data (show sources, training opt-in, link to the new `/jawaf/data` placeholder, delete with a type-the-name Dialog).
    - **Actions added:** `actions/jawaf/switcher.action.ts listJawafBotOptions` (view);
      `actions/jawaf/settings.action.ts getJawafNotifyPrefs / saveJawafNotifyPrefs` (view; user_setting key
      `jawaf.notify.<botId>` via `lib/jawaf/notify-prefs.ts` - no column needed); `playground.action.ts
      convertJawafQuestion` (view; boli-chat rewrite for Try as visitor). Types `JawafSwitcherData`, `JawafNotifyPrefs`,
      `JawafVisitorScript`; schemas `jawafNotifyPrefsSchema`, `convertJawafQuestionSchema`. Routes `jawafSetup`,
      `jawafData`. `apps/main/package.json` gained the five `@tiptap/*` deps (same versions as admin; `pnpm install
      --offline` run, lockfile changed).
    - Open: suggested questions cap uses `JAWAF_LIMITS.suggestedQuestions` (6) - the brief said 4; change the constant
      if 4 is wanted. Page limit in Pick pages uses the default `JAWAF_LIMITS.pagesPerBot` (admin overrides not shown
      there; Knowledge uses the bot's real limits). Notification sending is Wave 4.
  - Verified:

### Wave 3 - ways in
- [ ] **8. Public page `/j/<name>`** + custom sections + voice + demo ribbon + QR poster.
  - Built (agent, 2026-11-25; NOT typechecked, no dev server, no browser pass - the lead runs those):
    - Route group `app/(public-chat)/j/[slug]/` (outside (main): no shell, no auth): `page.tsx` (bot by slug, live OR
      demo, else the root Boli 404; metadata "<Business> - ask us anything", noindex for demos), `loading.tsx`,
      `poster/page.tsx` + `poster/loading.tsx` (A5 print poster), and ONE dispatcher `api/[...path]/route.ts` (ask,
      contact, rate, speech, reset, qr.svg, qr.png, image/<key>). The public endpoints sit UNDER /j/<slug> on purpose:
      the visitor cookie is scoped to that path, so the browser sends it there and nowhere else.
    - `middleware.ts`: `/j` in PUBLIC. `app/providers.tsx`: `/j` keeps <html> light; the page applies the BOT's theme
      on its own root (`components/jawaf/public/theme-root.tsx`: `dark` class, "system" via an inline pre-paint script).
    - Server: `lib/jawaf/public.ts` (public bot view with only visitor-safe fields - never workspace id, instructions,
      limits, claim data; business card from APPROVED facts: about, hours, address, phones, WhatsApp from a 97/98
      mobile, emails, website, social links; custom sections sanitised; accent + readable ink (white if 4.5:1, else
      near-black; default accent = sky ink #1d64a3); visitor cookie `jawaf_v` HttpOnly SameSite=Lax 30 days
      Path=/j/<slug>; restore of the latest conversation (60 messages); contact capture; ratings; rate limits),
      `lib/jawaf/public-html.ts` (ALLOWLIST sanitiser - stricter than @repo/ui's strip-list), `lib/jawaf/geocode.ts`
      (Nominatim for the business's public address -> OpenStreetMap embed bbox + marker; "Open in map" link when it
      fails). `types/jawaf-public.ts`, `schemas/jawaf-public.ts` (ask / contact / rate, `normaliseNepalMobile`,
      `checkContactFields` shared by the card and the server).
    - UI `components/jawaf/public/`: `cover.tsx` (owner cover via storageHref / the image route, else a pixel scene by
      type: education whoStudent, shop whoShop, hotel PixelHimalaya, others the valley banner; logo or initial on the
      accent; name in Fraunces), `business-card.tsx` (sections + lazy sandboxed OSM iframe behind its own Suspense +
      "Powered by Boli" unless removed; rich text with `rte-output` + scoped child styles - the class has no global
      rules in main), `public-chat.tsx` (greeting, up to 4 suggested chips, messages, source chips, thumbs, contact card
      under the latest not-found, "Please contact us directly" card for `credits` - never the word credits, Try again
      for offline/error, Start over via ConfirmPopover, About sheet on phones), `composer.tsx` + `use-voice.ts` (hold
      to speak on touch - release sends, slide away cancels; click to start/stop with a mouse; 30 s cap with timer
      and bar; Cancel; mic-blocked / no-mic / unsupported messages; text lands IN the composer), `contact-card.tsx`,
      `answer-text.tsx` (markdown-lite; only links are citations to the bot's own http(s) source URLs),
      `demo-ribbon.tsx` (Claim it -> `/signup?intent=claim&bot=<slug>`; the claim flow is task 12), `qr.tsx`
      (`JawafQr` SVG component, `jawafQrSvg`, `jawafQrPng` - a 1-bit PNG encoder over CompressionStream; encoder `uqr`
      0.1.3 MIT, added to apps/main deps), `poster.tsx` + `print-button.tsx`, `logo.tsx`, `theme-root.tsx`.
    - Decisions made here: drafts are NOT streamed to visitors (only `meta` + the guarded `final`) - the guards can
      still drop a sentence with an invented number and a visitor must never see it flash by; cost / tokens /
      retrieval never leave the server. Questions capped at 500 characters.
    - Rate limits (`PUBLIC_LIMITS`): ask 20/min + 300/day per visitor (database count, reliable) and 40/min + 1000/day
      per IP hash (per-isolate memory, best effort - a school's wifi shares one IP); speech 6/min + 60/day per visitor,
      15/min per IP (memory); contact 3/hour per visitor (database) + 6/hour per IP (memory); rating 60/min per IP.
      Honeypot field `website` on the contact card (filled = fake success, nothing stored).
  - Checked (2026-11-25, tsx scripts calling the route's POST/GET directly against staging, bot `eval-gurukulhq`;
    facts were already approved by the backend agent - nothing approved here):
    - Public view: 3 contact fields (name, phone, interest), card = about (2 lines), address "Kathmandu, Nepal",
      info@gurukulhq.com, website; no phone on the site so no Call / WhatsApp; 4 education suggested questions;
      unknown or invalid slugs -> null; geocode "Kathmandu, Nepal" -> 27.7083, 85.3206.
    - ask (src qr): 200, Set-Cookie `jawaf_v=<id>; Path=/j/eval-gurukulhq; Max-Age=2592000; HttpOnly; SameSite=Lax`,
      frames meta -> final (answered, "School plan is NPR 30 per student per month ... Academy NPR 45", 4 sources) ->
      done, 10.1 s; second question with the cookie -> not_found, same conversation, 4.5 s. Conversation channel `qr`.
    - rate -1 with reason on own message -> 200 (row rating -1, reason stored); without the cookie -> 404.
    - contact: phone "12345" -> 422 "Enter a Nepal mobile number starting with 98 or 97 (10 digits)."; valid ->
      200, stored `{"name","phone":"9801234567","interest"}` (an unknown field `evil` dropped), channel qr,
      contact_captured true; honeypot filled -> 200 and nothing stored.
    - restore: same conversation, 4 messages, rating and sources kept, contactSaved true. reset -> Max-Age=0 cookie.
    - qr.svg 200 image/svg+xml; qr.png 200 image/png (PNG 296 x 296 1-bit, opened and looked right); unknown bot 404;
      image key not in the look 404.
    - speech: Sarvam TTS clips -> our route -> "होस्टल को शुल्क कति हो?" (hi-IN voice) and "What time does the office
      open?" (en-IN). Real Nepali speech from a person NOT tried yet (Sarvam lists no ne-IN speech model).
    - Sanitiser: `jav&#x61;script:` href, onclick, script, img onerror, iframe, svg all removed; a safe https link kept
      with rel nofollow noopener.
    - Test rows deleted after (1 contact, 1 conversation); the workspace's free-answer counter moved by 2.
  - Open for the lead: scoped typecheck; one Chrome pass desktop + 390px; `app/robots.ts` still disallows `/j` (live
    bots will not be indexed until `/j/` is allowed there); portals (About sheet, Select, popover) sit outside the
    page root so a DARK bot shows them light; IP limits are per isolate - an `ip_hash` column on jawaf_conversation (or
    a small rate table) would make them exact; owner notifications for new contacts are task 10.
  - Verified:
- [ ] **9. Widget script + allowlist; API `model: "jawaf:<name>"`.**
  - Verified:

### Wave 4 - the rest
- [ ] **10. Conversations (two-pane), Contacts, Insights, notifications (email, digest, bell, push).**
  - Verified:
- [ ] **11. Homes redesign** (Boli overview, Jawaf Home, API Home).
  - Boli overview (/home) done 2026-11-25:
    - product cards for every rail product (Kura, API, Jawaf; Kagaj and Swar "Later"), each with a Dhaka edge and a live line from the workspace
    - band: Credits left / Spent today / Spent, last 30 days (Kura, API and Jawaf) / Jawaf answers
    - credits-per-day chart with a Jawaf series; the y axis sized to its labels (0.0075 was clipped)
    - the API pointer removed (it lives on /api)
    - Home added to the top of the rail, lit on /home
    - Jawaf Home and API Home still to do.
  - Verified: main typecheck (scoped) clean; Chrome on /home light and dark: cards aligned, chart axis readable, Home active in the rail.
- [ ] **12. Admin Jawaf**: demo bots, claim transfer, all bots, demo pipeline.
  - Verified:
- [ ] **13. Typecheck + full Chrome pass + quality bar run.**
  - Verified:
