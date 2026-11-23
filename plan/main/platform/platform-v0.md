# Boli platform v0 - sign up, 100 credits, API key, playground, usage, billing

| | |
|---|---|
| **App / module** | `main/platform` (apps/main, packages/db, packages/billing, packages/auth) |
| **Status** | Planned - answers received 2026-11-24, ready to build |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Parent** | [`plan/repo/platform/inference-platform.md`](../../repo/platform/inference-platform.md) phase 3 |

## What was asked

"Anyone can come to the platform and sign up. They get 100 credits. They can start using the API, and they can start
chatting on the platform itself." Make it as simple as possible, as usable as Sarvam's dashboard, with a landing page in
a story format, good auth pages, an API keys page, a playground, usage, billing and add credits. Plan and ask every
question first, then build once with several agents in parallel, then check every page in Chrome.

Two things to prove: (1) the model runs on our platform and the chat is saved to our database; (2) another project can
call our API with a key, so the platform is an inference provider.

## What "done" looks like

1. A new person signs up (email + password, or Google), verifies, lands in the dashboard with **100 credits**.
2. **Playground**: chats with our model (Gemma 4 E4B via llama-server), sees tokens and credits used per reply; the
   conversation is saved.
3. **API keys**: creates a named key (shown once), copies it, sees name / prefix / created / last used, revokes it.
4. From another project: `POST https://<domain>/v1/chat/completions` with `Authorization: Bearer <key>` returns an
   OpenAI-shaped answer; credits go down; a revoked or wrong key gets an error; no credits gets 402.
5. **Usage**: requests, tokens and credits over time, per key and per source (playground vs API).
6. **Billing**: balance, ledger (grant, spends), "Add credits" dialog (payment wiring per Q).
7. Landing, auth pages and every dashboard page checked in Chrome at desktop and 390px.

---

## Study 1 - Sarvam (2026-11-24)

Read in Chrome (public pages) and from the owner's screenshots (dashboard; this Chrome is not signed in to Indus).

**Look and feel**

| Thing | Sarvam |
|---|---|
| Fonts | **Matter** (body, UI, 400/500), **Season Mix** (serif display for h1/h2, weights 425-525), **Matter Semi Mono** (code) |
| Ground / ink | warm off-white `rgb(247,245,243)`; ink `rgb(20,20,20)`; body text `rgb(51,51,51)` |
| Buttons | pills (`border-radius: 9999px`), 44px tall; primary near-black, secondary light grey `rgb(240,240,240)` |
| Headings | landing h1 64px serif 425; section h2 36px serif; card titles 26-28px Matter |
| Speed | login: TTFB 268 ms, DOMContentLoaded 358 ms, load 762 ms; landing: TTFB 306 ms, DCL 549 ms, load 1.37 s (153 images, 3 videos); both Next.js |

**Auth pages** (`/login`, `/registration`): split screen. Left half: full-bleed pixel-art illustration (India skyline)
with a white rounded card listing the 4 products + "Trusted by" logos. Right half: logo, "Log into your account"
(serif), Google / Microsoft / Apple / phone pill buttons, OR, email field, terms checkbox, Continue (disabled until
valid), "Don't have an account? Create one". Registration: email, name, password with live rule checklist (8 chars,
1 number, lower+upper), terms checkbox, Create account, OR phone, Go back.

**Landing** (`sarvam.ai`): announcement bar; nav (logo, Products / Developers / Resources / Company mega-menus, Log In
dark pill, Contact Us light pill); hero on an orange-to-blue gradient wash with ornament, eyebrow chip, serif h1
"AI for all from India", two-line subtitle, Sign up + Contact Us; logo strip "India builds with Sarvam"; then sections:
platform overview, "Intelligence, built around you" (tabbed product demos), **"Build anything with Sarvam APIs"**
(code card with Python / JavaScript / cURL tabs + Copy + "Get your API key & get started", next to a grid of API cards:
TTS, STT, Translation, Parse, REST API, Python SDK, Playground), "India Can", stats, enterprise cards, "run anywhere",
testimonials, Research & Updates (3 image cards), a dark gradient CTA band "Build the Future of India's AI" + Sign Up,
and a 5-column footer (Products, APIs, Resources, Company, Legal). Page height ~9,900px.

**Dashboard** (from screenshots): left icon rail (products) + a second nav column: product title + plan chip
("Free plan"), search (⌘K), API Keys, MCP, Model Catalogue, Usage, Billing, Pricing; "API Playground" group (TTS, Voice
Cloning, STT, Dictate, Translate, Document Intelligence, Dubbing); "More" (API Status, Documentation, What's new);
avatar bottom. Header: page title left, Feedback + primary action right.

- **API Keys**: table Name (key icon + name) / Key (`sk_xxxxxxxx****` chip: prefix + first 8 chars then mask) /
  Created (sortable) / Last Used ("—" if never) / row menu (...). "Create API Key" dialog: "Name this key to identify
  it later", one input (placeholder `e.g., production-app`), Create key.
- **Billing**: "Pay as you go" card + View plans; balance card (e.g. 61.76 "Credits left") + Add credits; payments
  table with empty state "No payments yet". **Add credits** dialog: big number with − / +, quick chips +1,000 / +5,000
  / +10,000, Cancel / Continue.

**Dashboard, read signed in (2026-11-24, view only)**

- Layout: 56px icon rail (products) + 248px nav column, both white, on the warm `rgb(247,245,243)` ground; content
  in a white rounded panel. Nav groups: Home; **Build** (API Keys, MCP, Model Catalogue, Usage, Billing, Pricing);
  **API Playground** (one page per API); More (API Status -> status.sarvam.ai, Documentation -> docs); What's new.
  Header right: Feedback (outline pill) + page action (dark pill) + "Upgrade your plan" (pink pill).
- Speed: key-management TTFB 260 ms, DCL 300 ms, load 676 ms; client-side navigation between pages is instant.
- **Home**: "Start building with Sarvam" + Generate API Key + Documentation; a **"Paste this into any coding agent"**
  card (Cursor, Claude Code, Codex) with a ready prompt that installs the SDK, adds the key to `.env` (never
  printing it) and makes the first call; language picker + copy. Then "Explore" cards (Models, API Reference,
  Integrations, Build agents).
- **API Keys**: table rows 65px, 16px text, key chip in a grey pill 12px; row menu (...) offers Delete.
- **Usage**: filters (All models, Auto granularity, date range, refresh), "Download CSV"; two spend cards (API
  spend, total org spend, in ₹); "Usage breakdown" table: service (expandable) / quantity (chars, mins) / % of spend
  with a bar / spend; "Spend trend" line chart.
- **Billing**: plan card (Pay as you go + View plans); balance card (61.26 "Credits left" + Add credits); tabs
  Payment history / Billing details; status filter; empty state with an illustration, "No payments yet", View
  pricing + Add credits.
- **Model Catalogue**: featured model cards (icon, name, badges New / 50% off / type, feature list, prices per unit,
  Try model); tabs by category; cards per model.
- **Playground** (e.g. Translate): left = form (task select, input with character counter, parameter selects),
  full-width dark "Run request" at the bottom; right = **Code | Output** tabs, code language select, Copy, and code
  that updates live from the form values with `YOUR_API_KEY` as placeholder.

**API protocol** (docs.sarvam.ai)

- Auth header `api-subscription-key: <key>`, and `Authorization: Bearer <key>` accepted on all endpoints for
  OpenAI-compatible tools. Keys are created manually after sign-up; **the value is shown once** and cannot be
  retrieved later; lost key = delete and create a new one. No organisation keys yet.
- Errors: auth failure **403** `{"error":{"code":"invalid_api_key_error","message":"Invalid API key"}}`; out of credits
  **402** `insufficient_quota_error` (no retry clears it); rate limit **429** `rate_limit_exceeded_error` with
  `Retry-After`; 503 under load.
- Credits: ₹100 free for every verified user; credits never expire; 1 credit = ₹1; prices per 1M tokens per model
  (e.g. Gemma 4 31B ₹35 in / ₹10 cached / ₹90 out). Reasoning tokens billed as output.
- Rate limits: per account (all keys share), token bucket, per API; LLMs 50 req/min on pay-as-you-go.
- Quickstart: create key → `export SARVAM_API_KEY=...` → install SDK → first chat completion. Code shown in Python /
  JavaScript / cURL tabs everywhere.

## Study 2 - our code (verified 2026-11-24)

- **Keep as is**: auth pages (`(auth)/signin|signup|verifyemail|forgotpassword|resetpassword`, kit in
  `packages/auth/src/ui/auth-kit.tsx`), `/profile`, `/terms`, `/privacy`, `/accessdenied`. Google already wired
  (`GOOGLE_CLIENT_ID/SECRET`, callback `<origin>/api/auth/callback/google`). Email verification is required.
- **Credits already exist**: `billing_account` (cached `credit_balance`), `credit_ledger` (grant / purchase / spend /
  refund, idempotency key), `ai_usage_log`; `packages/billing/src/ledger.ts` `accountForUser` (grants
  `PLANS.free.monthlyCredits`, now 500, once as `welcome:<id>`), `addCredits`, `hasCredits`, `spendCredits` (no-ops
  unless `CREDITS_ENFORCED=1`). 1 credit = $0.001 today. Checkout + 5 gateways (eSewa, Khalti, Razorpay, Cashfree,
  Stripe) and `/settings/billing` exist. Admin can grant credits.
- **AI layer is Anthropic-only**; `/ai` chat (tools, cards, right column) stores `ai_conversation` / `ai_message`. The
  composer and transcript components can be reused for the playground; tools/cards/peeks are not needed.
- **No API key table.** Helpers exist: `sha256Hex` (meant for indexing API keys), `safeEqual`, header-auth pattern in
  `packages/cron/src/runner.ts`.
- **Routing trap**: `apps/main/middleware.ts` only skips `/api/`, so `/v1/chat/completions` would redirect to
  sign-in. Plan: one dispatcher route `app/api/v1/[...path]/route.ts` + a `next.config.js` rewrite `/v1/:path*` →
  `/api/v1/:path*` (same as `/api/sign-out`).
- **Env**: `apps/main/.env.local` does not exist (only `.env`); every db script reads `.env.local`. Fonts today: Geist
  + Geist Mono (`next/font/local`).
- **Inference**: llama-server with Gemma 4 E4B on the Mac; reachable through a quick tunnel (random URL, **no SSE**,
  so no streaming) or a named tunnel (fixed URL on a Cloudflare domain, streaming works).

## Decisions (owner, 2026-11-24, via the question picker)

### Product
| # | Decision |
|---|---|
| Q1-2 | Name **Boli**, tagline **"Open AI for Nepal"**. |
| Q3 | Domain **bolihq.com**, bought **after v0 works locally** (then named tunnel + streaming). |
| Q4 | Developers first, but the chat page must be excellent. **Web search tool = first tool, later** (after v0 is stable). |
| new | **Only our own open models in the product.** No Claude/OpenAI/closed model behind any feature. |
| Q56+ | The chat page is renamed **Kura** (कुरा, conversation), route **`/kura`** (was `/ai`). It is where people **land after sign-in**. **Home** (`/home`) is the activity overview. |

### Credits and pricing
| # | Decision |
|---|---|
| Q5 | **1 credit = Rs 1 (NPR).** |
| Q6 | **100 credits once, on email verification** (Google sign-ups are verified at creation). |
| Q7 | boli-chat: **2 credits per 1M input tokens, 6 per 1M output** (thinking tokens billed as output). Revisit after measuring real cost. Rs 100 ≈ 50M input or ≈ 16M output tokens. |
| Q8 | Kura chats cost the same as the API. |
| Q9 | At 0: API **402 `insufficient_quota`**; Kura shows "Add credits". A request already running finishes. |
| Q10 | Credits **never expire**. Q48: **NPR only**. |

### Auth and onboarding
| # | Decision |
|---|---|
| Q11-12 | Email + password, Google, email one-time code. Email verification required. Resend + Google keys already in env (owner). |
| Email | Sender `Boli <noreply@gurukulhq.com>` until bolihq.com is bought and verified in Resend. |
| Q13 | Terms checkbox required on sign-up. Terms + Privacy pages written properly (public side; later their own app). Company name + email: owner gives later (placeholders until then). |
| Q14 | **Keep `/welcome`, redesigned**: 4 steps, one per screen, progress dots, shadcn components; **every step offers choices + an "Other" input**; Skip allowed except step 1. Steps: (1) name + what to call you, (2) what will you build, (3) languages your users write in, (4) role + team size. |
| Q15 | Live password checklist (8 chars, a number, upper + lower). |

### Public pages
| # | Decision |
|---|---|
| Q16 | Landing story: hero -> the gap (no open Nepali AI) -> what Boli does -> live code sample (curl/Python/JS) -> Kura preview -> pricing -> FAQ -> CTA band -> footer. |
| Q17-18 | Hero: soft gradient + fine ornament (CSS/SVG). **Plus generated pixel-art Himalaya SVG** (mountains, prayer flags, stupa, Kathmandu skyline) for the auth side panel and as an accent; generated by a script, both themes. |
| Q19 | Announcement bar: "Gemma 4 for Nepali is live - 100 free credits. Try it now". |
| Q20 | Nav: **Kura**, API, Pricing, Docs + Log in (light pill) + Get API key (dark pill; "Open Kura" when signed in). Public copy calls the chat "Kura" with a subtitle ("chat with Boli's model in Nepali, English or both"). |
| Q21-22 | Footer: Product, Developers, Company, Legal (only real links) + big wordmark. No logo strip; "Built in Nepal, for Nepal" facts instead. |
| new | **About page with Contact at the bottom** (one page, `/about`): why Boli exists, very professional reading layout, SVG art; contact form saved to the DB. |
| Pricing | Landing pricing: 100 free credits (Rs 100), per-token prices, "what Rs 100 gets you", add credits any time, never expire. |

### Design (whole main app; AGENTS.md / apps/main/CLAUDE.md updated)
| # | Decision |
|---|---|
| Q23 | **Instrument Serif** (display headings) + **Inter** (UI/text) + **Geist Mono** (code), self-hosted with `next/font/local` (OFL woff2 files committed). |
| Q24 | Warm off-white ground, near-black ink, **Nepal crimson** accent used sparingly, deep blue secondary. |
| Q25 | **Pills** for buttons and inputs across the main app (admin unchanged). |
| Q26 | Dashboard light + dark; landing/auth/about/legal light-first. |
| Q27 | One rail: Kura, Home, API keys, Usage, Billing, Models, Docs; balance chip + profile at the bottom; Notifications bell kept. |

### Kura (chat)
| # | Decision |
|---|---|
| Q28 | API model id **`boli-chat`**, UI label "Gemma 4 E4B, 4-bit". |
| Q29 | Settings: system prompt (prefilled with the tested Romanized prompt), temperature, max tokens, top-p, top-k. |
| Q30, Q41 | Streaming built properly; it is tested and released once the named tunnel exists (quick tunnels cannot stream). Until then dev runs against `http://127.0.0.1:8080`, which streams. |
| Q31 | History saved in the DB with a list (rename, delete). |
| Q32 | Right column: **Settings** and **Code** (curl/Python/JS of the current chat, live, Copy) tabs **plus the existing History / Needs-you tabs**; keep the existing thinking/reasoning UI. |
| Think | **Thinking off by default; a "Think" toggle inside the composer** (like llama.cpp's web UI, which shows options inside the input). Thinking tokens billed as output. |
| AI | `packages/ai` rewired to our OpenAI-compatible llama-server provider; Claude removed from the main app. |

### API keys and API
| # | Decision |
|---|---|
| Q33 | `boli_sk_` + 32 random characters, shown once, stored as SHA-256 hash; list shows `boli_sk_ab12cd34****`. |
| Q34-36 | Max 10 keys; revoke keeps the row ("Revoked"); no scopes, no expiry. |
| Q37 | `POST /v1/chat/completions`, `GET /v1/models` (OpenAI-compatible). |
| Q38 | `Authorization: Bearer <key>` and `x-api-key: <key>`. |
| Q39 | OpenAI-shaped errors `{error:{message,type,code}}`: 400 invalid_request, 401 invalid_api_key, 402 insufficient_quota, 429 rate_limit_exceeded + Retry-After, 503 model_unavailable. |
| Q40 | **30 requests/min per account** (all keys + Kura share it). |
| Q51 | API calls: **metadata only** (no prompts/answers stored). Kura chats are stored (the user's own). |

### Dashboard pages
| # | Decision |
|---|---|
| Home | Stat band (credits left, requests today, tokens this week, active keys), 30-day usage chart (Kura vs API), recent activity (Kura chats + API calls; row opens a detail sheet), start-building card (create key, quickstart code, "paste into your coding agent" prompt). |
| Q49 | Billing: balance, Add credits, ledger of purchases + grants, spends summed per day. |
| Q47 | Add credits: Sarvam-style dialog (amount, - / +, +100 / +500 / +1,000) paying via **eSewa / Khalti sandbox** (public test credentials; owner pastes into env). |
| Q50 | Usage: totals band today / 7d / 30d; daily chart; request log; per-key breakdown; **every detail opens in a right-side sheet**. Q58: CSV later. |
| Q59 | **Models page with one card** (boli-chat: what it is, languages, price, limits, Try in Kura). |
| Q60 | Feedback button in the header: popover form saved to the DB. |
| Docs | Own module now (`/docs/...`), own domain later. Pages: Quickstart (with coding-agent prompt), Authentication + errors, Chat completions reference, Models + pricing + rate limits. |
| Q52 | **Delete Notes** (code **and** drop its table). Help replaced by Docs. Notifications kept. |
| Q53 | Admin: read-only API keys + usage totals on user detail; revoke a key; grant credits (exists). |

### Infra and process
| # | Decision |
|---|---|
| Q42 | Upstream `LLAMA_BASE_URL` in env (quick tunnel or 127.0.0.1 in dev); named tunnel `api.bolihq.com` after the domain. |
| Q43 | Local dev first (`pnpm --filter main dev`, :3100), staging Worker after. |
| Q44 | Database: **reuse the staging DB** from `apps/main/.env` (copy into `.env.local`, localhost URLs). Staging DB is not fresh, so **no `db:push`**: one additive SQL script, previewed then `--apply`, run twice. |
| Q54 | Shared contract by the lead, then **5 agents in parallel**, one typecheck + one Chrome pass. |
| Q55 | **One commit per finished area**, each approved by the owner; never pushed by Claude. |

---

## Contract (written by the lead before any agent starts)

**Units.** Credits are stored in **micro-credits** (1 credit = 1,000,000 µcr) in new `bigint` columns, so a
request costing 0.0036 credits is exact: cost µcr = input_tokens x 2 + output_tokens x 6 (µcr per token equals credits
per 1M tokens). 100 free credits = 100,000,000 µcr. Display: 2 decimals ("99.96 credits"), Rs equal.

**Data** (`packages/db/scripts/platform-v0.sql`, additive + idempotent; `packages/db/src/schema/platform.ts`):

| Table / column | Purpose |
|---|---|
| `billing_account.balance_micro bigint not null default 0` | cached balance in µcr (old `credit_balance` unused for Boli) |
| `credit_ledger.amount_micro bigint` | signed µcr per ledger row (grant, purchase, spend summary, refund) |
| `api_key` (id, user_id, name, prefix, key_hash unique, created_at, last_used_at, revoked_at) | keys; index (user_id) |
| `inference_request` (id, user_id, api_key_id null, source 'kura'/'api', model, conversation_id null, input_tokens, output_tokens, reasoning_tokens, cost_micro, latency_ms, status, error_code, created_at) | one row per model call, metadata only; index (user_id, created_at) |
| `feedback` (id, user_id, message, rating, page, created_at) | header feedback |
| `contact_message` (id, name, email, message, created_at) | About page contact form |
| `user_profile` onboarding fields (display_name, building, building_other, languages[], role, team_size) | onboarding answers (or columns on `user`, decided in task L3) |
| drop `notes` (+ its indexes) | Notes module removed |

New per-user tables are added to `packages/erasure/src/user.ts`.

**Spending.** One request = one `inference_request` row + an inline balance decrement in the **same statement**
(`db.batch`), idempotent on the request id; spends are summed per day for the Billing ledger view (query, not rows).
Grant: `afterEmailVerification` and Google `user.create.after` (emailVerified) call `grantWelcome(userId)` keyed
`welcome:<accountId>`.

**Routes and constants** (`apps/main/lib/navigation.ts`): `/kura`, `/kura/[id]`, `/home`, `/keys`, `/usage`, `/billing`,
`/models`, `/docs`, `/docs/[slug]`, `/about`, `/terms`, `/privacy`, `/welcome`, auth pages unchanged. API:
`app/api/v1/[...path]/route.ts` + `next.config.js` rewrite `/v1/:path*` -> `/api/v1/:path*`. Middleware: public = `/`, `/about`,
`/docs`, `/docs/*`, `/terms`, `/privacy` (+ auth pages); everything else needs a session. Signed-in users opening an auth page go to
`/kura`; on `/` they see the landing page with the nav's dark pill reading "Open Kura". Docs render in the public layout with a "Get API key" call to action.

**Model access** (`packages/ai`): provider `@ai-sdk/openai-compatible` (or plain fetch for the API proxy) with
`LLAMA_BASE_URL`, `LLAMA_API_KEY`; one model `boli-chat` -> upstream model id from env `BOLI_UPSTREAM_MODEL`.
`AI_TASKS` -> `boli-chat`; Anthropic provider, cache marks and Claude prices removed from the main app.

**Env** (names; owner fills values): `LLAMA_BASE_URL`, `LLAMA_API_KEY`, `BOLI_UPSTREAM_MODEL`,
`CREDITS_ENFORCED=1`, `API_RATE_LIMIT_PER_MIN=30`, eSewa/Khalti sandbox keys; `ANTHROPIC_API_KEY` no longer read by main.

**Design tokens** (`packages/ui/src/styles/globals.css` + `apps/main` theme): fonts Instrument Serif / Inter / Geist
Mono (variables `--font-display`, `--font-sans`, `--font-mono`); ground `#F7F5F3`, ink `#141414`, text `#333333`,
crimson accent (text-safe shade checked for contrast on the ground), deep blue secondary; pill radius for Button,
Input, SelectTrigger, Textarea in apps/main; dashboard dark palette defined alongside.

**Shared components** (built by E first, used by all): `BoliLogo`, `PixelHimalaya` (SVG), `CodeTabs`
(curl/Python/JS + Copy), `CreditsChip`, `FeedbackButton`, `AmountStepper` (Add credits), `DetailSheet` pattern.

---

## Interfaces (fixed before the agents start; owners in brackets)

Already in the tree (lead): `apps/main/lib/boli.ts` (prices, model, limits, copy, KURA_DEFAULTS, ONBOARDING),
`apps/main/lib/code-samples.ts` (`buildSamples`, `codingAgentPrompt`), `apps/main/lib/navigation.ts` (ROUTES, DOCS_PAGES,
MAIN_NAV), `apps/main/app/boli.css` + `fonts.ts` (tokens, pills, Inter / Instrument Serif / Geist Mono), schema
`packages/db/src/schema/platform.ts` + `balance_micro` / `amount_micro` / `ai_conversation.settings`, middleware
public routes + `/v1` excluded, `next.config.js` rewrite `/v1/:path*` and redirects `/ai` -> `/kura`, `/help` -> `/docs`.

Server helpers in `apps/main/lib/platform/` (all `import "server-only"`) [A]:
- `keys.ts`: `createApiKey(userId, name) -> { id, key, prefix, createdAt }` (throws AppError conflict at MAX_API_KEYS),
  `listApiKeys(userId) -> ApiKeyView[]` ({ id, name, prefix, createdAt, lastUsedAt, revokedAt }),
  `revokeApiKey(userId, id)`, `authenticateKey(token) -> { keyId, userId } | null` (updates last_used_at).
- `credits.ts`: `getBalanceMicro(userId)`, `grantWelcomeCredits(userId) -> { applied }`,
  `chargeInference(row) -> { requestId, costMicro, balanceMicro }` (one db.batch: inference_request insert + ledger spend
  row + balance decrement, idempotent on the request id), `hasBalance(userId)`.
- `ratelimit.ts`: `checkRateLimit(userId) -> { ok: true } | { ok: false, retryAfterSec }` (RATE_LIMIT_PER_MIN, counts
  inference_request rows in the last 60 s).
- `upstream.ts`: `upstreamChat(body, { stream, signal }) -> Response` (fetch to `LLAMA_BASE_URL/v1/chat/completions` with
  `LLAMA_API_KEY`, maps `boli-chat` -> `BOLI_UPSTREAM_MODEL`, maps `think`), `upstreamHealthy()`.
- `packages/ai`: `getBoliChatModel()` (AI SDK model via `@ai-sdk/openai-compatible`), Claude removed from main's map.
- `app/api/v1/[...path]/route.ts` (chat completions + models), auth hook grant, erasure lists, billing micro-credits.

Pages and their own actions/queries [B]: `lib/platform/usage.ts` (server-only usage/home queries),
`actions/keys.action.ts`, `actions/usage.action.ts`, `actions/billing.action.ts` (add credits), `actions/feedback.action.ts`,
`components/feedback/feedback-button.tsx`, pages `/home`, `/keys`, `/usage`, `/billing`, `/models`, admin read-only views.

Kura [C]: `app/(main)/kura/**`, `components/kura/**` (moved from components/ai), `lib/ai/**`, `actions/ai/**`,
`app/api/ai/chat/route.ts` (Kura's chat stream; uses `getBoliChatModel` + `chargeInference`).

Public [D]: `app/page.tsx` (landing), `app/(public)/about`, `app/(legal)/terms|privacy`, `app/(public)/docs/**`,
`actions/contact.action.ts`, and the brand kit `components/brand/`: `BoliLogo({ className, wordmark? })`,
`PixelHimalaya({ className, variant: "panel" | "hero" | "strip" })` (from `scripts/pixel-himalaya.mts`),
`Ornament({ className })`, `CodeTabs({ samples, className, defaultLanguage? })` (client, copy button).

Auth, onboarding, shell, cleanup [E]: `app/(auth)/**`, `packages/auth/src/ui/**`, `app/(onboarding)/**`,
`actions/onboarding.action.ts`, `app/(main)/_components/main-shell.tsx`, `components/shell/credits-chip.tsx`,
`actions/balance.action.ts`, settings pages except billing/usage, Notes and Help removal.

## Tasks

Status keys: `[ ]` open, `[x]` done with a Verified line, `[-]` dropped with reason.

### L - Lead (before agents)
- [x] **L1. Rules**: update AGENTS.md / `apps/main/CLAUDE.md` for Boli: pills, fonts, colours, open-models-only, Kura naming.
  - Acceptance: rules present; agents briefed to follow them.
  - Verified: `apps/main/CLAUDE.md` 'Boli rules' section and an AGENTS.md pointer written 2026-11-24.
- [x] **L2. Env**: create `apps/main/.env.local` from `.env` with localhost URLs; add new key names (empty) to all three env files; `pnpm env:check` passes (names only).
  - Verified: `.env.local` and `.env` written with 30 keys each (values never printed); GOOGLE_SECRET_ID renamed to GOOGLE_CLIENT_SECRET; generated BETTER_AUTH_SECRET / APP_ENCRYPTION_KEY / CRON_SECRET; staging URLs are `__PLACEHOLDERS__`. env:check not run yet (no .env.production, admin has no env files).
- [x] **L3. Schema**: the database turned out to be EMPTY (read-only check: 0 tables), so no SQL script: the schema itself changed (`platform.ts`, micro-credit columns, `ai_conversation.settings`, `notes.ts` deleted) and the owner runs `ALLOW_DB_PUSH=1 pnpm db:push` + `pnpm db:seed` at the end.
  - Verified: `information_schema.tables` count = 0 on host label `ep-cold-violet-bigh1how-pooler`, 2026-11-24.
- [x] **L4. Contract types + route constants + design tokens + fonts** in the tree so agents import them.
  - Verified: files listed under Interfaces exist; fonts copied from Fontsource (OFL).
- [-] **L5. Pixel Himalaya generator**: moved to agent D (brand kit) so it is built with the landing page that uses it most.
  - Verified:

### A - Data, API, metering, model provider
- [x] A1. `packages/ai` provider for llama-server (`boli-chat`), Claude removed from main's task map; reasoning on/off per request.
  - Verified (read, not typechecked): `packages/ai/src/boli.ts` (`getBoliChatModel`, `boliConfigured`, `boliProviderOptions`, `boliBodyParams`, `boliUpstream`), `@ai-sdk/anthropic` removed, `anthropic.ts` deleted, cache marks removed, `AI_TASKS` -> `boli-chat`, `runChatTurn` takes `settings`. Thinking per request = `chat_template_kwargs.enable_thinking` (Gemma 4 template variable, read from the GGUF); server must run with `--reasoning auto`, not `off`.
  - Still needs: a live call against llama-server with think on and off (V3).
- [x] A2. `packages/billing`: µcr ledger (`addCredits`/`ledgerEntrySql` on `amount_micro`/`balance_micro`, `grantWelcome`, `balanceMicroForUser`, `dailySpend`, `spendCredits` in µcr), no auto grant in `getOrCreateAccount`, `startCreditPurchase({ userId, credits, provider, returnUrl })` (NPR, ADD_CREDITS_MIN..MAX, eSewa/Khalti), purchase fulfilment N credits -> N x 1,000,000 µcr, admin grant in whole credits -> µcr; callers in admin + main fixed.
  - Verified: by reading every caller found by grep (`creditBalance`, `amount`, `MICRO_USD_PER_CREDIT`).
  - Still needs: typecheck (V1); a sandbox payment end to end (V2).
- [x] A3. Auth hook: `grantWelcome` inline in `afterEmailVerification`, `user.create.after` (verified, Google) and `user.update.after` (verified - covers the email-code path); keyed `welcome:<accountId>`. Sender display name "Boli" in `@repo/email` (`SITE.name <address>`).
  - Still needs: a real sign-up + verify showing 100.00 credits (V2).
- [x] A4. `/api/v1/[...path]`: Bearer + x-api-key, hash lookup, revoked + inactive-user check, last_used at most once a minute, rate limit from `inference_request` (API_RATE_LIMIT_PER_MIN), 402 when enforced, zod body (`schemas/chat-completions.ts`), stream + non-stream, model rewritten to `boli-chat`, charge inline (stream: at the end, before close), error rows cost 0, OpenAI-shaped errors, `/v1/models`, unknown path 404.
  - Still needs: the curl acceptance below (V3). Stream fallback: if no usage chunk arrives, output = delta count, input = 0.
- [-] A5. Server actions moved to B (keys/usage/billing/feedback), C (Kura), D (contact), E (balance); A supplies `lib/platform/{keys,credits,ratelimit,upstream}.ts` with the agreed signatures.
- Acceptance: curl with a new key returns an answer and charges µcr; bad key 401; revoked 401; zero balance 402; 31st request in a minute 429.

### B - Home, API keys, Usage, Billing, Models, Feedback, admin
- [ ] B1. `/home` (stat band, chart, recent activity + sheet, start-building card).
  - Built (agent B, 2026-11-24): `app/(main)/home/**` (StatBand credits / requests today / tokens this week / active
    keys; `components/platform/spend-chart.tsx` stacked Kura vs API credits per Nepal day, 30 days; recent Kura chats +
    API calls, row opens a keep-open sheet; start-building card with `CodeTabs`, coding-agent prompt + Copy, Create API
    key -> `/keys?create=1`). Old `lib/dashboard.ts`, `actions/dashboard.action.ts`, `home-view/home-skeleton` removed.
  - Open: not typechecked, not rendered (V1/V2). `CodeTabs` is light-only (white card) - looks like an island in dark mode.
- [ ] B2. `/keys` (table like Sarvam, create dialog -> shown-once view with copy, revoke via ConfirmPopover, revoked badge).
  - Built: `app/(main)/keys/**`, `actions/keys.action.ts`, `schemas/keys.ts`. Limit counts ACTIVE keys (same as
    `createApiKey`). The reveal view closes only through Done. Open: V1/V2.
- [ ] B3. `/usage` (totals band, daily chart, per-key breakdown, request log, detail sheet).
  - Built: `app/(main)/usage/**`, `lib/platform/usage.ts` (`getUsage`: one `db.batch` of 5 reads), `actions/usage.action.ts`,
    `schemas/usage.ts`, `components/platform/request-detail.tsx`. Window 7d/30d/90d + source chips in the URL via
    replaceState, keepPreviousData; band = today / 7 / 30 / 90 days. Days are Nepal days (fixed UTC+05:45). Open: V1/V2.
- [ ] B4. `/billing` (balance card, Add credits dialog with eSewa/Khalti sandbox, ledger with daily spend summaries).
  - Built: `app/(main)/billing/**` (History = ledger without spend rows + spends summed per Nepal day from
    `inference_request`; Payments tab = credit payments with a link to `/checkout/<id>`), Add credits dialog ->
    `startAddCredits` -> `startCreditPurchase` -> `launchCheckout` (moved from settings). `actions/billing.action.ts`
    rewritten (getBilling, startAddCredits, checkPayment kept for `/checkout`). `/settings/billing` and `/settings/usage`
    deleted; `/api/payments` fallbacks and `/checkout` back links now go to `/billing`. Open: V1/V2, sandbox payment.
- [ ] B5. `/models` (one card). B6. Feedback button. B7. Admin read-only keys + usage, revoke.
  - Built: `app/(main)/models/**` (card from `MODELS`), `components/feedback/feedback-button.tsx` +
    `actions/feedback.action.ts` + `schemas/feedback.ts`; admin `actions/user-platform.action.ts` (users:read /
    users:write, revoke audited) + "Usage" and "API keys" sections in `users/_components/user-sheet.tsx`. Open: V1/V2;
    the shell placement of FeedbackButton is agent E's.
- Acceptance: each page renders with empty and populated data, skeleton matches, phone width works.

### C - Kura
- [x] C1. Rename `/ai` -> `/kura` (routes, nav, links, redirects from `/ai`). `app/(main)/kura/**`, `components/kura/**`,
  `stores/kura-chat.store.ts`, `actions/ai/kura.action.ts`; robots, manifest, `lib/auth-routes.ts` point at `/kura`. Peeks
  (`components/peeks`, `lib/peeks`, `stores/peek.store.ts`) deleted with the Claude tools; the `/peek/*` redirect in
  `next.config.js` is now dead (lead: remove).
- [x] C2. Chat on boli-chat with streaming, Think pill in the composer (off by default, sets `settings.think`), reasoning UI
  kept (`ReasoningSteps` thought row), model chip in the input, meta line per reply (tokens in/out, credits, time).
  Route: session -> `checkRateLimit` -> `hasBalance` -> store -> `streamText(getBoliChatModel())` -> store reply ->
  `chargeInference` inline. Model down -> "Boli's model is offline" panel with Try again; the unanswered question is
  taken back. NOT verified against a running llama-server (no dev server run) - V2 must check streaming + reasoning.
- [x] C3. Right column: Settings, Code, History, Needs-you tabs (phone: one sheet). Settings per conversation, saved to
  `ai_conversation.settings` (debounced action; a new chat sends them with the first message). Code tab = `buildSamples`
  of the current chat + settings + draft, via `CodeTabs`.
- [x] C4. Conversations saved; history rename/delete; each turn charged (`source='kura'`, id = assistant message id);
  out-of-credits panel with Add credits. Needs you: verify email, credits out/low, no API key yet.
- [x] C5. Empty state: Kura + meaning + subtitle, KURA_SUGGESTIONS chips (Summarize seeds the composer), "Use this from code".
- Remaining: typecheck + Chrome pass (V1/V2); confirm usage is reported by llama-server in streams (else the route
  estimates tokens at 3 chars/token); `docs/ai.md` still describes the old Claude AI page.
- Acceptance: a chat in Kura is saved, charged, appears in Usage and Home.

### D - Public: landing, about + contact, legal, docs
- [x] D1. `/` landing in the story order, announcement bar, nav, gradient hero, code tabs, Kura preview, pricing, FAQ, CTA band, footer.
  Verified: code read back (agent D, 2026-11-24) - `app/page.tsx` + `app/_landing/*` in Q16 order; nav/footer in `components/public/` (session read in a Suspense boundary, "Open Kura" when signed in; phone menu = Sheet); pricing numbers computed from `lib/boli.ts` (`components/public/pricing.ts`). Brand kit in `components/brand/` (BoliLogo, PixelHimalaya + generated data from `scripts/pixel-himalaya.mts`, Ornament, CodeTabs + CopyButton). Pixel scenes checked as rendered PNGs from the script's PREVIEW dump. NOT typechecked, NOT opened in a browser (lead's pass).
- [x] D2. `/about` with contact form at the bottom.
  Verified: code read back - `app/(public)/layout.tsx` (PublicShell), `about/page.tsx` (research story, principles, TOC on lg, PixelHimalaya hero), `about/_components/contact-form.tsx`, `actions/contact.action.ts` (zod `schemas/contact.ts`, honeypot `website`, inserts `contact_message`, ok/fail). NOT typechecked; form not submitted against the DB.
- [x] D3. `/terms`, `/privacy` full text with placeholders for company/email, "review with a lawyer before launch".
  Verified: code read back - `packages/legal/src/documents.ts` rewritten for Boli (version bumped to 2026-11-24, so signed-in users are asked to accept again; `LegalContext.platform` added for credits/rate limit/payment methods), `(legal)/layout.tsx` = PublicShell, `legal-document.tsx` restyled with TOC and the "Draft - to be reviewed by a lawyer before launch" note while `template: true`. NOT typechecked.
- [x] D4. `/docs` module: Quickstart (+ coding-agent prompt), Authentication + errors, Chat completions, Models + pricing + limits.
  Verified: code read back - `app/(public)/docs/{layout,page,[slug]/page}.tsx`, `_components/{docs-nav,docs-mobile-nav,prose}.tsx`, `_content/*.tsx`; every number imported from `lib/boli.ts` / `code-samples.ts`; request fields and defaults matched against `schemas/chat-completions.ts` and `app/api/v1/[...path]/route.ts`. NOT typechecked, NOT rendered.
  Remains (D): lead typecheck + one Chrome pass at 1280 and 390px; dark-mode check of public pages (they force the light ground but some shadcn controls carry `dark:` classes); contact form has no rate limit beyond the honeypot.
- Acceptance: all public pages readable at desktop and 390px, no horizontal scroll, Lighthouse sane.

### E - Auth, onboarding, shell, design system, cleanup
- [ ] E1. Design tokens + fonts applied; pill controls in apps/main; shared components (BoliLogo, PixelHimalaya, CodeTabs, CreditsChip, AmountStepper).
  - Done by E: `components/shell/credits-chip.tsx` (`CreditsChip`, `useBalance`, `BALANCE_QUERY_KEY`). Tokens/fonts are the lead's (L4), BoliLogo/PixelHimalaya/CodeTabs are D's, AmountStepper is B's billing dialog - not E's to tick. Open until the lead's typecheck + browser pass.
- [x] E2. Auth pages restyled: split layout (pixel Himalaya panel + product card), Google first, live password checklist, terms checkbox.
  - Verified (code read, 2026-11-24; no typecheck or browser run - V1/V2): `AuthFrame` gained `panel` / `formMark` / `display="serif"` / `className` (admin untouched, defaults unchanged); `app/(auth)/_components/auth-panel.tsx` = `PixelHimalaya variant="panel"` + white card "Open AI for Nepal" with 4 rows; sign-in "Log in to Boli" (Google, OR, Password / Email code tabs, footnote + clickwrap line); sign-up Google -> OR -> email, name, password + `PasswordChecklist` (8 chars, a number, upper + lower; server rule still 8-128) + required `TermsCheckbox`, Create account disabled until valid, Google also asks for the box; verify / forgot / reset restyled through the same frame (reset uses the checklist). `AUTH_ROUTES.home` -> `/kura`. better-auth calls, returnTo, stale/reset/deleted notices, OTP and Google flows unchanged.
  - Terms acceptance is RECORDED on /welcome step 1 (`saveWelcomeName` -> `recordCurrentAcceptances`): sign-up has no session until the email is verified, so there is no safe earlier moment.
- [x] E3. `/welcome` 4-step onboarding (choices + Other input, progress, Skip).
  - Verified (code read): `welcome-flow.tsx` - progress bar in 4 parts + "Step n of 4", Back / Skip (steps 2-4) / Continue; (1) name + "what should we call you" chips (first name, full name, Other); (2) ONBOARDING.build multi + Other; (3) ONBOARDING.languages multi + Other; (4) role radio cards + Other, team-size chips; finish screen "You have 100 free credits" -> Open Kura / Create an API key. `actions/onboarding.action.ts`: `saveWelcomeName`, `saveOnboardingAnswers`, `finishOnboarding` (each `requireSession`); keys `onboarding.preferredName|build|languages|role|teamSize` in `lib/settings-values.ts` (old `onboarding.useFor` removed). (main) layout redirect to /welcome unchanged; onboarded -> /kura.
- [x] E4. Shell: rail items, balance chip, feedback slot, Notifications kept; Help removed.
  - Verified (code read): `main-shell.tsx` - brand = BoliLogo mark + "Boli"; rail = MAIN_NAV; footer = account chip, `CreditsChip` (figure on the chip, "N credits" in tooltip + aria; -> /billing; 60 s refetch, client-only), `FeedbackButton`, bell; account menu credits box reads the same query (Usage -> /usage, Add credits -> /billing), Help row removed; active item = inset 2px crimson bar + crimson icon via a `display: contents` wrapper (packages/ui untouched). `actions/balance.action.ts` `getMyBalance()` -> `getBalanceMicro`.
  - Depends on: A's `lib/platform/credits.ts` (`getBalanceMicro`) and B's `components/feedback/feedback-button.tsx` - neither existed when E finished.
- [x] E5. Delete Notes module code (pages, actions, lib, schemas, types, PDFs, nav, erasure entries).
  - Verified (code read + grep): deleted `app/(main)/notes/`, `actions/notes.action.ts`, `lib/notes.ts`, `schemas/notes.ts`, `types/notes.ts` (barrel was already empty), `notes.pdf` in the documents route, the Notes stat in `user-peek.tsx`; Help deleted (`app/(main)/help/`, `actions/help.action.ts`); settings nav lost AI usage + Billing (B's pages kept); docs/modules.md rows marked removed. Erasure entries are A's (packages/erasure).
  - Left for others: `app/(main)/home/home-view.tsx` + `lib/dashboard.ts` (B: ROUTES.notes/help/ai/settingsUsage, `notes` schema), `lib/ai/**` + `components/ai/welcome-config.ts` (C), `app/api/ai/chat/route.ts` + `checkout-result.tsx` (`ROUTES.settingsBilling`), docs/recipes.md, docs/architecture.md, docs/data.md, docs/README.md still name Notes / Help.
- Acceptance: sign up -> verify -> welcome -> land in Kura with 100 credits.

### V - Verification pass (lead)
- [x] V1. Typecheck the changed packages, at most two at a time.
  - Verified: 2026-11-24 `pnpm -r --workspace-concurrency=2 --filter main --filter admin --filter @repo/auth --filter @repo/ui --filter @repo/db --filter @repo/billing check-types` -> all Done, 0 errors (main includes `next typegen`); earlier the same over every package in packages/* -> all Done. Fixed during integration: a missing paren in lib/platform/usage.ts, nullable payment.account_id in checkout.ts.
- [x] Integration (lead): credits row in the rail (`railFooterTop` slot in @repo/ui shell + `CreditsRow`); server-side password rules (`packages/auth/src/password-rules.ts` + better-auth `before` hook on sign-up / reset / change / set password; Profile uses the checklist); public + auth + onboarding forced light (`forcedTheme` in providers.tsx); contact form 5/hour per hashed IP (`contact_message.ip_hash`); `/peek` redirect removed; CodeTabs dark mode; reminder emails link to /billing; unused `lib/usage.ts` + `getAiUsage` removed; exact-cost tooltip in Kura; /v1/models requires a key; default max_tokens 1,024; erasure deletes the billing account and keeps payments; docs/ai.md flagged as outdated.
  - Verified: the V1 typecheck above ran after these changes.
- [ ] V2. Chrome pass: every public page, auth flow (email + Google), onboarding, Kura chat, keys create/copy/revoke, usage, billing add-credits sandbox, models, docs, feedback; desktop + 390px.
- [ ] V3. External test: another project calls `/v1/chat/completions` with a key (OpenAI SDK, base URL changed).
- [ ] V4. Commits per area (owner approves each). Never pushed by Claude.

## Later (not v0)
- Web search as Kura's first tool. Usage CSV export. Named tunnel + `api.bolihq.com` + streaming release. Move
  landing/docs/legal to their own app/domain. Speech models (STT/TTS) on the same keys and meter.

## Notes / decisions
- 2026-11-24: Qwen 3.5 4B removed from the local Hugging Face cache (2.8 GB) at the owner's request.
- 2026-11-24: All owner questions are asked with the question picker from now on.
- 2026-11-24 (owner, via picker, after agent E): (1) terms acceptance recorded at onboarding step 1 for email sign-ups,
  Google sign-ups see the "By continuing you agree" line - accepted; (2) credits chip gets its OWN full-width row above
  the account row in the rail footer (small slot added to the shared shell) - integration task for the lead;
  (3) the password checklist (8+, a number, upper + lower) is enforced on the SERVER too (better-auth password
  validation in packages/auth/src/server.ts, after agent A finishes there) and Profile's change-password uses the same
  checklist - integration task for the lead.
- 2026-11-24 (owner, via picker, after agent A): GET /v1/models requires a key (done); /v1 is server-to-server only, no
  CORS - Kura calls the model through its own session route (/api/ai/chat), not /v1 from the browser; default
  max_tokens 1,024 when the caller sends none (done); account deletion removes the billing account (balance, ledger,
  subscription) and keeps payment rows with account_id set to NULL (payment.account_id made nullable, set null; done).
- 2026-11-24: llama-server must run with `--jinja --reasoning auto` (not `--reasoning off`) so Kura's Think toggle
  works per request via `chat_template_kwargs.enable_thinking`; docs/inference and deploy/hf-space updated.
- 2026-11-24 (owner, via picker, after agents C and D): legal policy values stay as the draft marked for lawyer review;
  public + auth pages are forced to light theme; the contact form gets a limit of 5 messages per hour per IP (hashed
  IP stored); a stream without usage is charged on an estimate of ~3 characters per token (logged); tiny per-reply costs
  show "< 0.01 credits" with the exact value in a tooltip. The legal version bump is harmless (empty database).
