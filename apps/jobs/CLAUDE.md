# apps/jobs - boli-jobs, the Worker for long jobs and live shared state

A plain Cloudflare Worker (no Next): **Workflows** for work that takes minutes, must survive a closed tab or must
retry, and a **Durable Object** for state many requests share (exact rate limits). main and admin reach it ONLY through
their `JOBS` service binding, as RPC. It has no route and `workers_dev` is off, so it is not on the internet and RPC
needs no shared secret. The plan: `plan/repo/jobs/jobs-worker.md`. AGENTS.md section 5 decides WHEN work belongs here.

## What lives where

| Piece | Where | What it is |
|---|---|---|
| The job steps (written once) | `packages/jawaf/src/jobs/steps.ts` | `(job row, bot, cursor) -> next cursor + progress (+ done / failed / waitMs)`; every write idempotent |
| The job rows + both runners | `packages/jawaf/src/jobs/{rows,runner}.ts` | `enqueueJob`, `runSlice` (local), `advanceJob` (one Workflow step) |
| Scheduling + digest | `packages/jawaf/src/jobs/{schedule,digest}.ts` | weekly re-reads; the daily digest skeleton |
| The switch, registry, RPC contract, client, limiter | `packages/jobs` (`@repo/jobs`) | `jobsRunner()`, `ROW_JOB_WORKFLOWS`, `JobsRpc`, `createJobsClient`, `memoryLimiter` |
| Workflow classes | `src/workflows.ts` | a loop of `step.do(advanceJob)` per kind, with that kind's retry policy |
| The Durable Object | `src/rate-limiter.ts` | `RateLimiter`: SQLite sliding window, one object per key |
| The RPC entry + crons | `src/index.ts` | `JobsService` (default export, a WorkerEntrypoint) |
| The apps' doors | `apps/main/lib/jobs.ts`, `apps/admin/lib/jobs.ts` | `createJobsClient` over OpenNext's `getCloudflareContext().env.JOBS` |

The engine itself (text, embeddings, boli-chat, retrieval, indexing, drafting, metering, site map, answers, the quality
check) is `packages/jawaf`; `apps/main/lib/jawaf/<module>.ts` re-export it, so main's imports never changed.

## One switch: JOBS_RUNNER

Set in main's and admin's three env files (all `"local"` today).

| | `local` (default; `next dev`) | `workflow` (Cloudflare) |
|---|---|---|
| Who creates the job | the app: a `jawaf_job` row (`enqueueJob`; one active per bot + kind + source) | the same |
| Who runs it | the page's poll `POST /api/jawaf/jobs/<id>/tick` and admin's bridge tick (`runSlice`, ~12 s of steps), plus main's hourly cron for closed tabs | a Workflow instance whose id IS the job id; each step.do = one job step |
| Retries | a retryable error ends the slice with "(retrying)"; the next slice retries | `advanceJob` throws it; step.do retries with backoff (per kind) |
| Sarvam OCR wait | the slice pauses 2 s | `step.sleep` (5 s) |
| The poll / admin tick | runs a slice | reads the row; re-dispatches a missing instance, fails a dead one |
| Site map | inline in the action (as before) | a `map` Workflow, waited for by the action (up to 50 s) |
| Quality check, embed check | admin -> main's HTTP bridge (`JAWAF_ADMIN_SECRET`) | admin -> `JOBS.evalBatch` / `JOBS.embedHealth` |
| Weekly re-reads, orphans | main's hourly cron `jawaf-jobs` | the `rereads` Workflow (boli-jobs cron, production) |
| Daily digest | - | the `digest` Workflow (skeleton: counts, sends nothing) |
| Rate limits | per-isolate memory (IP) + database counts (visitor, /v1) | EXACT: the `RateLimiter` DO; any limiter error falls back to local |

Progress always lives on the row, so the UI reads the same `JawafJobView` in both modes.

## Job map

| Kind | Workflow (binding) | Steps (one per step.do) | Retries / timeout |
|---|---|---|---|
| `read` | `JawafReadWorkflow` (`JAWAF_READ`) | read 3 pages (scrape, hash, chunk, embed, bill) ... -> draft section i of 7 (first read) -> finish | 6, 15 s exp / 3 min |
| `file` | `JawafFileWorkflow` (`JAWAF_FILE`) | extract (R2 -> text) or Sarvam submit -> Sarvam poll (sleep) / fetch -> chunk + embed + bill | 5, 10 s / 5 min |
| `draft` | `JawafDraftWorkflow` (`JAWAF_DRAFT`) | draft section i of 7 | 3, 20 s / 3 min |
| `reindex` | `JawafReindexWorkflow` (`JAWAF_REINDEX`) | re-chunk + re-embed 5 read pages | 5, 10 s / 5 min |
| `map` | `JawafMapWorkflow` (`JAWAF_MAP`) | Firecrawl map + robots.txt -> pages upserted | 3, 5 s / 2 min |
| `eval` | `JawafEvalWorkflow` (`JAWAF_EVAL`) | 3 quality-check questions (rows kept in the cursor) | 2, 10 s / 5 min |
| scheduled `rereads` | `JawafRereadsWorkflow` (`JAWAF_REREADS`) | find due bots -> queue each (own step) -> resume orphaned jobs | 3, 10 s / 2 min |
| scheduled `digest` | `JawafDigestWorkflow` (`JAWAF_DIGEST`) | collect the day -> one step per workspace (`sendDigest`, not built yet) | 3, 10 s / 2 min |

Crons (production only, `env.prod.triggers`): `5 * * * *` rereads, `15 2 * * *` digest (08:00 Nepal). Staging has
none; start one by hand with `JOBS.runScheduled("rereads")`.

## Add a job

1. A kind: `JAWAF_JOB_KINDS` in `packages/boli/src/jawaf.ts` (row jobs) and `ROW_JOB_WORKFLOWS` in
   `packages/jobs/src/kinds.ts` (or `SCHEDULED_WORKFLOWS` for a cron job with no row).
2. The step: a function in `packages/jawaf/src/jobs/steps.ts`, a `case` in `runStep`, a name in `describeNextStep`.
   Rules: read what you need from the database and the cursor; every write idempotent (a unique key, a hash, an
   upsert, a billing key); throw a retryable `AppError` (`network` / `ratelimit`) for "try again", return `failed` for
   "stop with this sentence"; return `waitMs` to wait; keep a step under its timeout (one model call, a few fetches).
   Cursor and step results are plain JSON.
3. The Workflow: a class in `src/workflows.ts` (`extends RowJobWorkflow` with its `config`), exported from
   `src/index.ts`, and a `workflows` entry in wrangler.jsonc at the top level AND under `env.prod` (names are unique
   per account: `boli-jobs-staging-<x>` / `boli-jobs-<x>`) plus a field on `Env` in `src/env.ts`.
4. Start it from the app: create the row (`enqueueJob`), then `dispatchJob` (main: `lib/jawaf/jobs.ts`; admin:
   `jobs.dispatch`). Locally the tick / cron run it with no further change.

A new Durable Object use: a class next to `rate-limiter.ts` (SQLite: `new_sqlite_classes` in a NEW migration tag, top
level and `env.prod`), a binding on `Env`, and an RPC method on `JobsService` + `JobsRpc` the apps call through
`@repo/jobs`. Keep a fallback for `JOBS_RUNNER=local`.

## Run it

- `pnpm --filter jobs dev` = `wrangler dev --port 3103`: Workflows and the Durable Object run locally inside wrangler
  (no remote bindings in this config). It reads `.env.local` / `.env`. Port 3103 is this app's (AGENTS.md: every
  app its own port).
- To test main against it: main must run under wrangler (`opennextjs-cloudflare preview`), not `next dev` - only a
  Worker has service bindings - with `JOBS_RUNNER="workflow"` in main's env.
- `server-only` is aliased to `src/shims/server-only.ts` (wrangler `alias`): `@repo/ai` imports it.
- Secrets reach the engine through `process.env` (nodejs_compat). `src/load.ts` copies the env into process.env BEFORE
  the engine is imported (`@repo/db` reads `DATABASE_URL` at module load), so engine code is only reached through
  `await engine(env)`.
- The engine without any Worker (a tsx script, like `ml/jawaf-eval`): `dotenv -e apps/main/.env.local -- tsx
  --conditions=react-server script.mts` importing `@repo/jawaf/jobs` - `runSlice` and `advanceJob` both work there.

## Env files

`.env.local` / `.env` / `.env.production`, the same keys (checked by `pnpm env:check`; `jobs` is in `APPS_WITH_ENV`):
DATABASE_URL, MAIN_APP_URL, CREDITS_ENFORCED, FIRECRAWL_API_KEY, SARVAM_API_KEY, LLAMA_BASE_URL, LLAMA_API_KEY,
BOLI_UPSTREAM_MODEL, LLAMA_EMBED_BASE_URL, JAWAF_EMBED_PROVIDER, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET_NAME, RESEND_API_KEY, RESEND_FROM_EMAIL (the digest, later). Values match main's files (the same engine on the
same database). A new key the engine reads goes into main's AND these files.

## Deploy (the owner runs these; never an agent)

`pnpm deploy:staging jobs` / `pnpm deploy:prod jobs` (scripts/deploy.mts: a plain `wrangler deploy [--env prod]
--secrets-file`). `jobs` deploys FIRST in `all`: main's and admin's `JOBS` binding needs the Worker to exist. Never add
a `deploy` script here.
