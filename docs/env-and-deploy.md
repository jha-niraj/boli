# Environments and deploy

Rules: [`AGENTS.md` section 4](../AGENTS.md#4-environments---read-before-touching-env-files-wrangler-or-a-database) and
[section 3](../AGENTS.md#3-platform---cloudflare-workers). Never print a value; scripts print key names and the
database host label only.

## Three files per app

| File | Environment | Read by |
|---|---|---|
| `apps/<app>/.env.local` | your machine (localhost URLs; staging's database) | `next dev`, every `@repo/db` script (`dotenv -e ../../apps/main/.env.local`) |
| `apps/<app>/.env` | staging (wrangler top level, `<name>-staging`, no crons) | `pnpm deploy:staging` |
| `apps/<app>/.env.production` | production (`env.prod`) | `pnpm deploy:prod` |

All `.env*` files are git-ignored. `__LIKE_THIS__` = still to fill in (a deploy refuses it). Blank = off (and is not
uploaded as a secret).

## Keys that exist today

Main has every key below; admin has the first group only (DATABASE_URL ... R2_PUBLIC_URL). Web (the public site) has
exactly three: `DATABASE_URL` (the contact form), `NEXT_PUBLIC_SITE_URL` (its own origin, bolihq.com) and
`NEXT_PUBLIC_APP_URL` (main's origin, app.bolihq.com: every Log in / Sign up link and the API base URL in docs).
Main also has `NEXT_PUBLIC_WEB_URL` (the site's origin: Docs, Terms, Privacy, About, Contact links via
`apps/main/lib/web-links.ts`).

| Key | Apps | Required? | What it does / what turns on when set |
|---|---|---|---|
| `DATABASE_URL` | main, admin | required | Neon connection (`@repo/db`). env-check requires it equal across apps per file |
| `BETTER_AUTH_SECRET` | main, admin | required | better-auth signing; local and staging share one |
| `BETTER_AUTH_URL` | main, admin | required | This app's origin (its `/api/auth`, links in emails) |
| `NEXT_PUBLIC_SITE_URL` | main, admin | required outside dev | `SITE.url` (`@repo/core/site`; falls back to `http://localhost:3100`), trusted origin |
| `MAIN_APP_URL`, `ADMIN_APP_URL` | main, admin | required outside dev | Trusted origins; `ADMIN_APP_URL` builds the `/join` link in invitations |
| `APP_ENCRYPTION_KEY` | main, admin | required for `encrypt` / `decrypt` | 64 hex chars (AES-256-GCM, `@repo/crypto`) |
| `CRON_SECRET` | main, admin | required for cron | Bearer token for `/api/cron/*`; unset = every call refused |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | main, admin | optional | Both set = Google sign-in on; dev without = disabled button that names them |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | main, admin | optional | Email sent; unset = `skipped` (dev prints the mail text with its link / code to the console) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | main, admin | optional | Uploads (avatars) on; unset = upload controls hidden (`isStorageConfigured`) |
| `R2_PUBLIC_URL` | main, admin | optional | `storageHref` returns public URLs instead of `/api/documents/files/<key>` |
| `ANTHROPIC_API_KEY` | main | required for AI | Unset = the AI page says AI is not set up (503) |
| `AI_DAILY_USD_CAP_PER_USER` | main | optional | Per-person daily AI cost cap in USD (UTC day); blank = off |
| `CREDITS_ENFORCED` | main | optional | `1` = AI turns need and spend credits (payments work) |
| `EXA_API_KEY` | main | optional | Adds the `webSearch` tool and the "Search the web" welcome card |
| `FIRECRAWL_API_KEY` | main | optional | `@repo/webdata` scrape / map (no tool uses it today) |
| `SARVAM_API_KEY` | main | optional | `@repo/sarvamai` (no screen uses it today) |
| `SUPPORT_EMAIL` | main | optional | `/help` contact form destination; unset = the form says so |
| `OPENAI_API_KEY` | main | - | In the files; read by no code today |
| `STRIPE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_CURRENCIES`, `ESEWA_*`, `KHALTI_*`, `RAZORPAY_*`, `CASHFREE_*` | main | optional | Payments work - see [`payments.md`](payments.md) |

Set outside the env files: `AUTH_COOKIE_PREFIX` (`next.config.js` `env`, per app), `NODE_ENV`, `NEXT_DIST_DIR` (second
dev server), `ALLOW_DB_PUSH`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `DEPLOY_ANYWAY`.

## Env scripts (`scripts/`, run with tsx)

| Command | What it does |
|---|---|
| `pnpm env:check` | For every app in `APPS_WITH_ENV` (`scripts/env-files.mts`): all three files exist and carry the same keys, values that must agree across apps agree (`MUST_MATCH`: `DATABASE_URL`; `CROSS_MATCH`: web `NEXT_PUBLIC_APP_URL` = main `NEXT_PUBLIC_SITE_URL`, main `NEXT_PUBLIC_WEB_URL` = web `NEXT_PUBLIC_SITE_URL`), staging and local share a database, production does not, no localhost outside `.env.local`; lists placeholders still pending. Exit 1 on a problem |
| `pnpm env:set <prod\|staging\|local> <KEY>` | Prompts for the value once and writes it into every app whose file already has that key |
| `pnpm env:restore` | Puts back env files a killed deploy left as `*.deploy-bak` |

## Deploy (`scripts/deploy.mts`) - the owner runs it

`pnpm deploy:staging <main|admin|web|all>` / `pnpm deploy:prod <main|admin|web|all>`. Order: `admin`, `main`, then
`web` (`APPS` map; admin builds with 4096 MB, others 6144 MB `--max-old-space-size`). Guards, in order:
1. Refuses an app whose `wrangler.jsonc` has no real 32-hex `account_id`.
2. Refuses a missing env file, a `__PLACEHOLDER__` value, a localhost value, or (prod) a `.env.production` on the
   staging `DATABASE_URL`.
3. Prod only: must be on `main`, clean tree, not behind `origin/main` (`DEPLOY_ANYWAY=1` skips only these git checks);
   then you type `prod`.
4. Moves every `.env*` aside, stages the chosen file as `.env.production`, strips those keys from the process env, runs
   `opennextjs-cloudflare build [--env prod]` then `wrangler deploy [--env prod] --secrets-file .env.deploy-secrets`
   (non-blank keys only), and restores the files in `finally` (also on SIGINT / SIGTERM).

Never add a `deploy` script to an app. `pnpm --filter <app> preview` builds and runs the Worker locally
(`opennextjs-cloudflare build && opennextjs-cloudflare preview`).

## Wrangler layout (`apps/<app>/wrangler.jsonc`)

| Field | Value | Why |
|---|---|---|
| `account_id` | `"__CLOUDFLARE_ACCOUNT_ID__"` placeholder | deploy refuses until it is real |
| `name` | `basecode-main-staging` / `basecode-admin-staging`; `env.prod.name` `basecode-main` / `basecode-admin` | top level = staging, so a bare `wrangler deploy` never reaches production |
| `name` (web) | `boli-web-staging`; `env.prod.name` `boli-web` | the public site |
| `main` | `worker.ts` (web: `.open-next/worker.js`, no custom worker) | sign-out fast path + `scheduled()` |
| `minify` / `keep_names` | `true` / `false` | 64 MiB limit; `keep_names` breaks next-themes' inline script |
| `compatibility_flags` | `["nodejs_compat"]` | better-auth, Neon, AI SDK |
| `placement` | `{ "region": "aws:ap-southeast-1" }` | next to the database - set your Neon region |
| `assets` | `.open-next/assets`, binding `ASSETS` | static files |
| `services` | `WORKER_SELF_REFERENCE` -> the same Worker's name (per env) | cron calls its own routes |
| `r2_buckets` | `FILES` -> `basecode-files` (prod `basecode-files-prod`), `NEXT_INC_CACHE_R2_BUCKET` -> `basecode-next-cache` (prod `-prod`) | file storage binding; OpenNext incremental cache (`open-next.config.ts`) |
| `triggers.crons` | staging `[]`; main prod `["0 * * * *", "30 0 * * *"]`; admin prod `[]` | staging runs no jobs |
| `routes` | commented examples (`app.example.com`, `admin.example.com`; web: `bolihq.com` + `www.bolihq.com` in prod) | add your custom domains |
| `vars` (web) | `NEXT_INC_CACHE_R2_PREFIX = boli-web-cache` (both envs) | web shares main's cache bucket under its own prefix |
| `observability` | enabled, sampling 1 | logs |

Bindings do not inherit into `env.prod`: a new binding goes in both. Both apps' wrangler files name the same R2
buckets today.

## Staying under 64 MiB

Webpack build (not Turbopack), `patches/next@16.4.6.patch`, the server `splitChunks` hook in `next.config.js`
(`minSize: 2000`, unlimited requests), `minify: true`, one dispatcher route instead of many (`/api/cron/[job]`,
`/api/documents/[...path]`, `/api/payments/[provider]/[...action]`), no API route for a read a Server Action can do, and
layouts that import only small `'use server'` files (`actions/notification.action.ts` in main, `actions/shell.action.ts`
in admin). Details: [AGENTS.md section 3](../AGENTS.md#3-platform---cloudflare-workers), `apps/main/CLAUDE.md`.

## Before the first deploy (owner)

1. Cloudflare account id into `account_id` of both `wrangler.jsonc` files; `wrangler login` on that account.
2. Rename the Workers if the product is not "basecode" (`name`, `env.prod.name`, both `services` entries).
3. Create the R2 buckets: `basecode-files`, `basecode-files-prod`, `basecode-next-cache`, `basecode-next-cache-prod`
   (or your names), and R2 API tokens for `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
4. Custom domains: uncomment `routes` in both envs (main app.bolihq.com, web bolihq.com + www); set `BETTER_AUTH_URL`,
   `NEXT_PUBLIC_SITE_URL`, `MAIN_APP_URL`, `ADMIN_APP_URL`, `NEXT_PUBLIC_WEB_URL` (main) and `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_APP_URL` (web) in `.env` and `.env.production` to them; add the Google OAuth redirect URIs
   (`<origin>/api/auth/callback/google`) if Google is on.
5. Production database: its own Neon project; `ALLOW_DB_PUSH=1 pnpm db:push` against it once while empty (point a copy
   of the command at it), seed the super admin, then only additive scripts.
6. Set `placement.region` to the Neon region. Fill every `__PLACEHOLDER__`, generate a production `BETTER_AUTH_SECRET`,
   `APP_ENCRYPTION_KEY`, `CRON_SECRET`; verify the Resend sending domain for `RESEND_FROM_EMAIL`.
7. `pnpm env:check`, then `pnpm deploy:staging all`, check staging, then `pnpm deploy:prod all`.
