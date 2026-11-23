# docs/ - start here

Basecode is a pnpm + Turborepo monorepo that a new product is cloned from. It ships two Next 16 apps that each run as a
Cloudflare Worker through OpenNext - `apps/main` (the product: auth pages, an AI page at `/ai` that signed-in people land
on, Home, a reference Notes module, Profile, a Settings hub, Notifications, Help, onboarding at `/welcome`) and
`apps/admin` (an internal console: team and access, users, analytics, reports, communications, system settings) - over
one Neon Postgres per environment, reached over HTTP.

Everything shared lives in `packages/` as `@repo/<name>`: the UI kit and app shell (`ui`), better-auth (`auth`, its only
owner), the database client and schema (`db`), the AI layer with prompt caching and a usage meter (`ai`, `billing`),
email, R2 storage, PDF, cron, legal, erasure, Sarvam, web data and errors. The rules every change follows are in
[`AGENTS.md`](../AGENTS.md); these docs are the map of what exists and where. Every path and export named here was read
from the code.

## Reading order for a new session

1. [`AGENTS.md`](../AGENTS.md) - the rules (process, platform, env, database, auth, UI, data fetching, AI cost).
2. [`architecture.md`](architecture.md) - apps, packages, request flow, auth, shell, errors, storage.
3. [`modules.md`](modules.md) - every route in main and admin: files, tables, states.
4. [`ui-kit.md`](ui-kit.md) - what is in `@repo/ui` and when to use which piece; [`clean-ui/`](clean-ui/README.md) - the
   look (learned from runable.com): tone fills, 36px controls, soft menus, split button, chips, filter sheet, the
   account menu, the chat start screen.
5. The doc for the area you will touch: [`data.md`](data.md), [`ai.md`](ai.md), [`env-and-deploy.md`](env-and-deploy.md),
   [`recipes.md`](recipes.md), [`payments.md`](payments.md), [`workspaces.md`](workspaces.md) (adding teams later).
6. [`plan/INDEX.md`](../plan/INDEX.md) - what is open right now; write your own plan doc before code (AGENTS.md section 1).

Per-app rules: [`apps/main/CLAUDE.md`](../apps/main/CLAUDE.md), [`apps/admin/CLAUDE.md`](../apps/admin/CLAUDE.md).

## Where is X

| Question | File / folder |
|---|---|
| The rail items and every route constant (main) | `apps/main/lib/navigation.ts` (`ROUTES`, `MAIN_NAV`, `MAIN_RAIL_COOKIE`) |
| Auth route constants (main) | `apps/main/lib/auth-routes.ts` (`AUTH_ROUTES`, `VERIFIED_CALLBACK`) |
| The rail and route constants (admin) | `apps/admin/lib/navigation.ts` (`ROUTES`, `adminNavFor`, `ADMIN_RAIL_COOKIE`) |
| Admin permission catalogue and check | `apps/admin/lib/permissions.ts` (`ADMIN_MODULES`, `adminCan`) |
| Admin page / action guards | `apps/admin/lib/admin-session.ts` (`getAdmin`, `requireActiveAdmin` - no session -> `/?stale=1`, not an admin -> `/?denied=1`, `requireAdminPage`), `apps/admin/actions/guard.ts` (`requireAdminAction`) |
| Session on the server (main) | `apps/main/lib/session.ts` (`getSession`, `requireSession`, `requireRawSession`) |
| The better-auth config | `packages/auth/src/server.ts` |
| Cookie names and prefixes | `packages/auth/src/cookies.ts`; prefix set per app in `apps/*/next.config.js` `env.AUTH_COOKIE_PREFIX` |
| The middleware (cookie check) | `apps/*/middleware.ts` + `packages/auth/src/middleware.ts` |
| Sign-out fast path | `apps/*/worker.ts`, `packages/auth/src/sign-out.ts`, dev twin `apps/*/app/api/auth/app-sign-out/route.ts` |
| Auth screens kit (frame, inputs, Google button) | `packages/auth/src/ui/auth-kit.tsx` (`@repo/auth/ui`) |
| The shell | `packages/ui/src/components/shell/app-shell.tsx`, `shell-rail.tsx`, helpers `packages/ui/src/lib/shell.ts` |
| Main's shell wrapper (bell, account) | `apps/main/app/(main)/_components/main-shell.tsx`; admin: `apps/admin/app/(main)/_components/admin-shell.tsx` |
| The `Page` component / its skeleton | `packages/ui/src/components/ui/page.tsx` (`Page`, `PageSkeleton`) |
| Page height variables | `packages/ui/src/styles/globals.css` (`[data-app-main]`, `--app-page-h`) |
| Brand name, tagline, site URL | `packages/core/src/site.ts` (`SITE`) |
| AI system prompt | `apps/main/lib/ai/system-prompt.ts` (`AI_SYSTEM_PROMPT`) |
| AI tools | `apps/main/lib/ai/tools.ts` (`buildTools`, `toolOrder`, `CARD_TOOLS`, `TOOL_LABELS`) |
| AI chat route | `apps/main/app/api/ai/chat/route.ts` |
| Task -> model map | `packages/ai/src/config.ts` (`AI_TASKS`) |
| Prices per model | `packages/ai/src/models.ts` (`MODELS`) |
| Cache marks (incl. 1-hour start) | `packages/ai/src/cache.ts` |
| Tool loop, outage removal, step cap | `packages/ai/src/agent.ts` (`runChatTurn`) |
| Usage cost and the daily cap | `packages/billing/src/ai-meter.ts` (`priceCall`), `packages/billing/src/usage-log.ts` (`logAiUsage`, `checkDailyCap`) |
| Peeks and Needs you | `apps/main/lib/peeks/peek-routes.ts`, `apps/main/components/peeks/`, `apps/main/lib/ai/conversations.ts` (`needsYouFor`) |
| Email templates | `packages/email/src/templates.ts`; layout `layout.ts`; sender `send.ts` |
| Notifications (create one from server code) | `apps/main/lib/notifications.ts` (`createNotification`); topics `apps/main/lib/settings-values.ts` |
| Cron jobs | `packages/cron/src/jobs.ts`; app list `apps/main/app/api/cron/[job]/route.ts`; schedules `apps/main/worker.ts` + `wrangler.jsonc` |
| PDFs and private files route | `apps/main/app/api/documents/[...path]/route.ts`; kit `packages/pdf/src/` |
| R2 keys and hrefs | `packages/storage/src/r2.ts`, `packages/storage/src/href.ts` (`storageHref`) |
| Error types | `packages/errors/src/` (`ActionResult`, `ok`/`fail`/`failWith`, `AppError`, `classifyError`) |
| Error screen | `packages/ui/src/components/ui/app-error-view.tsx`; used by `apps/*/app/error.tsx` and `app/(main)/error.tsx` |
| Add a table | `packages/db/src/schema/<area>.ts`, exported from `packages/db/src/schema/index.ts` |
| Run a SQL file | `pnpm --filter @repo/db sql scripts/<file>.sql [--apply]` (`packages/db/scripts/run-sql.mjs`) |
| Seed | `packages/db/src/seed.ts` (`pnpm db:seed`) |
| Env scripts | `scripts/env-check.mts`, `env-set.mts`, `env-restore.mts`, shared `env-files.mts` (`APPS_WITH_ENV`) |
| Deploy script | `scripts/deploy.mts` (`pnpm deploy:staging|prod <app|all>`) |
| Worker entry | `apps/*/worker.ts` (wrangler `main`), OpenNext config `apps/*/open-next.config.ts` |
| Wrangler config | `apps/*/wrangler.jsonc` (staging top level, `env.prod`) |
| Next config (webpack, rewrites, headers) | `apps/*/next.config.js`; the Next patch `patches/next@16.4.6.patch` |
| Query client defaults | `apps/*/app/providers.tsx` |
| Legal text | `packages/legal/src/documents.ts`; page `apps/main/app/(legal)/` |
| The reference list module | `apps/main/app/(main)/notes/` + `actions/notes.action.ts` + `lib/notes.ts` + `schemas/notes.ts` + `types/notes.ts` |
| Plans | `plan/INDEX.md`, `plan/TEMPLATE.md`, `plan/README.md` |
| Self-hosting an open model (playbook an agent can follow) | `docs/inference/README.md` |

## First commands

```bash
pnpm install
# env: each app has apps/<app>/.env.local (dev), .env (staging), .env.production (production) - see env-and-deploy.md
pnpm env:check                       # key names and DB host labels only, never values
ALLOW_DB_PUSH=1 pnpm db:push         # FRESH database only; afterwards additive SQL scripts (data.md)
pnpm db:seed                         # super admin; prints a generated password once unless SEED_ADMIN_PASSWORD is set
pnpm --filter main dev               # http://localhost:3100
pnpm --filter admin dev              # http://localhost:3101
```

`pnpm dev` runs both. Every db script reads `apps/main/.env.local` (`packages/db/package.json`). Deploys are run by the
owner only (`pnpm deploy:staging <app|all>`) - see [`env-and-deploy.md`](env-and-deploy.md).
