# boli-jobs: a separate Worker for long jobs (Workflows) and live shared state (Durable Objects)

| | |
|---|---|
| **App / module** | `repo/jobs` (new `apps/jobs`, new `packages/jawaf` + `packages/jobs`, wiring in `apps/main` + `apps/admin`) |
| **Status** | In progress |
| **Opened** | 2026-11-25 |
| **Last updated** | 2026-11-25 |
| **Files** | `apps/jobs/**`, `packages/jawaf/**`, `packages/jobs/**`, `apps/main/lib/jawaf/*` (shims), `apps/main/lib/jobs.ts`, `apps/main/lib/platform/ratelimit.ts`, `apps/main/lib/jawaf/public.ts`, `apps/main/app/api/jawaf/[...path]/route.ts`, `apps/main/app/(public-chat)/j/[slug]/api/[...path]/route.ts`, `apps/admin/lib/jawaf-bridge.ts`, `apps/admin/lib/jawaf.ts`, both apps' `wrangler.jsonc`, `scripts/{deploy,env-files}.mts`, `AGENTS.md` section 5 |

## What was asked

Owner decisions (2026-11-25): build the base of a separate Cloudflare Worker, `apps/jobs` ("boli-jobs"), called by
main (and admin) through a service binding. Move ALL long work to Workflows this round: site map + page reading +
re-index, fact sheet drafting, Sarvam file reading, weekly re-reads, the admin quality check, and the (Wave 4) daily
summary / follow-up reminder emails as a scheduled Workflow skeleton. The job code is written ONCE as plain steps and
runs either as a Workflow on Cloudflare or locally through the existing job row + tick runner, chosen by ONE env switch
`JOBS_RUNNER=workflow|local` (local is the default now: no Cloudflare access until billing is back). A Durable Object
holds EXACT rate limits for the public Jawaf page (per visitor and per IP: asks, voice, contact cards, ratings) and the
/v1 API limit (30/min per account); today's database / in-memory limits are the local fallback. Built so more jobs and
DO uses are easy to add. No UI change; never deploy; dev behaviour stays exactly as it is.

## What "done" looks like

- The Jawaf step logic lives in `packages/jawaf` as plain step functions (input = the job row + its cursor, output =
  the next cursor + progress, each safe to retry); `apps/main/lib/jawaf/*` re-export it, so every existing import and
  the setup flow behave as before.
- `apps/jobs` has a wrangler config (staging top level `boli-jobs-staging`, `env.prod` = `boli-jobs`, pinned
  account_id placeholder, nodejs_compat, one Workflow binding per job kind, the RateLimiter DO with a SQLite migration,
  crons only under env.prod), `src/index.ts` (Workflow classes, the DO class, an RPC entrypoint), three env files with
  the same keys (checked by `pnpm env:check`), a `dev` script (`wrangler dev`), and `jobs` as a deploy target.
- `packages/jobs` holds the switch (`jobsRunner()`), the RPC contract, a client (`dispatchJob` / `jobStatus`) and the
  limiter interface (DO when `JOBS_RUNNER=workflow` and the binding answers, else the current fallback).
- main and admin start jobs through that client; with `JOBS_RUNNER=local` (all env files now) nothing changes.
- A tsx script ran one local job end to end through the package against the staging database.
- Docs: `apps/jobs/CLAUDE.md`, a pointer in AGENTS.md section 5, this plan, a row in `plan/INDEX.md`.

## Open questions

- Site map stays INLINE in local mode (the setup screen waits for the page list; no UI change allowed). In workflow
  mode the action starts a `map` Workflow and waits for it server-side (bounded), then returns the same result. If the
  owner later wants the screen to poll instead, the job kind is already there.
- The /v1 limit through the DO counts every authenticated attempt (the database window counted only logged requests).
  Assumed fine: a rejected burst is still a burst.

---

## Tasks

- [x] **1. `packages/jawaf`: the engine + job steps out of apps/main**
  - Acceptance: text, script, embed, llm, retrieve, indexer, draft, meter, crawl, answer, bots core, map, eval and the
    job rows / steps / runner / schedule / digest live in the package with no `server-only` and no `@/` imports;
    `apps/main/lib/jawaf/{text,script,embed,llm,retrieve,indexer,draft,meter,crawl,answer,jobs}.ts` re-export them.
  - Verified: the 10 moved modules diffed against HEAD after stripping `server-only` / `@/types` -> all "same"; a tsx smoke script loading main's shims (jobs, knowledge, public, admin-bridge, ratelimit, text, script) printed `function` x8. Typecheck left to the lead.
- [ ] **2. `packages/jobs`: switch, RPC contract, client, limiter**
  - Acceptance: `jobsRunner()` reads `JOBS_RUNNER` (default local); `createJobsClient` dispatches to the binding only in
    workflow mode; the client's `limiter` tries the DO in workflow mode and falls back to memory on any error.
  - Verified: tsx: `JOBS_RUNNER -> local`; memoryLimiter 3 hits at limit 2 -> `ok, ok, refused(m, retry 60s)`; main's `checkSpeechLimits` 16 tries at 15/min -> refused 1. The DO path is not run (no Cloudflare access).
- [ ] **3. `apps/jobs` Worker**
  - Acceptance: wrangler.jsonc as above; `src/index.ts` exports `JobsService` (RPC + scheduled), one Workflow class per
    kind, `RateLimiter` (SQLite DO); env files with the same keys; package.json `dev` = wrangler dev, no deploy script.
  - Verified: files written; NOT run - `wrangler dev` / a dry-run bundle is the owner's / lead's (no build or dev server from the agent). Box stays open until `pnpm --filter jobs dev` starts and `JOBS.startJob` runs one Workflow.
- [ ] **4. main + admin wiring**
  - Acceptance: `JOBS` service binding in both apps' wrangler (top level + env.prod); `JOBS_RUNNER` in all six env
    files (= local); main's tick route / cron / admin bridge run slices only in local mode; public + /v1 limits go
    through the limiter; admin's eval / health / tick / queue go to the binding in workflow mode, else the HTTP bridge.
  - Verified: code written; local mode verified only through the tsx runs above (the poll path `advanceForPoll` calls `runSlice` in local mode). Browser pass of the setup flow is the lead's.
- [x] **5. Scripts: env-files + deploy target**
  - Acceptance: `APPS_WITH_ENV` includes jobs; `pnpm env:check` passes; deploy.mts knows `jobs` (first, not Next).
  - Verified: `pnpm env:check` -> "OK: every app has three files with the same keys." with jobs listed (jobs/.env and jobs/.env.production placeholders inherited from main's files).
- [x] **6. One local job end to end through the package (staging DB)**
  - Acceptance: a tsx script enqueues a small `reindex` (or `draft`) job and runs it with the package's local runner to
    `done`; prints counts.
  - Verified: tsx against staging (`dotenv -e apps/main/.env.local -- tsx --conditions=react-server`), read job on `eval-gurukulhq` (0 pending pages: no Firecrawl, no model, no charge): LOCAL `runSlice` -> `slice 1: done - Done`, 374 ms; WORKFLOW step fn `advanceJob` -> `step 1. start -> running - Finishing`, `step 2. finish -> done - Done`, 622 ms; sources `ready`, setup step `review` (unchanged). Earlier try: `reindex` on gurukul-hq -> the embedding server (localhost) was down: local slices ended "(retrying)" and advanceJob THREW the retryable AppError, as designed; no chunks changed (embed runs before the delete); that job was cancelled.
- [x] **7. Docs**
  - Acceptance: `apps/jobs/CLAUDE.md`, AGENTS.md section 5 pointer, plan row.
  - Verified: `apps/jobs/CLAUDE.md` written; AGENTS.md section 5 paragraph "Where long jobs live"; plan/INDEX.md row added.

---

## Verification pass

- [ ] Typecheck (the lead, scoped): packages/jawaf, packages/jobs, apps/jobs, and the changed main/admin files -> _pending_
- [ ] Jawaf setup flow in the browser (map -> pick -> read -> review) with `JOBS_RUNNER=local` -> _the lead_
- [ ] Owner, once Cloudflare billing is back: `pnpm --filter jobs dev` (wrangler dev), then deploys (see CLAUDE.md)

## Notes / decisions

- One row = one job in BOTH modes. The app creates the `jawaf_job` row (the partial unique index keeps "Train now"
  pressed twice one job) and then dispatches: local = nothing more (tick + hourly cron drive slices, as before);
  workflow = `JOBS.startJob({ kind, jobId })`, which creates a Workflow instance whose id IS the job id (a second
  create for the same job throws and is ignored, so dispatch is idempotent).
- A Workflow step = ONE job step (`advanceJob`): claim the lease, run one step from the row's cursor, save cursor +
  progress, release. State lives in the row, so a retried step.do just continues from what was saved. Retryable
  errors (rate limits, outages) are THROWN in workflow mode so step.do retries with backoff; the local runner keeps
  today's "(retrying)" label and the next slice retries.
- The Sarvam poll returns `waitMs`: the local runner keeps its 2 s pause; the Workflow `step.sleep`s instead.
- No `JOBS_SHARED_SECRET`: the jobs Worker has `workers_dev: false` and no routes, so only a service binding can reach
  it (RPC). The fetch handler answers only `/health`.
- `server-only` is aliased to an empty module in apps/jobs (wrangler `alias`); @repo/ai imports it.
- Found while testing (not changed): staging bot `gurukul-hq` sits at setup step `reading` with its site source
  `reading`, 0 pending included pages and no active job - a read that ended without its finish step. A Train now (or
  one `read` job) would finish it; left for the owner.
- `jawaf_job.kind` is text: `map` and `eval` needed no schema change (added to `JAWAF_JOB_KINDS`).
- The digest is a skeleton on purpose: `collectDigest` counts conversations / contacts / follow-ups due per live bot;
  `sendDigest` returns false. Wave 4 task 10 fills it (template, notify prefs, an idempotency key per workspace + day).
