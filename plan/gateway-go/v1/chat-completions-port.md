# Go gateway: port POST /v1/chat/completions, and learn Go through it

| | |
|---|---|
| **App / module** | `gateway-go/v1` |
| **Status** | In progress |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Files** | `apps/gateway-go/**`, `docs/artifacts/go-gateway.html`, `docs/artifacts/go-gateway/**`, this doc, one row in `plan/INDEX.md` |

## What was asked

An experiment: a NEW Go service in its own folder that re-implements Boli's OpenAI-compatible `POST /v1/chat/completions`
(and `GET /v1/models`) so it behaves exactly like the TypeScript route in `apps/main/app/api/v1/[...path]/route.ts`.
Alongside it, one Artifact that teaches Go through this service, chapter by chapter in build order. The owner is new
to Go (syntax included), so the course starts from zero.

Hard boundaries: edit only `apps/gateway-go/`, this plan doc, its INDEX row, and the artifact copy under
`docs/artifacts/`. Nothing in main, web, admin, packages, schema, migrations, other env files, root scripts, AGENTS.md
or any CLAUDE.md. Never push or deploy. Never print env values.

## Owner decisions (2026-11-24, picker)

| Question | Answer |
|---|---|
| Folder and port | `apps/gateway-go`, port **3110** |
| Database | **Shared staging, real writes** (the same DB localhost main uses). Probe runs spend real staging credits. |
| Stack | Standard library `net/http` (Go 1.22+ routing), `pgx/v5` pool, `log/slog`, config from env. pgx is the only dependency. |
| Streaming | In v1, as its own later step (non-streaming end to end first) |
| Go install | Claude ran `brew install go` -> `go version go1.27.4 darwin/arm64` |
| Course pace | Primer (Ch 0-2), then gated chapters: Claude stops after each chapter until the owner says next. ALL quizzes live inside the artifact (no picker quizzes). |
| Quiz size | 20-30 questions per chapter, harder as chapters go |
| Testing | `go test` (httptest + fake llama-server) plus `ml/llm/probe_platform.py` against :3100 AND :3110, results diffed; `--rate` once |
| Run / deploy | Own port next to main, main untouched. Where it deploys is decided later; nothing is set up. |

## What "done" looks like

- `apps/gateway-go` is a Go module (`bolihq.com/gateway`) with `cmd/gateway/main.go` and `internal/` packages.
- `go vet ./...` and `go test ./...` pass.
- With the service on :3110 and main on :3100, `python3 ml/llm/probe_platform.py http://localhost:3110` prints the
  same pass/fail lines as against :3100 (one `--rate` run against :3110 gives a 429 with Retry-After).
- A README in the folder: run, env key names, test, and a Go package -> TS file table.
- The artifact is published, every chapter has explanation, real code, TS vs Go, traps and 20-30 quiz questions with
  reveal; the copy is in `docs/artifacts/go-gateway.html` (+ chapter files in `docs/artifacts/go-gateway/`).

## Behaviour to match (read from the TS, 2026-11-24)

- Auth: `Authorization: Bearer <key>` (case-insensitive `Bearer`, trimmed) else `x-api-key`. Key must start `boli_sk_`
  and be exactly 8 + 32 chars, else 401 without a DB read. SHA-256 hex lookup joined to `user`, `revoked_at IS NULL`,
  `user.is_active = false` -> 401. `last_used_at` bumped at most once a minute with a conditional UPDATE; a failed bump
  is logged, never fails the call. (`apps/main/lib/platform/keys.ts`)
- Order in POST: path check -> key -> rate limit -> balance -> JSON parse -> validate -> upstream -> charge.
- Rate limit: count + min(created_at) of the user's `inference_request` rows in the last 60s; limit from
  `API_RATE_LIMIT_PER_MIN` (positive int) else 30. `Retry-After` = clamp(ceil((oldest + 60s - now)/1s), 1, 60).
- Balance: only when `CREDITS_ENFORCED` is `1`/`true`; balance read never creates an account.
- Validation: zod schema in `apps/main/schemas/chat-completions.ts`; the FIRST issue's message plus ` (at a.b.0)`.
  Unknown fields dropped. `max_tokens ?? max_completion_tokens ?? 1024` sent upstream.
- Upstream: `LLAMA_BASE_URL` (trailing `/` and `/v1` stripped) + `/v1/chat/completions`, Bearer `LLAMA_API_KEY` when
  set, `model` -> `BOLI_UPSTREAM_MODEL`, `chat_template_kwargs.enable_thinking = think === true`, streaming forces
  `stream_options.include_usage = true`. Not tied to the client's disconnect.
- Upstream 400 -> 400 invalid_request with its message + context sentence, recorded as error. Network error or other
  status -> 503 model_unavailable, recorded as error, nothing charged.
- Charge: `inference_request` insert (ON CONFLICT id DO NOTHING) + ledger CTE with key `spend:<request id>`, in ONE
  batch, only when cost > 0. `costMicro = ceil(in*2 + out*6)`. `accountForUser` creates the account if missing.
- JSON answer: `model` rewritten to the public id, header `x-boli-request-id`.
- Stream: lines passed through, `model` rewritten in each data chunk, usage captured, deltas counted as fallback output
  tokens, first-token time recorded, charge at the end before the stream closes.

## Tasks

- [x] **1. Install Go and pin the decisions**
  - Acceptance: `go version` prints; decisions recorded above.
  - Verified: `brew install go` then `go version` printed `go version go1.27.4 darwin/arm64`.

- [x] **2. Gate 1: module + `internal/boli` (port of `packages/boli`), artifact outline + Ch 0-2**
  - Acceptance: `go test ./...` passes for `internal/boli`; artifact published with the outline and Ch 0, 1, 2.
  - Verified: `gofmt -l .` printed nothing; `go vet ./...` clean; `go test ./...` -> `ok bolihq.com/gateway/internal/boli`
    (TestCostMicro 6 cases, TestModelByID, TestAPIErrorsMatchTS incl. unknown code -> 500); `go run ./cmd/gateway`
    printed `a 38-in / 61-out call costs 442 micro-credits = 0.000442 credits`. Every "predict the output" quiz answer
    was run in a scratch program first. Quiz JSON parsed for ch00 (21 q), ch01 (30 q), ch02 (25 q); page script
    parsed with `new Function`. Published: https://claude.ai/artifact/7TsPZepWpvEXG9ar7KGCL7 (v1). Not yet opened at
    phone width (one browser pass at the end, per AGENTS.md).

- [x] **2b. Smoke path to the model in DEV MODE (owner asked, 2026-11-24: "just try to call and see if it answers")**
  - Code got ahead of the course: `internal/config`, `internal/openai` (types + full zod port), `internal/apierr`,
    `internal/upstream`, `internal/httpapi` (models, chat JSON, SSE stream, access log), `cmd/gateway` server with
    graceful shutdown. Runs only with `GATEWAY_DEV_NO_DB=1`, bound to 127.0.0.1: NO key check, rate limit, balance or
    charge until Ch 8 (each call's record is logged with what it would cost). `.env.local` in the folder holds
    LLAMA_BASE_URL / LLAMA_API_KEY / BOLI_UPSTREAM_MODEL copied from main's (gitignored, values never printed).
  - Verified: llama-server on :8080 `/health` 200. Through Go on :3110: `GET /v1/models` -> boli-chat list;
    English request -> 200, `model: boli-chat`, `x-boli-request-id`, usage 19 in / 54 out, log `cost_micro=362`;
    Romanized Nepali -> 200 with a Romanized reply; stream -> 16 chunks, text `1, 2, 3, 4, 5`, `[DONE]`, model
    rewritten in every chunk; a client that hung up mid-stream was still recorded in full (output_tokens=14); errors:
    unknown model / empty messages / bad role / max_tokens 0 / not JSON -> 400 OpenAI shape, `/v1/embeddings` -> 404.
    `think: true` gave no reasoning_content, and the SAME request sent directly to llama-server also gave none (server
    runs `--reasoning auto`), so it is not a gateway bug. Server stopped with SIGTERM, exit 0.
  - Still open: zod message parity not yet checked against real zod output; no httpapi/openai unit tests yet (Ch 3, 12).

- [ ] **3. Ch 3: OpenAI types, JSON tags, request validation (`internal/openai`, port of the zod schema)**
  - Acceptance: table tests cover every rule and message in `schemas/chat-completions.ts`.
  - Verified:

- [ ] **4. Ch 4: errors and wrapping (`internal/apierr`: the OpenAI error shape and codes)**
  - Acceptance: tests for status + JSON shape per code.
  - Verified:

- [ ] **5. Ch 5-6: interfaces and context (store and upstream seams, timeouts)**
  - Acceptance: handlers depend on small interfaces; fakes in tests.
  - Verified:

- [ ] **6. Ch 7: net/http handlers and middleware (router, auth, request id, logging, /v1/models)**
  - Acceptance: httptest covers 401 / 404 / models list.
  - Verified:

- [ ] **7. Ch 8: database with pgx (keys, rate limit, balance, charge batch vs transaction)**
  - Acceptance: SQL matches the TS statements; a run against staging authenticates the probe key.
  - Verified:

- [ ] **8. Ch 9: the upstream client and the non-streaming answer**
  - Acceptance: fake upstream tests for 200 / 400 / 500 / network error; charge rows recorded.
  - Verified:

- [ ] **9. Ch 10: streaming with http.Flusher**
  - Acceptance: fake SSE upstream; model rewritten per chunk; charge at the end.
  - Verified:

- [ ] **10. Ch 11: goroutines, channels, mutex (and why the port keeps the DB-count rate limit)**
  - Acceptance: chapter written; concurrent test runs with `-race`.
  - Verified:

- [ ] **11. Ch 12-13: testing with httptest, running and the TS map; README**
  - Acceptance: README complete; course complete.
  - Verified:

---

## Verification pass

- [ ] `go vet ./...` -> _result_
- [ ] `go test -race ./...` -> _result_
- [ ] `python3 ml/llm/probe_platform.py http://localhost:3100` vs `http://localhost:3110` -> _diff_
- [ ] `--rate` once against :3110 -> _429 + Retry-After_
- [ ] Artifact opened at phone width -> _note_
- [ ] Owner runs: nothing to build or deploy (no Worker involved)

## Notes / decisions

- Module path `bolihq.com/gateway`: a module path is a name, not a URL Go must fetch; using a domain Boli owns is the
  convention and avoids clashing with the standard library's dot-free names.
- The prompt mentions "why the rate limiter needs a mutex". The TS limiter is a DB count (no shared memory), so the
  port keeps the DB count to match behaviour exactly. Ch 11 teaches goroutines and mutexes honestly: each request runs
  in its own goroutine, an in-memory limiter WOULD need a mutex, and why it would still be wrong with two instances.
- Neon over HTTP has no transactions (`db.transaction()` throws), so the TS uses `db.batch`. pgx talks TCP to Neon, so
  Go can use a real transaction; the port uses `pgx.Batch` inside one transaction for the same one-round-trip,
  all-or-nothing effect.
- Artifact is multi-file: the page `docs/artifacts/go-gateway.html` fetches one HTML fragment per chapter from
  `docs/artifacts/go-gateway/chNN.html`, so each gate adds a file instead of rewriting one huge page.
