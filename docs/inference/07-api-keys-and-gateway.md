# 07 - API keys and the gateway

> **Status: written from the design on 2026-11-24, before the code was finished - verify every command against the
> code before relying on it.** Source of truth for the design: `plan/main/platform/platform-v0.md` (Decisions Q33-Q40,
> Q51, Contract, Interfaces). Numbers and names come from `apps/main/lib/boli.ts` and
> `packages/db/src/schema/platform.ts`. Anything marked **(design)** is what the plan says the code will do; anything
> marked **(open)** is a question the plan does not settle yet.

**Gets you:** per-user API keys (created in the dashboard, shown once, stored only as a hash, revocable) and a gateway
route in your web app that checks the key, limits use, checks the balance, forwards to the model server, streams the
answer back, counts tokens and charges for them - so any program can call your model the way it calls OpenAI.

**Replaces:** the single shared `LLAMA_API_KEY` from 03. After this doc, users never see that key; only the gateway
holds it.

## Prerequisites

- 01-03 done: llama-server runs with `LLAMA_API_KEY` set, reachable at `LLAMA_BASE_URL` (`http://127.0.0.1:8080` in dev;
  a named tunnel later - quick tunnels cannot stream).
- A Next.js App Router app with sign-in (Boli: Better Auth) and Postgres through Drizzle (Boli: Neon over HTTP).
- The credits ledger from 08 (the gateway charges into it). Build 08's tables first, or build both together.
- Env names (values filled by the person, never printed): `LLAMA_BASE_URL`, `LLAMA_API_KEY`, `BOLI_UPSTREAM_MODEL`,
  `CREDITS_ENFORCED=1`, `API_RATE_LIMIT_PER_MIN=30`.

## The design at a glance

```
client (curl / OpenAI SDK)
  |  POST https://<app>/v1/chat/completions   Authorization: Bearer boli_sk_...
  v
next.config.js rewrite  /v1/:path*  ->  /api/v1/:path*      (middleware does NOT run on /v1/ - see step 4)
  v
app/api/v1/[...path]/route.ts   (ONE dispatcher route)
  1. read key (Bearer or x-api-key)   -> 401 invalid_api_key
  2. sha256 -> look up api_key row, not revoked
  3. rate limit: rows in last 60 s     -> 429 rate_limit_exceeded + Retry-After
  4. balance > 0                       -> 402 insufficient_quota
  5. validate body, model == boli-chat -> 400 invalid_request
  6. forward to LLAMA_BASE_URL with LLAMA_API_KEY (NOT the user's key)  -> 503 model_unavailable
  7. read usage (JSON, or the last SSE chunk with stream_options.include_usage)
  8. charge INLINE: one db.batch (inference_request row + ledger spend + balance), key spend:<requestId>
  9. return the OpenAI-shaped body / pass the stream through
```

| Decision (plan) | Value |
|---|---|
| Key format (Q33) | `boli_sk_` + 32 random characters, shown once, stored as SHA-256 hex; list shows `boli_sk_ab12cd34****` |
| Keys per user (Q34-36) | max 10; revoke keeps the row ("Revoked"); no scopes, no expiry |
| Endpoints (Q37) | `POST /v1/chat/completions`, `GET /v1/models` |
| Auth headers (Q38) | `Authorization: Bearer <key>` and `x-api-key: <key>` |
| Errors (Q39) | `{error:{message,type,code}}`: 400 / 401 / 402 / 429 + Retry-After / 503 |
| Rate limit (Q40) | 30 requests/min per **account** (all keys and Kura share it) |
| Logging (Q51) | API calls: metadata only, no prompt or answer text |

Constants live in `apps/main/lib/boli.ts`: `API_KEY_PREFIX`, `API_KEY_RANDOM_LENGTH`, `API_KEY_DISPLAY_LENGTH`,
`MAX_API_KEYS`, `RATE_LIMIT_PER_MIN`, `API_PATHS`, `API_ERRORS`. Import them; never repeat the numbers.

## Steps

### 1. The table

`packages/db/src/schema/platform.ts` defines `api_key`:

| Column | Notes |
|---|---|
| `id` | uuid text |
| `user_id` | FK to user, cascade delete |
| `name` | what the person typed ("production-app") |
| `prefix` | first 16 characters of the key (`boli_sk_` + 8), for display only |
| `key_hash` | SHA-256 hex of the full key, **unique index** `api_key_hash_uq` |
| `created_at`, `last_used_at`, `revoked_at` | revoke = set `revoked_at`, never delete |

There is **no column for the key itself**. That is the point.

Boli's database was empty, so the schema is pushed (plan L3): `ALLOW_DB_PUSH=1 pnpm db:push` (the person runs it). For a
database with data, write an additive SQL script instead.

**Verify:** in the database, `\d api_key` (or Drizzle Studio) shows the columns above and a unique index on `key_hash`.

### 2. Generate a key (design)

Rules:

- **CSPRNG only**: `crypto.getRandomValues` (Workers and Node) or Node's `randomBytes`. Never `Math.random`.
- **Base62** (`A-Z a-z 0-9`): copy-paste safe, no `+/=` that break in URLs or shells. 32 characters of base62 is
  32 x log2(62) = about **190 bits** of randomness, far beyond guessing.
- **No modulo bias**: a random byte is 0-255 and 256 is not a multiple of 62, so `byte % 62` makes the first 8
  characters slightly more likely. Reject bytes >= 248 (62 x 4) and draw again.
- **Prefix** `boli_sk_`: tells a human (and a secret scanner) whose key it is and that it is secret.

```ts
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function randomBase62(length: number): string {
    let out = ""
    while (out.length < length) {
        const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
        for (const b of bytes) {
            if (b >= 248) continue // 248 = 62 * 4: keeps every character equally likely
            out += ALPHABET[b % 62]
            if (out.length === length) break
        }
    }
    return out
}

const key = API_KEY_PREFIX + randomBase62(API_KEY_RANDOM_LENGTH)   // 40 characters
const keyHash = sha256Hex(key)                                     // @repo/crypto: utf8, hex
const prefix = key.slice(0, API_KEY_DISPLAY_LENGTH)                // "boli_sk_" + 8
```

`sha256Hex` already exists in `packages/crypto/src/index.ts` (its comment says it exists to index API keys). Every place
that looks a key up must hash it the same way (utf8 in, lowercase hex out).

**Verify** (prints only lengths and a pattern check, never a key):

```bash
node -e '
const A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let s="";while(s.length<32){for(const b of crypto.getRandomValues(new Uint8Array(64))){if(b>=248)continue;s+=A[b%62];if(s.length===32)break}}
const k="boli_sk_"+s;console.log(k.length, /^boli_sk_[A-Za-z0-9]{32}$/.test(k))'
```

Expected: `40 true`.

### 3. Create, list, revoke (design: `apps/main/lib/platform/keys.ts`)

Interfaces fixed in the plan:

- `createApiKey(userId, name) -> { id, key, prefix, createdAt }` - counts the user's **non-revoked** keys first and throws
  a conflict at `MAX_API_KEYS` (10); inserts `{ name, prefix, keyHash }`; returns `key` **once**. The server action
  passes it to the dialog and nowhere else: not to logs, not to analytics, not into a cache.
- `listApiKeys(userId) -> ApiKeyView[]` - `{ id, name, prefix, createdAt, lastUsedAt, revokedAt }`. Never selects
  `key_hash` into anything sent to the browser.
- `revokeApiKey(userId, id)` - `UPDATE api_key SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`.
  The `user_id` filter is what stops one user revoking another's key.

UI rules (Sarvam does the same): the full key appears once, with Copy and the words "you will not see this again"; the
list shows `maskKey(prefix)` = `boli_sk_ab12cd34****`; a lost key cannot be recovered, only revoked and replaced.

**Verify** (the person, in the browser at `http://localhost:3100/keys`):

1. Create a key named `test`. Paste it straight into a private file - `(umask 077; pbpaste > ~/.config/boli/platform_test_key)`
   on macOS right after pressing Copy - and close the dialog.
2. Reload: the row shows `boli_sk_xxxxxxxx****`, Created now, Last used "never". There is no way to show the key again.
3. In the database: `SELECT length(key_hash), prefix FROM api_key ORDER BY created_at DESC LIMIT 1;` -> `64` and a
   16-character prefix. Nothing in any column equals the full key.

### 4. One dispatcher route, a rewrite, and the middleware trap

Files (already in the tree, from the lead's contract):

```js
// apps/main/next.config.js
async rewrites() {
    return [{ source: '/v1/:path*', destination: '/api/v1/:path*' }]
}
```

```ts
// apps/main/middleware.ts
export const config = {
    matcher: ['/((?!api/|v1/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'],
}
```

and one route file `apps/main/app/api/v1/[...path]/route.ts` that switches on the path: `chat/completions` (POST),
`models` (GET), anything else 404 `not_found` in the OpenAI shape.

Why a rewrite: OpenAI clients append paths to a base URL (`base_url="https://<app>/v1"` -> `/v1/chat/completions`).
The App Router keeps route handlers under `app/api/...` in this app, so `/v1/*` is rewritten to `/api/v1/*`.

**The trap: middleware runs before rewrites.** Next.js matches middleware against the URL the client sent
(`/v1/chat/completions`), not the rewritten one. A session middleware whose matcher only skips `api/` will see `/v1/...`,
find no session cookie, and answer **307 to `/signin`** - an HTML redirect to a program that wanted JSON. The fix is the
`v1/` exclusion in the matcher above. The route then does its own auth (the key), like every `/api/*` route.

Why one dispatcher instead of a file per endpoint: auth, rate limit, error shape and logging are written once and cannot
drift between endpoints.

**Verify:**

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/v1/models
```

Expected: `401 ` (no redirect URL). If you see `307 http://localhost:3100/signin...`, the matcher does not exclude `v1/`.

### 5. Read and check the key

```ts
function readKey(req: Request): string | null {
    const auth = req.headers.get("authorization")
    if (auth) {
        const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
        if (m) return m[1].trim()
    }
    return req.headers.get("x-api-key")?.trim() || null
}
```

Then `authenticateKey(token) -> { keyId, userId } | null` (design):

1. Cheap shape check first: `token.startsWith(API_KEY_PREFIX) && token.length === 40`. A wrong shape is 401 with no
   database read (stops junk traffic from costing queries).
2. `SELECT id, user_id FROM api_key WHERE key_hash = sha256Hex(token) AND revoked_at IS NULL`.
3. Not found or revoked: **401 `invalid_api_key`** with the same message for both ("Invalid API key"). Do not say which;
   that tells an attacker a key once existed.
4. Found: update `last_used_at`. (open) Throttle it (only when older than a minute) so a busy key does not write on
   every call.
5. The user must still be active (`user.isActive`); a deactivated user's keys get 401.

**Constant-time considerations.** A timing attack needs the attacker to compare their guess against the secret one
character at a time. Here the database compares SHA-256 outputs, and the attacker cannot choose a guess whose hash
shares a prefix with the stored hash, so timing leaks nothing usable. That is one reason to look up by hash. Where a
raw secret *is* compared (a cron bearer, a webhook signature), use `safeEqual` from `@repo/crypto/password`
(`timingSafeEqual`), never `===`.

**Why SHA-256 and not bcrypt/argon2 here.** Slow, salted hashes protect **low-entropy** secrets (human passwords) from
guessing after a leak. A 190-bit random key cannot be guessed whatever the hash speed, and the key is checked on every
request, so it must be fast and must be indexable: a salted hash cannot be looked up by value. Fast unsalted SHA-256 of a
high-entropy key is the usual choice for API tokens.

**Verify:** `curl -s http://localhost:3100/v1/models -H "Authorization: Bearer boli_sk_wrong" ` -> 401 JSON;
`-H "x-api-key: $(cat ~/.config/boli/platform_test_key)"` -> 200 and the model list.

### 6. Rate limit by counting recent rows (design: `ratelimit.ts`)

`checkRateLimit(userId) -> { ok: true } | { ok: false, retryAfterSec }`:

```sql
SELECT count(*)::int AS n, min(created_at) AS oldest
  FROM inference_request
 WHERE user_id = $1 AND created_at > now() - interval '60 seconds';
```

- `n >= RATE_LIMIT_PER_MIN` (30) -> **429 `rate_limit_exceeded`** with header `Retry-After: <seconds>`, where seconds =
  `ceil(60 - (now - oldest))`, at least 1. That is when the oldest call leaves the window.
- Per **account**, not per key: making 10 keys must not buy 300 requests a minute. Kura's calls count too.
- The index `inference_request_user_created_idx (user_id, created_at)` makes this one index range scan.

Why rows and not a counter store: no new infrastructure (no Redis, no Durable Object); the rows exist anyway for usage
and billing. Known limits, accepted for v0:

- A row is written when a call **finishes**, so calls still running are not counted. 30 calls sent at the same instant
  all pass. The model server's own slot count (`-np`) is the real concurrency cap.
- One extra query per call.
- Sarvam uses a token bucket per account per API (LLMs 50 req/min on pay-as-you-go). Move to a token bucket in a
  Durable Object or Redis when burst control matters.

**Verify:** see "Verify the whole thing", check 7.

### 7. Balance check

`hasBalance(userId)`: `balance_micro > 0` on the user's `billing_account` (08). If not, **402 `insufficient_quota`**
before anything reaches the model. A request already running when the balance hits zero finishes and is charged
(plan Q9), so the balance can go slightly negative by one call's cost; the next call is refused. No retry clears a 402;
only adding credits does.

### 8. Forward to the model (design: `upstream.ts`)

`upstreamChat(body, { stream, signal }) -> Response`:

- URL `LLAMA_BASE_URL + "/v1/chat/completions"`, header `Authorization: Bearer ${LLAMA_API_KEY}`.
- **Never forward the client's `Authorization` header.** Build a new request; copy only the JSON body.
- `model`: the public id `boli-chat` is replaced by `BOLI_UPSTREAM_MODEL`, and replaced back in the response, so the
  client never learns or depends on the weights behind the id.
- `think: true` from the client maps to the upstream reasoning switch (Kura's Think toggle); thinking tokens are
  billed as output.
- Pass `req.signal` so a client that hangs up stops the upstream generation.
- Network error, timeout or upstream 5xx: **503 `model_unavailable`**, and an `inference_request` row with
  `status='error'`, `error_code='model_unavailable'`, cost 0.

### 9. Non-streaming answers

Read `usage.prompt_tokens` and `usage.completion_tokens` from the upstream JSON. **Trust the upstream counts, never
the client's.** Charge (step 11), then return the upstream JSON with `model` set back to `boli-chat`.

**Verify:**

```bash
curl -s http://localhost:3100/v1/chat/completions \
  -H "Authorization: Bearer $(cat ~/.config/boli/platform_test_key)" -H "Content-Type: application/json" \
  -d '{"model":"boli-chat","messages":[{"role":"user","content":"Say hello in Romanized Nepali, one line."}],"max_tokens":40}' \
  | python3 -m json.tool
```

Expected: `choices[0].message.content` has the answer, `model` is `boli-chat`, `usage` has token counts.

### 10. Streaming pass-through with usage capture

A streamed answer is server-sent events: `data: {...}\n\n` lines, then `data: [DONE]`. Token counts are not in the
normal chunks. OpenAI's protocol adds them in one extra final chunk (empty `choices`, a `usage` object) **only when the
request says** `"stream_options": {"include_usage": true}`.

So the gateway:

1. Always sets `stream_options.include_usage = true` on the upstream request, remembering whether the client asked.
2. Pipes the upstream body through a `TransformStream` that **forwards bytes unchanged** (no buffering: the person must
   see each token as it arrives) while splitting the text on `\n\n`, parsing `data:` lines, and keeping the last
   `usage` it sees.
3. Drops the usage chunk if the client did not ask for it (some clients break on a chunk with empty `choices`).
   (open) Confirm against the OpenAI SDKs before relying on this.
4. In the transform's `flush()` (upstream finished, response not yet closed): charge with the captured usage, then let
   the stream end. Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`.

(open) A client that disconnects mid-stream triggers `cancel()`, not `flush()`, and no usage chunk arrives. The plan
does not yet say how that partial answer is charged (options: count streamed content chunks as an estimate, or charge
input tokens only). Decide and record it here before release.

**Verify the upstream first** (llama-server must send the usage chunk; check your build):

```bash
curl -sN http://127.0.0.1:8080/v1/chat/completions \
  -H "Authorization: Bearer $(cat ~/.config/boli/api_key)" -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Count to five."}],"stream":true,"stream_options":{"include_usage":true}}' | tail -n 3
```

Expected: a `data:` line containing `"usage"` before `data: [DONE]`. If it is missing, the gateway cannot charge streams
from usage; stop and solve that first. Then the same through the gateway with your platform key and `-N`: words arrive
one by one, and the balance goes down afterwards.

### 11. Charge inline, in one batch, with an idempotency key (design: `credits.ts`)

`chargeInference(row) -> { requestId, costMicro, balanceMicro }`:

- `requestId = crypto.randomUUID()` made **before** the upstream call; it is the `inference_request.id` and the ledger
  key `spend:<requestId>`.
- `costMicro = costMicro(BOLI_CHAT, inputTokens, outputTokens)` from `lib/boli.ts` (08 has the arithmetic).
- One `db.batch([...])` (one round trip; `db.transaction()` **throws** on the neon-http driver, see
  `packages/db/src/client.ts`):
  1. `INSERT INTO inference_request (...) VALUES (...) ON CONFLICT (id) DO NOTHING`
  2. one SQL statement: a CTE that inserts the ledger `spend` row (`amount_micro = -costMicro`,
     `idempotency_key = 'spend:<requestId>'`, `ON CONFLICT DO NOTHING RETURNING amount_micro`) and an `UPDATE
     billing_account SET balance_micro = balance_micro + (SELECT amount_micro FROM ins) ... WHERE EXISTS (SELECT 1 FROM
     ins)`. Same pattern as `addCredits` in `packages/billing/src/ledger.ts`. A repeat inserts nothing and moves nothing.

Why the key matters here: the database client retries transient failures (`retryingFetch`), and a worker can be retried.
Without the key, a retry charges twice.

**Why inline and never in a background promise.** The response is the last thing the platform is guaranteed to finish.
Work started after it (`after()`, `waitUntil`, an un-awaited promise) can be cut off when the worker is recycled, and
nobody sees the failure: the model ran, the user got the answer, the money never moved. The existing `spendCredits`
comment says the same: "Runs INLINE after the turn (never `after()`)". The cost of charging inline is one round trip
added to each call; non-streaming adds it before the response, streaming adds it before the stream closes.

**Verify:**

```sql
SELECT r.id, r.source, r.input_tokens, r.output_tokens, r.cost_micro, l.amount_micro
  FROM inference_request r JOIN credit_ledger l ON l.idempotency_key = 'spend:' || r.id
 ORDER BY r.created_at DESC LIMIT 3;
```

Expected: `cost_micro = input_tokens*2 + output_tokens*6`, `amount_micro = -cost_micro`, `source = 'api'`.

### 12. Errors in the OpenAI shape

Every non-2xx from `/v1/*` is JSON `{"error":{"message":"...","type":"...","code":"..."}}`, so OpenAI SDKs raise their
usual exception classes. From `API_ERRORS` in `lib/boli.ts`:

| HTTP | `code` | `type` | When | Retry? |
|---|---|---|---|---|
| 400 | `invalid_request` | `invalid_request_error` | body not JSON, no `messages`, unknown `model` | no, fix the request |
| 401 | `invalid_api_key` | `authentication_error` | no key, wrong shape, unknown, revoked, user inactive | no |
| 402 | `insufficient_quota` | `insufficient_quota` | balance <= 0 | no, add credits |
| 404 | `not_found` | `invalid_request_error` | unknown `/v1/...` path | no |
| 429 | `rate_limit_exceeded` | `rate_limit_error` | 30 calls in the last 60 s; sends `Retry-After` | yes, after `Retry-After` |
| 503 | `model_unavailable` | `server_error` | model server down, timeout, 5xx | yes, with backoff |

For comparison, Sarvam answers a bad key with **403** `invalid_api_key_error`. Boli uses **401** because that is what
OpenAI clients expect for authentication.

Never put internal detail (upstream URL, SQL error, stack) in `message`.

### 13. Metadata-only logging

`inference_request` stores: user, key id, source (`api` / `kura`), model, token counts (input, output, reasoning), cost,
latency, time to first token, stream flag, status, error code, time. It has **no column for prompt or answer text**
(plan Q51). Kura's own conversations are stored separately because they are the user's own chat history.

The same rule for logs: never `console.log` a request body, a response body, an `Authorization` header or a key. Log the
request id and key id; the prefix is safe, the key is not.

### 14. `GET /v1/models`

Requires a valid key (same auth as chat). Returns `{"object":"list","data":[{"id":"boli-chat","object":"model",...}]}`
built from `MODELS` in `lib/boli.ts`, never the upstream id.

## Verify the whole thing

The person creates the test key (step 3). Every command reads the key from the file with `$(cat ...)` inside that one
command; never export it or echo it. Set `B=http://localhost:3100` first.

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | No key | `curl -s -w " %{http_code}\n" $B/v1/models` | `invalid_api_key` JSON, 401 |
| 2 | Wrong key | `curl -s -w " %{http_code}\n" -H "Authorization: Bearer boli_sk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" $B/v1/models` | 401 |
| 3 | Bearer works | `curl -s -w " %{http_code}\n" -H "Authorization: Bearer $(cat ~/.config/boli/platform_test_key)" $B/v1/models` | `boli-chat`, 200 |
| 4 | x-api-key works | `curl -s -w " %{http_code}\n" -H "x-api-key: $(cat ~/.config/boli/platform_test_key)" $B/v1/models` | 200 |
| 5 | Chat charges | step 9's curl, then the step 11 SQL | answer; a new row; balance lower |
| 6 | Not redirected | step 4's curl | `401`, no redirect URL |
| 7 | Rate limit | the loop below | `30 200` and `1 429`, `Retry-After` present |
| 8 | Zero balance | below | 402 `insufficient_quota` |
| 9 | Revoked | revoke `test` in `/keys`, repeat check 3 | 401 |
| 10 | No text stored | `SELECT column_name FROM information_schema.columns WHERE table_name='inference_request';` | no prompt / content / message column |
| 11 | OpenAI SDK | `buildSamples()` Python sample with `base_url` = `$B/v1` | prints an answer |

Rate limit loop (31 tiny calls in well under a minute; each costs a few hundred micro-credits):

```bash
for i in $(seq 1 31); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/v1/chat/completions \
    -H "Authorization: Bearer $(cat ~/.config/boli/platform_test_key)" -H "Content-Type: application/json" \
    -d '{"model":"boli-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'
done | sort | uniq -c
curl -si http://localhost:3100/v1/chat/completions -H "Authorization: Bearer $(cat ~/.config/boli/platform_test_key)" \
  -H "Content-Type: application/json" -d '{"model":"boli-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":1}' | grep -i retry-after
```

Zero balance (**a test account only**; this breaks the rule that the balance equals the ledger sum, so put it back
after): note the current `balance_micro`, `UPDATE billing_account SET balance_micro = 0 WHERE owner_id = '<test user id>';`,
run check 3's chat call, expect 402, then restore the noted value.

## Traps already known (from the design and the code)

- **Middleware runs before rewrites.** `/v1/*` must be excluded from the session middleware's matcher, or every API
  call gets a 307 to the sign-in page.
- **Forwarding the client's `Authorization` header upstream.** The user's key would travel to the model server (one
  more place it could be logged), and the model server would reject it because it only knows `LLAMA_API_KEY`. Build a
  fresh request.
- **Charging in `after()` / `waitUntil`.** Money moves inline or not at all.
- **No idempotency key on the spend.** The DB client retries; a retry would charge twice.
- **`db.transaction()` on neon-http throws.** Use `db.batch` or single statements.
- **Rate limiting per key.** Ten keys would mean ten times the limit. Count per account.
- **Saying "revoked" in the 401.** Same message for unknown and revoked keys.
- **Streaming without `include_usage`.** The stream finishes and nothing is charged.
- **Buffering the stream to parse it.** The user waits for the whole answer. Forward each chunk as it arrives.
- **Quick tunnels and SSE.** Streams fail through a quick tunnel (03). Test streaming against `127.0.0.1:8080` or a
  named tunnel.
- **Logging the body "just for debugging".** Prompts are other people's data; Q51 says metadata only.
- **`Math.random` or `% 62` on raw bytes.** Not a CSPRNG / biased characters.

## Done when

- All 11 checks in "Verify the whole thing" pass, against the real code, and this doc's (design) and (open) marks are
  replaced by what the code actually does.
