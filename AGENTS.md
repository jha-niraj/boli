# AGENTS.md - working rules for this repo

The single source of rules for every agent and person. `CLAUDE.md` is one line that imports this file. **Add or change
rules here.** Each rule is the rule plus a one-line why; long history belongs in its `plan/` doc. Per-app rules live in
`apps/<app>/CLAUDE.md`. Every rule here was paid for in an earlier project (gurukulhq, synchq, vidhica, rakamhq, gymcrm).

New to this repo? Read `docs/README.md` first - it is the map; this file is the rules.

Plain hyphens (-) everywhere - code, comments, docs, UI copy. Never em or en dashes.

**Boli exceptions:** `apps/main` is the Boli product and has owner decisions that override parts of this file (pill
controls, Fraunces + Instrument Sans fonts, the sky accent, only our own open models). Read `apps/main/CLAUDE.md` before
touching that app. `apps/web` (the public site) follows the same Boli rules, light only - read `apps/web/CLAUDE.md`.

---

## 1. Working with the owner

### Ask with the question picker, never in prose
Use `AskUserQuestion` for every decision or clarification - prose questions get buried. Ask when approaches differ in a
way that changes the work, before anything hard to undo, and to offer follow-ups. Don't ask what the code or git history
can answer, don't ask permission to continue requested work, and don't ask a question with one sensible answer (pick it,
say so). Up to 4 questions per call, 2-4 options each, **recommendation first marked `(Recommended)`** with a one-line
reason, `multiSelect` when options combine, no "Other" option (the tool adds one), `header` max 12 chars, `preview` only
for things to SEE. A long explanation goes in its own message; a turn that ends with decisions ends WITH the picker.

### Write the plan file first
Before touching code, write `plan/<app>/<module>/<slug>.md` from `plan/TEMPLATE.md` (contract in `plan/README.md`). A
chat scrollback can't be checked for what was skipped; a file can.
1. Read `plan/` first. If a doc covers this job or a bug in it, append there - never a second doc.
2. Write it BEFORE the work, update it DURING. Written at the end it's a changelog.
3. `[x]` needs a `Verified:` line with what was run and what it printed. Unverified stays `[ ]` and says why.
4. Never delete a task: wrong, blocked or out of scope = `[-]` with the reason, in place.
5. One row in `plan/INDEX.md` per doc, status kept current.
Exempt: the request says "no plan", a pure question, or a follow-up note on an existing doc.

### Commits - one finished feature, asked first, never pushed
- A commit is a whole feature, finished end to end (data, server, screens, states, verified). Not one file, not one
  round of feedback - small fixes accumulate and go in WITH their feature, or as ONE batch commit at session end.
- Offer only when the feature is done, with the picker (recommendation first, what each option contains, plus "Not
  yet"). No clear yes = no commit. One approval = one commit.
- Stage by explicit path, never `git add -A` / `git add .` - other sessions may have changes in the tree.
- **Never push, never deploy** (`git push`, `wrangler deploy`, `pnpm deploy:*`). Name the command; the owner runs it.
- No AI attribution in commits, PRs or tags (no `Co-Authored-By` trailer, no "Generated with").

### Builds, lint, typecheck, dev servers
- Never run `pnpm lint`, `eslint`, `next build`, `opennextjs-cloudflare build` or any full build unprompted - the owner
  runs them. Never claim lint passes or it builds unless asked to check.
- Typecheck ONCE at the end of a task list, scoped to the changed files (a temporary tsconfig that extends the app's and
  `include`s only them), at most two packages in parallel. Mid-task only as a lookup ("does this type resolve?").
- Subagents never typecheck or build; the lead does it once per finished wave.
- Start a dev server only when a check needs it, only the one app, and stop every server you started when done.
- Code first, browser after: finish the code, then ONE browser pass (note, fix, re-check). Check phone width by
  rendering the page in a 390px iframe inside a tab - never resize the owner's browser.
- A single contained change is done directly - no subagents for small work.

### Secrets
Never print an env value, paste one in chat, or put one in a URL or log. Scripts print key NAMES and database host
labels only. Test credentials come from seed or example files, never from a real account.

### Never force a standard
When rolling a shared pattern out, leave out a screen it would make worse, and list it with the reason.

---

## 2. The repo

pnpm + Turborepo. Every app is a Cloudflare Worker (OpenNext). One Neon Postgres per environment.

| App | What it is | Port |
|---|---|---|
| `apps/main` | The product at app.bolihq.com - auth, onboarding, dashboard, Kura (signed-in users land on `/kura`), the `/v1` API | 3100 |
| `apps/admin` | Internal admin console (team, access, users, audit, system) | 3101 |
| `apps/web` | The public site at bolihq.com - landing, about, contact, docs, legal, blog, models, guides, changelog. No auth; links into main through `lib/app-links.ts` (`apps/web/CLAUDE.md`) | 3102 |

**Every app gets a distinct port** - `pnpm dev` silently loses a clash. Not 3000/3001: every other Next project on the
machine defaults there. A new clone picks its own block (3100s here) and changes it in package.json and `.env.local`. Shared code lives in `packages/` as
`@repo/<name>` (`ls packages`; each package.json `description` says what it owns):

| Package | Owns |
|---|---|
| `ui` | Every shared component, the shell, `Page`, sheets, tables, StatBand, loaders, status screens |
| `core` | Framework-free helpers (typed fields, csv, lists, site config) |
| `errors` | `ActionResult`, `ok` / `fail` / `failWith`, `AppError`, `classifyError`, `isTransient` |
| `db` | Neon HTTP client with cold-start retry, schema (one file per area), seed |
| `auth` | The ONLY owner of better-auth: server, client, cookies, sign-out, password |
| `crypto` | scrypt passwords, AES-GCM encrypt/decrypt, `safeEqual` |
| `email` | Resend over fetch; typed `transactional` vs `marketing` |
| `storage` | R2 (keys, signed URLs, `storageHref`) |
| `ai` | Task -> model map, prompt caching, chat agent stream, usage sink |
| `billing` | AI usage meter: prices every request at cache-read / cache-write / output rates |
| `sarvamai` | Sarvam over fetch: speech to text, text to speech, translate, document OCR |
| `pdf` | pdf-lib + fontkit layout kit and a data-table document; `unpdf` text extraction |
| `payments` | Stripe core (checkout, webhooks verified) |
| `cron` | Scheduled job registry behind `/api/cron/[job]` |
| `legal` | Versioned terms / privacy and acceptance records |
| `erasure` | Delete-my-account / tenant erasure |
| `webdata` | Exa search, Firecrawl scrape (for AI tools) |
| `calendar` | Date display helpers (`formatAppDate`; Bikram Sambat available for Nepal products) |
| `brand` | Boli's look, shared by main and web: logo, mark, type, sky tokens (`styles/boli.css`), Dhaka, pixel art, pill and quiet controls, code tabs, loaders, status screens |
| `boli` | Boli's contract, shared by main and web: prices, credit packs, limits, model info, brand copy, API code samples, the Shiki highlighter |

```bash
pnpm install
pnpm --filter main dev            # one app at a time; `pnpm dev` runs all
ALLOW_DB_PUSH=1 pnpm db:push      # FRESH database only (see section 6)
pnpm db:seed                      # super admin (password from SEED_ADMIN_PASSWORD or printed once)
pnpm env:check                    # after any env change
pnpm deploy:staging <main|admin|web|all>   # the owner runs deploys
```

---

## 3. Platform - Cloudflare Workers

- **Next 16 built with webpack** (`next dev --webpack`, `next build --webpack`). Turbopack copies shared server modules
  into each route chunk (59 vs 40 MiB measured). `patches/next@16.4.6.patch` stops every page's client components being
  recorded in every route's manifest (~20 MiB); moving to a new `next` means re-making the patch (`pnpm patch next@<v>`).
- **A Worker's limit is 64 MiB uncompressed.** Keep `"minify": true` and `"keep_names": false` in wrangler.jsonc, keep
  the server `splitChunks` hook in next.config.js, and prefer fewer route entries: one dispatcher route
  (`/api/cron/[job]`, `/api/documents/[...path]`) plus rewrites beats many `route.ts` files.
- **A `'use server'` file registers EVERY export as a public endpoint** on every route whose tree imports any of them.
  Guards and helpers never live in one (`server-only` modules instead); a file the shared layout imports holds only what
  the layout needs; it exports only async functions (anything else empties the module at build).
- **`middleware.ts`, not Next 16's `proxy.ts`** - OpenNext rejects Node middleware. It checks the session COOKIE only
  (both `better-auth.session_token` and `__Secure-better-auth.session_token`), never the database.
- **`nodejs_compat` stays** in every wrangler config (better-auth, Neon, AI SDK need it). `placement` sits next to the
  database region, not the visitor - a page makes several queries.
- **Fonts via `next/font/local`** with committed woff2 files, never `next/font/google` - a fonts.gstatic 404 failed a
  deploy once.
- **A promise left running after the response is cancelled.** Never `void promise()`; see section 5.
- Build traps `tsc` passes but `next build` fails: `.js` extensions on relative imports, non-function exports from a
  `'use server'` file, a `next/headers` lib imported by a client component, `useSearchParams` without `<Suspense>`.

## 4. Environments - read before touching env files, wrangler or a database

Each deployable keeps three files, because `--secrets-file` uploads all of a file to that Worker:

| File | Environment | Database | Worker |
|---|---|---|---|
| `.env.local` | your machine, localhost URLs | staging's | - |
| `.env` | staging, test payments, **no crons** | staging's | `<name>-staging`, wrangler top level |
| `.env.production` | production | its own | live name, wrangler `env.prod` |

- Deploy only with `pnpm deploy:staging <app|all>` / `pnpm deploy:prod <app|all>`. A bare `wrangler deploy` is staging
  by design. Never add a `deploy` script to an app. Pin `account_id` in every wrangler file.
- `pnpm env:check` after any env change: same keys in all three files, no localhost outside `.env.local`, production
  not on staging's database. A new key goes into all three files of every app that reads it. `pnpm env:set <prod|staging|
  local> <KEY>` sets a shared value at a prompt. `__LIKE_THIS__` = must be filled; a deploy refuses it. Blank = off.
- **A missing URL must not fall back to the live domain** - on staging that sends people to production. New URL keys go
  in the env files, not only in a `??` fallback.
- Local and staging share `BETTER_AUTH_SECRET` (one database); production's differs.
- Staging has empty `crons`; production's live under `env.prod`. Bindings do not inherit: a new binding goes in both.
- **Production database:** nothing writes to it but the owner. A script that can: previews by default, prints
  `Target database: <host label>`, writes only with `--apply`, is idempotent, prints counts plus a sample.

## 5. Where server work runs - decide BEFORE writing server code

Does the user need the result to continue, and how long can it take?
1. **Inline (`await`)**: they need it and it reliably finishes in a few seconds - saving a form, a small AI call, a
   credit charge.
2. **`after()` from `next/server`**: they don't see it, it's quick (well under 30s), losing one occasionally is fine -
   audit logs, analytics, best-effort notifications. On Workers this is `waitUntil`: capped at 30s, no retry. Never put
   money, a charge, or anything the user is told happened in it.
3. **A long job (30s+, must survive a closed tab, or must retry)**: a Cloudflare Workflow (or a Durable Object for a
   live object many clients talk to). The route stores the job row and returns; the job writes progress; the page polls
   with `refetchInterval`.
Never move small fast work into a long job "to be safe". Never `void promise()`.

## 6. Database

- **Neon over HTTP** (`@repo/db`). Workers have no raw TCP. `db.batch([...])` is one round trip; **`db.transaction()`
  throws** - use a batch, or sequential idempotent writes guarded by a unique index. The bounded cold-start retry in
  `packages/db/src/client.ts` stays.
- **`db:push` is for a fresh database only** (`ALLOW_DB_PUSH=1`). After that, every change is an additive, idempotent
  SQL script in `packages/db/scripts/`, run twice. Push applies every drift it finds, drops included.
- Schema: one file per area in `packages/db/src/schema/`, exported from `schema/index.ts`. Every tenant row carries its
  tenant id and every query filters by it.
- Browser code never imports the schema; plain value lists (enum values for a Select) live in a values module.
- Count round trips: no query in a loop; `cache()` per-request reads in `server-only` modules; 3+ independent reads
  in one `db.batch` or `Promise.all`.
- **Reads never write.** A render or prefetch can run on hover.

## 7. Auth

- `@repo/auth` is the SOLE owner of `better-auth`. Apps never import `better-auth/*` or list it in package.json.
- Sessions: cookie-first and memoised per request (`getSession()` wrapped in React `cache()`); writes and admin gates
  read fresh. The middleware only checks the cookie and never writes during render.
- Passwords: `@repo/crypto/password` (native scrypt, better-auth's format). Never bcrypt (0.8-1.5s per sign-in on Workers).
- Sign-out: `POST /api/sign-out` answered by `worker.ts` before Next (204 + cookies cleared at once, the real sign-out
  in `waitUntil`), plus a `useSignOut` hook. One short request instead of a page round trip.
- `returnTo` / `callbackUrl` goes through `safeReturnTo` (same-origin paths only) - an open redirect otherwise.
- Session expired mid-use -> `/signin?stale=1` with a plain sentence, never a raw error.
- Every `'use server'` export checks the session itself; the layout's check is not enough.
- Each app has its own cookie prefix so two apps on localhost never overwrite each other's session.
- Real OAuth errors are shown (a sentence per known code), never a generic "something went wrong".
- **An unconfirmed password is dropped when the email is first confirmed by a code** (better-auth's anti-takeover rule:
  someone could register your email with THEIR password before you). Verified 2026-11-23. Not a bug: the person sets a
  password again from Profile > Security ("Set a password"). Don't "fix" it by keeping the password.

## 8. Code conventions

- **Never `any`.** Drizzle: `typeof x.$inferSelect` / `$inferInsert`; jsonb is `unknown` then narrowed; enums
  `typeof xEnum.enumValues[number]`. Types live in `apps/<app>/types/` (barrel `index.ts`).
- **Errors:** every server action / route handler returns `ActionResult<T>` via `ok` / `fail` / `failWith` from
  `@repo/errors`. Guards THROW `AppError`, never return. Each app's `error.tsx` uses `classifyError`.
- **Schemas** (zod) live in `schemas/`, never in a `'use server'` file. zod is pinned to ONE 4.x via `pnpm.overrides` -
  two copies break the AI SDK's tool generics.
- **Files:** a stored file column is an R2 **key** (`*Key`), not a URL (`*Url`). Render through `storageHref()`.
- **Email:** never a literal `from:`; `@repo/email` reads `RESEND_FROM_EMAIL`. Typed by kind: marketing requires an
  unsubscribe URL, transactional forbids one. No key = skipped (logged), never a crash.
- **Money** is integer minor units (cents / paisa). Never floats, never a tolerance compare.
- **Dates:** store UTC instants; display through `@repo/calendar` (`formatSchoolDate`, `formatSchoolDateTime` - the
  names are historical; they format any date in the tenant's calendar and timezone) or `RelativeTime`.
  In a client component never format with the browser's locale (`toLocaleDateString(undefined, ...)`): the server
  and the browser print different strings and the page throws a hydration error. Pass a fixed locale AND `timeZone`,
  or use `RelativeTime`.
- **Env errors name the missing variable** ("R2_BUCKET_NAME is not set"); whitespace-only counts as missing.
- **HTML from users** is sanitized before rendering; rendered rich text uses the `rte-output` class, not `prose`.
- **Secrets compare in constant time** (`safeEqual`); third-party tokens are encrypted at rest (`encrypt`).
- **Every `revalidatePath` names a route that exists.**
- **App page URLs have no hyphens** (`/forgotpassword`, `/systemsettings`); `/api/` paths and marketing URLs may.
- Server Components by default, `"use client"` only where needed. **All hooks above any early return.**

## 9. Any number shown to a user

- Aggregates name their window: return explicit buckets (today / last 7 / last 30 / this month / all time).
- Zero for the requested window IS the answer - never widen the window because zero looks bad.
- Count the right entity: 198 invoices across 117 customers are two facts.
- No data is not a zero: "not recorded yet", not "0%".

---

## 10. UI

### Surfaces and colour
- Neutral chrome. Cards are `bg-white dark:bg-neutral-900`, `border-neutral-200 dark:border-neutral-800`, whatever
  their state; words carry the state. Colour only where it IS the datum (a chart series, a +/- delta, a status dot,
  a success toast). One brand accent, used sparingly.
- `neutral-*` only (never `slate-*`/`gray-*`). Light-mode muted text is at least `neutral-600` on off-white grounds.
- No black islands in dark mode; page ground `bg-white dark:bg-[#121314]`.

### Typography and radius
- Page `<h1>` `text-xl font-semibold`, never a responsive step-up. Section headings and SheetTitle `text-base
  font-semibold`. Descriptions `text-xs`. Body `text-sm`. **`font-semibold` is the ceiling; nothing below `text-xs`.**
- `text-md` is not a Tailwind class (compiles to nothing).
- Controls (Button, Input, SelectTrigger, Textarea) `rounded-xl`. `rounded-full` only for real shapes (avatars, dots,
  chips, round icon buttons). Sentence case; no `uppercase` labels.

### The shell (`@repo/ui/components/shell`)
- **Flush and square.** The rail is fixed to the left edge, the page is one flat canvas - no rounded card frame, no
  inset, no rounded right panel. **The rail and any right column separate from the page by a soft SHADOW, not a
  hairline** (owner, 2026-11-23: the hairline did not look good).
- The rail **pins or peeks**: pinned it takes 240px; unpinned it hides and slides in on a left-edge hover. `Cmd/Ctrl+\`
  toggles. The state lives in a cookie read on the server, so the first frame is right (no flash).
- Phone: a bottom tab bar (4 links + More, which opens the rail in a sheet); safe-area padding.
- The shell publishes `--app-page-h` (from `100dvh`) and does NOT pad: the page area takes the whole space beside the
  rail. `Page` pads its own header and content column (`px-4`), and its scroll area runs to the screen edges.
  **A page root never adds padding of its own.** `width="reading"` = one max-w-3xl column for forms and settings.
- Route groups mirror the sidebar, one guard each; moving a module out of a group can silently drop its guard.

### Pages - every page is `Page` (`@repo/ui/components/ui/page`), its loading state `PageSkeleton`
- ONE header row at every width: title, badges and a one-line `description` truncate (full text in a Tooltip on hover,
  a popover on tap). Tabs on the RIGHT of the header, synced to `?tab=`, one dropdown below `xl`. `actions` collapse
  into one "More" menu as the width shrinks, the primary stays. `back` on a detail page. Never a hand-rolled `<h1>`.
- Centred at `max-w-7xl`; `width="full"` only for a genuinely wide workspace (split editor, board, the AI page).
- `body="scroll"` (header fixed, body scrolls), `"fill"` for a page that bounds its own panes, `"page"` for a dashboard
  that scrolls as a whole.
- Cards 12px apart (`gap-3`), sections 16px (`gap-4`). Sections are flat; list rows are divider rows.
- **Change a page's header and its skeleton in the same edit** - nothing warns you and the page jumps.

### Scrolling, lists, tables
- `ScrollArea` from `@repo/ui`, never native `overflow-y-auto`. Never `h-screen` or `h-full` (Radix ScrollArea's
  `display: table` box breaks percentage heights) or a hand-rolled `calc(100vh - ...)`: use `--app-page-h` and flex
  (`flex-1 min-h-0 min-w-0`). `min-w-0` wherever `truncate` is used.
- **Every list has a ceiling**: content height up to a rem max (`viewportClassName="max-h-[44rem]"`, about 10 rows),
  then it scrolls inside. Never screen-bound. The max height goes on the VIEWPORT (on the Root it clips without
  scrolling). Pagination sits OUTSIDE the ScrollArea; its buttons disable, never hide.
- Tables: wrap in `<ScrollArea orientation="horizontal">` with a `min-w-[...]` inner element; sticky header row; a
  row-action column pins to the END (`pin="end"`), never the first column. Never `overflow-x-auto`.
- Kanban: one horizontal ScrollArea round the columns, each column its own vertical ScrollArea.
- Reordering is drag and drop (`SortableList`), never up/down arrows.
- Side-by-side panels end at the same bottom.

### Sheets, popovers, dialogs - nothing expands in place
- **A list item with 2+ fields is edited in a right-side Sheet**, never expanded inline. The Sheet is non-modal; every
  row that opens it carries `data-sheet-keep-open`, so pressing another row SWAPS the sheet to that item. One-line items
  stay inline. Forms of 3+ fields open in a sheet.
- Sheet body starts at the sheet's gap (no top margin of its own). The footer is `SheetFooter`, a band whose hairline
  runs edge to edge; a form sheet's `<form>` wraps the scroller AND the footer so Save never scrolls away.
- A sheet's content resets in `onExitComplete`, not `onOpenChange(false)` (it collapses while sliding out). Closing a
  route-driven sheet navigates to a destination worked out once at mount, after the exit animation - never
  `router.back()`. On a phone, a sheet left open closes on pathname change.
- **Routine confirms and choices: a popover on the button** (`ConfirmPopover`). Dialogs only for big or irreversible
  actions. Never native `confirm` / `alert` / `prompt`. A confirm from a menu opens after the menu closes.
- Toasts top-right, transient. Sheets don't pop the phone keyboard on open.

### Toolbars, tabs, filters
- Toolbar left to right: search, filters, then tabs/actions. A long chip set is ONE button with a (searchable)
  dropdown. **On a phone the toolbar is one row**: search stays, everything else goes into one menu button.
- URL filters, tabs and pagers never `router.replace` the same page: data already loaded -> `history.replaceState`;
  otherwise a URL-keyed query with `keepPreviousData` and a dimmed list.

### Headline numbers, charts, empty states
- Headline numbers are ONE `StatBand` (`{ icon, label, value, hint?, tone?, href? }`), never a row of stat cards. Its
  skeleton is `StatBandSkeleton` with the same count. `tone` tints only the value, only when it carries a state.
- A module's first page opens with a StatBand; charts only when the page answers "how is this going" and the chart
  shows what the band cannot (a trend or a split). One metric per chart, real units, neutral ink with the accent on
  the one datum, `ChartEmpty` when there is nothing. Charts sit in a parent with a set height (ResponsiveChart).
- One shared `EmptyState`. Nothing to do shows nothing - never an empty panel with a zero.

### Controls
- shadcn controls from `@repo/ui` everywhere - never a native `<button>`, `<select>`, `<input type="date|time">`.
  `DatePicker` (`YYYY-MM-DD`), `TimePicker` (`HH:mm`). Grep new files for `<button`, `<select`, `<input` before done.
- `cursor-pointer` on everything clickable. Every dynamic Select has an `emptyMessage`.
- Textareas grow with content (`field-sizing-content`). Add-forms clear only the submitted values.
- Toggle icons are drawn from state.

### Loading states - pick by size
| What is loading | Use |
|---|---|
| A control's own action (submit, row save, toggle) | Inline loader inside the control |
| A region with a shape (list, panel, table, form, chart) | **Skeleton shaped like that layout** |
| A whole page / route transition | `AppLoader` (the flow loader family) |
- Every functional page has a `loading.tsx` drawn to its exact layout with the real static title (grey only data);
  `loading.tsx` and the client's loading branch share ONE skeleton component.
- Never a centred spinner where a region loads. `isFetching` is a quiet hint, not a skeleton.
- Status screens: `StatusView` for 404 / 500 / 403 (the drawing says what happened; the asked-for path; actions).

## 11. Data fetching and navigation speed

- **A read starts on the server, never in a `useEffect`**: a block streamed behind its own `<Suspense>`, or a promise
  started in `page.tsx` and read with React 19 `use()` in the client.
- Authenticated pages are hybrid: `page.tsx` awaits auth + tenant filtering and passes `initialData` to a client
  `useQuery` under the SAME key. TanStack defaults: `staleTime` 60s, `gcTime` 5min, no refetch on focus, `retry: 1`.
  Keys `["<module>", "<name>", ...params]`. Mutations invalidate, never hand-splice. Throw in `queryFn` on failure.
- A layout never awaits page data (it sits above `loading.tsx` and blocks the skeleton). The header paints first.
- Links are `AppLink` (`@repo/ui/components/app-link`) - prefetch the shell on intent; the rail uses
  `useStaggeredPrefetch`; one `NavProgress` per shell. Before a programmatic `router.push`, call `markNavPending(href)`.
- No new API route for a read a Server Action can do (each route entry costs Worker size).
- A failed refresh shows an inline note and keeps the page.

## 12. AI

### Cost (measured: 5.51 -> 0.28 credits per turn in one app; 2.5 -> 0.4-0.8 in another)
- **One task -> model map** (`packages/ai/src/config.ts`), never a model id at a call site. Everyday work (chat,
  summaries, classification) on the small model (Claude Haiku 5.5); the big model only for heavy work, and a task moves
  only after looking at its output on real inputs.
- **Thinking is the same on every turn of a conversation.** Switching thinking (or effort) between turns invalidates
  the whole cached prefix. Thinking per model lives in one helper (Haiku: `disabled` or adaptive; Sonnet: off is
  `between_tools`; Opus cannot turn it off). Effort set explicitly per task.
- **Prompt caching is a prefix match: tools -> system -> messages.** The system prompt and tools are frozen text (no
  dates, names, ids, counts) in a fixed order; a tool that only applies on some pages stays in the list and answers
  "nothing open". Per-turn context (who, which page, today's date) goes AFTER the history as a late system message.
  Breakpoints: after the static start (1-hour TTL), on the last user message, on the latest tool result.
- **Verify with numbers, not by reading code**: the dev log `[ai cache]` prints read / write / hit per request; reads
  must be > 0 from the second request on. If not, diff two consecutive request bodies.
- A failing tool is removed for the rest of the turn after its first outage; steps are capped.
- Every call writes a usage row (`ai_usage_log`) priced at its real rates (cache read, 5-minute and 1-hour cache
  write, output). Reduce real cost first - never paper over it with pricing.
- Out of credits (402) is said plainly with a top-up button, never "Connection failed".

### The AI page (`apps/main/app/(main)/ai`)
- Full-page chat with a right column. Questions, confirmations and forms open IN THE COLUMN; the chat keeps a one-line
  pointer ("3 questions - waiting for you on the right" -> "Answered"). The column also holds peeks (quick looks at a
  record from a link in a reply) and the tabs History / Needs you.
- **A card is a helping hand, never a blocker**: it never disables or covers the composer; typing instead always works.
- **Pressing a card button sends a MESSAGE**, never performs the write - the server's guards and audit stay intact.
- Chat is for decisions and lookups, not data entry: grids, uploads and per-row choices stay on their screen; the tool
  is a read plus a link. A write creates at most five things (more can't be checked on a card).
- Redirect, never dead-end: a screen-only capability gets one line plus a link button built from a route constant.
- A count question gets the number, not the list; list rows only when a list was asked for.
- Nothing scrolls sideways in the chat or the column (`min-w-0`, `truncate`, vertical-only ScrollArea).
- Token frames coalesce to one state update per animation frame. Tool calls are saved with the message so a refresh
  re-renders them.

## 13. Copy

Write from the user's side: name things by what people recognise, not how the system is built. Active voice; a button
says exactly what happens ("Save changes", then a toast "Saved"). Errors say what went wrong and how to fix it, no
apologies. A page description is one line.

## 14. Public pages, performance, accessibility

- Mobile score is decided by main-thread JavaScript, not images. `dynamic()` splits the chunk but does not defer the
  work; never `dynamic({ ssr: false })` for page content (CLS). Never animate the LCP element from opacity 0.
- Contrast is a pair - name the background. Brand colours that fail as text get a darker text variant.
- Manifest icons declare real sizes. No skipped heading levels. Every page has a `<title>`.
- No smooth-scroll library (native `scroll-behavior: smooth`). Respect `prefers-reduced-motion`.
- Measure Lighthouse in Incognito with extensions off.
