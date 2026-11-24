# Architecture

How the pieces fit. Rules live in [`AGENTS.md`](../AGENTS.md); this file says where they are implemented.

```
                         Cloudflare (one Worker per app, wrangler.jsonc)
 browser --HTTPS--> apps/<app>/worker.ts
                     |- POST /api/sign-out --> 204 + cookies expired now; better-auth sign-out in waitUntil
                     |- scheduled(cron) ----> POST /api/cron/<slot> (Bearer CRON_SECRET, via WORKER_SELF_REFERENCE)
                     `- everything else ---> .open-next/worker.js (Next 16, webpack build)
                                               |- middleware.ts   cookie present? (never the DB)
                                               |- (main)/layout   getSession() (React cache, cookie cache 5 min)
                                               |                  + rail cookies + shell prefs -> AppShell
                                               |- loading.tsx     paints at once (layout never awaits page data)
                                               `- page.tsx        auth + reads -> initialData -> client useQuery
                                                      |
              @repo/db (drizzle neon-http, retrying fetch) --HTTP--> Neon Postgres
              @repo/storage (SigV4 fetch) -------------------------> R2 bucket R2_BUCKET_NAME (private, S3 API)
              @repo/ai (@ai-sdk/anthropic) ------------------------> Anthropic
              @repo/email (fetch) ---------------------------------> Resend
```

## Apps

| App | Owns | Key files | Depends on |
|---|---|---|---|
| `apps/main` (port 3100, cookie prefix `boli`, app.bolihq.com) | The product: `/` redirects (signed in -> `/kura`, else `/signin`), auth pages, `/welcome`, `/kura`, `/home`, `/keys`, `/usage`, `/billing`, `/models`, `/profile`, `/settings/*`, `/checkout/*`, the `/v1` API; API routes for auth, Kura, cron, documents, payments. Public pages are NOT here (apps/web); links to them go through `lib/web-links.ts` | `worker.ts`, `middleware.ts`, `next.config.js`, `wrangler.jsonc`, `app/(main)/layout.tsx`, `lib/navigation.ts`, `lib/session.ts`, `lib/ai/*`, `actions/*.action.ts` | ai, auth, billing, core, cron, db, email, erasure, errors, legal, payments, pdf, sarvamai, storage, ui, webdata |
| `apps/web` (port 3102, bolihq.com, no auth) | The public site: landing, about, contact (+ its one write), docs, terms, privacy, blog, models, guides, changelog, sitemap, robots, `/design` (dev only). Links into main through `lib/app-links.ts` (`NEXT_PUBLIC_APP_URL`) | `app/layout.tsx`, `lib/routes.ts`, `lib/app-links.ts`, `components/site-link.tsx`, `actions/contact.action.ts`, `wrangler.jsonc` (OpenNext worker, no worker.ts), `CLAUDE.md` | boli, brand, core, crypto, db, errors, legal, ui |
| `apps/admin` (port 3101, cookie prefix `boliadmin`) | Internal console: sign-in at `/`, invitations at `/join`, pages under `app/(main)/` | `worker.ts`, `middleware.ts`, `lib/permissions.ts`, `lib/admin-session.ts`, `lib/navigation.ts`, `actions/*.action.ts`, `actions/guard.ts` | auth, billing, core, db, email, errors, ui; tiptap (announcement editor), recharts, TanStack |

All three apps: Next 16.4.6 built with webpack (`next dev --webpack`, `next build --webpack`), `patches/next@16.4.6.patch`
applied through root `pnpm.patchedDependencies`, React 19.3.1 pinned by `pnpm.overrides`, one zod 4.6.7.

## Packages

| Package | What it owns | Key files | Depends on |
|---|---|---|---|
| `@repo/ui` | Shell, `Page`, sheets, tables, ReUI grid / filters, StatBand, charts, loaders, status screens, hooks, `globals.css` | `src/components/shell/`, `src/components/ui/page.tsx`, `src/styles/globals.css` | calendar, core, errors + Radix, TanStack, dnd-kit, recharts libs |
| `@repo/auth` | better-auth instance, session reads, client, cookies, sign-out, returnTo, auth UI kit, error sentences | `src/server.ts`, `next.ts`, `client.ts`, `cookies.ts`, `sign-out.ts`, `middleware.ts`, `return-to.ts`, `errors.ts`, `google.ts`, `ui/auth-kit.tsx` | core, crypto, db, email, errors, ui, better-auth |
| `@repo/db` | Neon HTTP client with retry, schema per area, seed, SQL runner | `src/client.ts`, `src/schema/*.ts`, `src/seed.ts`, `scripts/run-sql.mjs`, `scripts/guard-push.mjs` | errors, drizzle-orm, @neondatabase/serverless |
| `@repo/errors` | `ActionResult`, `ok` / `fail` / `failWith`, `AppError` + `errAuth` ... `errNetwork`, `classifyError`, `isTransient`, quota signal, `errorResponse` | `src/index.ts` | none |
| `@repo/core` | `SITE` (`./site`), typed fields, csv, geo, documents, `list/move-item` | `src/site.ts` | zod |
| `@repo/crypto` | scrypt passwords + `safeEqual` (`./password`), AES-256-GCM `encrypt` / `decrypt` (APP_ENCRYPTION_KEY), `sha256Hex` | `src/password.ts`, `src/index.ts` | none |
| `@repo/email` | Resend over fetch, typed `transactional` / `marketing`, layout helpers, templates | `src/send.ts`, `src/templates.ts`, `src/layout.ts` | core |
| `@repo/storage` | R2 over hand-rolled SigV4: keys, signed URLs, put / get / delete, `storageHref` | `src/r2.ts`, `src/href.ts`, `src/sigv4.ts` | none |
| `@repo/ai` | Task -> model map, model prices, thinking / effort, cache marks, `runChatTurn`, wire protocol, error classifier, usage sink | `src/config.ts`, `models.ts`, `anthropic.ts`, `cache.ts`, `agent.ts`, `protocol.ts`, `errors.ts`, `usage.ts` | errors, ai, @ai-sdk/anthropic |
| `@repo/billing` | AI usage meter + usage log + daily cap; plans, payments, ledger (see [`payments.md`](payments.md)) | `src/ai-meter.ts`, `src/usage-log.ts` | ai, core, cron, db, email, errors, payments |
| `@repo/payments` | Payment gateways (see [`payments.md`](payments.md)) | `src/` | db, errors, stripe |
| `@repo/cron` | Job registry, slot runner, `cron_run` log, `authorizeCronRequest` | `src/jobs.ts`, `src/runner.ts` | crypto, db |
| `@repo/legal` | Versioned terms / privacy (template text) and `legal_acceptance` | `src/documents.ts`, `src/acceptance.ts` | db, errors |
| `@repo/erasure` | `eraseUser` (files, rows in order, `erasure_request` record) | `src/user.ts` | db, errors, storage |
| `@repo/pdf` | pdf-lib layout kit, fonts, `renderDataTablePdf`, `pdfResponse`, `extractPdfText` (unpdf) | `src/*.ts` | pdf-lib, fontkit, unpdf |
| `@repo/sarvamai` | Sarvam over fetch: STT, TTS, translate, language detect, document OCR | `src/*.ts` | errors, fflate |
| `@repo/webdata` | `exaSearch`, `firecrawlScrape`, `firecrawlMap` | `src/exa.ts`, `src/firecrawl.ts` | errors |
| `@repo/calendar` | AD / Bikram Sambat formatting (`formatSchoolDate`, `formatAcademicYear`, `toNepalDateStr` ...) | `src/*.ts` | nepali-date-converter |
| `@repo/brand` | Boli's look for main and web: logo, mark, type, sky, Dhaka, pixel art (`art/*`, `art.css`), pill and quiet controls, editorial FAQ, code tabs, loaders, status screens, THE tokens `styles/boli.css` | `src/*.tsx`, `src/art/`, `src/styles/boli.css`, `scripts/` (pixel generator) | boli, errors, ui; Radix, framer-motion, shiki |
| `@repo/boli` | Boli's contract for main and web: prices, credit packs, limits, model info, brand copy, API code samples, Shiki highlighter | `src/boli.ts`, `code-samples.ts`, `highlight.ts`, `highlight-theme.ts` | shiki |
| `@repo/eslint-config`, `@repo/typescript-config` | Shared lint and tsconfig presets | `base.js`, `next.js`, `nextjs.json` | - |

## Request flow on Cloudflare

1. **`apps/<app>/worker.ts`** is wrangler's `main`. It wraps the OpenNext handler (`./.open-next/worker.js`, generated by
   `opennextjs-cloudflare build`, excluded from `tsc`).
   - `POST /api/sign-out` is answered here before Next: `isSameOriginRequest` (else 403), `signOutResponse` (204, every
     session cookie expired), and better-auth's own `/api/auth/sign-out` runs through the Next handler in `waitUntil`
     with the original cookies (`authSignOutRequest`), so the session row is still deleted.
   - `scheduled(event)` maps `event.cron` through `CRON_JOBS` (main: `'0 * * * *' -> /api/cron/hourly`,
     `'30 0 * * *' -> /api/cron/daily`; admin: none) and POSTs each with `Authorization: Bearer ${CRON_SECRET}` through
     the `WORKER_SELF_REFERENCE` service binding, one after another in one `waitUntil`.
2. **`middleware.ts`** (not `proxy.ts`; OpenNext rejects Node middleware). Cookie only, via `@repo/auth/middleware`
   (`isSignedIn`, `matchesRoute`, `signInRedirectUrl`, `signedInRedirectUrl`). Matcher skips `/api/`, `_next/*` and files
   with an extension.
   - main: `/` redirects (cookie -> `/kura`, none -> `/signin`); `AUTH_ONLY = /signin /signup /forgotpassword
     /resetpassword` (signed in -> `/kura` or a safe `returnTo`); `PUBLIC = /verifyemail` (the public site is apps/web,
     which has no middleware); the matcher also skips `/v1/`; everything else needs the cookie (else
     `/signin?returnTo=...`). `?stale=1` on an auth page expires the cookie instead of bouncing back.
   - admin: `/signin` redirects to `/`; `AUTH_ONLY = / /join` (signed in -> `/home`); everything else needs the cookie.
3. **Server layout** `app/(main)/layout.tsx`: main reads `getSession()` + `cookies()` in parallel, no session ->
   `/signin?stale=1`; `getShellPrefs(userId)` (`lib/settings.ts`, React-cached batch) -> not onboarded -> `/welcome`
   (outside the group, so no loop); then `MainShell` with `railPinnedFromCookie` / `railWidthFromCookie` and
   `AppearanceStyle` (density / reduced-motion CSS). Admin reads `getAdmin()` (session + `admin_access` row) and its
   rail cookies, then `AdminShell`.
4. **`loading.tsx`** paints at once because the layout never awaits page data.
5. **`page.tsx`** checks the session itself (`getSession()`; admin `requireAdminPage(module)`), reads, and hands
   `initialData` to the client.

Routes Next itself serves under `/api`: see [`modules.md`](modules.md#api-routes).

## Rendering and data pattern

- **Hybrid page**: `page.tsx` awaits auth + the reads (filtered by the user id) and passes them as `initialData` to a
  client `useQuery` under the SAME key; mutations `invalidateQueries`. Reference: `apps/main/app/(main)/notes/page.tsx`
  + `_components/notes-client.tsx` + `notes-query.ts` (`NOTE_KEYS`, one URL parser shared by server and client).
- **Query defaults** (`apps/*/app/providers.tsx`): `staleTime` 60s, `gcTime` 5 min, `refetchOnWindowFocus: false`,
  `retry: 1`; one client per tab (`useState`), `ThemeProvider`, `TooltipProvider`, one `Toaster` top-right.
- **Promises + `use()`**: the AI page starts History and Needs you as promises in `ai/_components/ai-route.tsx` and the
  client reads them with React 19 `use()` behind Suspense (`HistoryFromPromise`, `NeedsYouFromPromise`).
- **URL state without a server re-render**: Notes, Notifications and Profile tabs write the URL with
  `history.replaceState`; a URL-keyed query refetches with `keepPreviousData` and a dimmed list (AGENTS.md section 11).
- **Router cache**: `experimental.staleTimes: { dynamic: 60, static: 180 }` in `next.config.js`.
- **Skeletons**: each page's `loading.tsx` and the client's loading branch render the same component
  (e.g. `NotesSkeleton`, `AiPageSkeleton`, settings `PageSkeleton` + `settings-skeletons.tsx`).

## Auth model

- **One better-auth instance** in `packages/auth/src/server.ts`, drizzle adapter on `user` / `session` / `account` /
  `verification` with `transaction: false` (neon-http). Apps import only `@repo/auth*`.
- **Cookie prefix per app**: `next.config.js` `env: { AUTH_COOKIE_PREFIX: 'boli' | 'boliadmin' } (Boli: unique names so other local projects on localhost never share a session cookie)` is inlined everywhere;
  `advanced.cookiePrefix` uses it. Readers accept `<prefix>.session_token` and `__Secure-<prefix>.session_token`.
  Default `app` when unset. Rail cookies are also per app (`app_rail_hidden`, `admin_rail_hidden`, plus `_w` width).
- **Methods**: email + password (`requireEmailVerification`, min 8 / max 128, `revokeSessionsOnPasswordReset`, reset
  link 1h, verify link 24h, auto sign-in after verification); Google (`socialProviders.google` only when
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, `prompt: 'select_account'`, `accountLinking` trusts google);
  email one-time code (`emailOTP` plugin: 6 digits, 10 min, 5 attempts, stored hashed, `disableSignUp: true`). Last
  plugin: `nextCookies()`. Admin's sign-in offers password and code only (`apps/admin/app/_components/admin-signin.tsx`).
- **Passwords**: `@repo/crypto/password` `hashPassword` / `verifyPassword` (native scrypt in better-auth's format).
- **Session**: 30 days, `updateAge` 1 day, `cookieCache` 5 min (`strategy: 'compact'`). `getSession()` in
  `@repo/auth/next` is React-cached and returns null on a DB error; `getFreshSession()` skips the cookie cache;
  `requireSession({ fresh })` throws `AppError('auth')`. Main wraps these in `apps/main/lib/session.ts` (shapes the
  user, turns the avatar key into an href).
- **Hooks**: a deactivated user (`isActive = false`) gets no new session (`databaseHooks.session.create.before`);
  welcome email after verification or at creation for already-verified users, sent through `after()`.
- **Extra user fields**: `role` (`USER` | `ADMIN`), `isActive`, `bio`, `address`, all `input: false`.
- **Errors**: OAuth failures land on `/signin?error=<code>` (`onAPIError.errorURL`); `authErrorMessage` /
  `clientErrorMessage` in `@repo/auth/errors` turn codes into sentences. `googleMode()` (`@repo/auth/google`) returns
  `on`, `setup` (dev without keys: disabled button naming the variables) or `off`.
- **returnTo**: `safeReturnTo` (`@repo/auth/return-to`) allows same-origin paths only.
- **Client**: `authClient`, `signIn`, `signUp`, `useSession`, `useSignOut` from `@repo/auth/client` (no baseURL - each app
  serves its own `/api/auth`).

## The shell

`AppShell` (`@repo/ui/components/shell/app-shell`) with `ShellRail`, data model in `@repo/ui/lib/shell`:
- **Pin / peek**: pinned the rail takes its width; unpinned it slides in from a 12px left-edge strip. `Cmd/Ctrl+\`
  toggles. Cookie `"1"` = unpinned, read on the server (`railPinnedFromCookie`) so the first frame is right.
- **Rail width**: drag between `RAIL_WIDTH` 200-360px (default 240), stored in `<cookieName>_w`
  (`railWidthCookie`, `railWidthFromCookie`).
- **Phone (below lg)**: bottom tab bar (items with `tab: true`, else the first four) + More (the rail in a sheet).
- **Page box**: `<main data-app-main>` does not pad (`--app-pad-x/y: 0px` in `globals.css`) and publishes
  `--app-page-h: calc(100dvh - var(--app-chrome-b) - 2 * var(--app-pad-y))`, where `--app-chrome-b` is the 60px tab bar
  + safe area below lg and 0 from lg.
- **`Page` pads its own column**: `px-4`, centred `max-w-7xl`; `width="reading"` = max-w-3xl; `width="full"` lifts the
  cap; `bleed` (or `data-page-bleed`) takes the whole box with no padding (the AI page). `body="scroll" | "fill" | "page"`.
  A column shorter than the page publishes `--app-col-h` and `Page` uses it (Settings layout, AI chat column).
- Separation from the page is a soft shadow, not a hairline. Account row = profile link + sign-out button; bell opens
  `NotificationsPanel` (main: latest 10, `refetchInterval` 60s on the unread count).

## Errors

- Every server action returns `ActionResult<T>` built with `ok` / `fail` / `failWith` (`@repo/errors`); guards throw
  `AppError` (`errAuth`, `errForbidden`, `errNotFound`, `errValidation`, `errConflict`, `errRateLimit`, `errNetwork`).
- Kinds: `network auth forbidden notfound validation conflict ratelimit quota unknown`; `kindToHttpStatus` maps them;
  `errorResponse(err)` is the route-handler envelope (used by `/api/documents`).
- `classifyError` re-throws Next control flow, unwraps a wrapped `AppError`, detects provider quota (Neon 402 noted by
  `packages/db/src/client.ts` via `noteQuotaExhausted`), and treats transient errors as `network`.
- `error.tsx` at `app/` and `app/(main)/` in both apps renders `AppErrorView` (`@repo/ui/components/ui/app-error-view`):
  a transient error shows "Reconnecting" and retries once by itself; others show the safe message and the digest.
- Status pages: `StatusView kind="not-found" | "forbidden"` in `app/not-found.tsx`, `app/(main)/not-found.tsx`,
  `app/(main)/accessdenied/page.tsx` (admin: `AccessDeniedView` in `components/permission-gate.tsx`).
- Note: admin's older actions (`actions/admin.action.ts`, `system.action.ts`, `user.action.ts`) return their own
  `{ success, data?, error? }` shapes instead of `ok` / `fail`.

## Storage

- A stored file column holds an R2 **key** (e.g. `user.image` for an uploaded avatar). Keys come from
  `generateKey(prefix, ownerId, name)`; the owner is the second segment (`ownerFromKey`).
- Upload: a server action returns `getUploadUrl(key, contentType)`; the browser PUTs; the action saves the key
  (`apps/main/actions/profile.action.ts` `getAvatarUploadUrl` / `saveAvatar`).
- Render: `storageHref(value)` - URLs, app paths and data URLs pass through; with `R2_PUBLIC_URL` a public URL;
  otherwise `/api/documents/files/<key>` (`PRIVATE_FILE_ROUTE`). That route (`apps/main/app/api/documents/[...path]/route.ts`)
  checks the session, refuses `..`, requires `ownerFromKey(key) === user.id` or `role === 'ADMIN'`, and 302s to a
  5-minute signed URL (`getDownloadUrl(key, 300)`).
- `isStorageConfigured()` gates uploads (needs `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`). The wrangler `FILES` binding exists but `@repo/storage` uses the S3 API over fetch.
