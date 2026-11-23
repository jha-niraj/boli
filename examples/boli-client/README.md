# boli-client - call the Boli API from another project

A tiny standalone project (not part of the pnpm workspace) that proves another codebase can call Boli with an API key.
Boli speaks the OpenAI API, so the stock `openai` SDK works: only `baseURL` and the key change.

## 1. Get a key

1. Run the platform (`pnpm --filter main dev`, http://localhost:3100) with the model server up.
2. Sign in, open **http://localhost:3100/keys**, click **Create key**, give it a name.
3. Copy the key (`boli_sk_...`). It is shown **once**; Boli stores only a hash.

## 2. Put the key in `.env` (never commit it)

```bash
cd examples/boli-client
cp .env.example .env
# edit .env: BOLI_API_KEY=boli_sk_...
```

`.gitignore` already lists `.env`. Check with `git check-ignore .env` (it should print `.env`).

| Variable | Default | Meaning |
|---|---|---|
| `BOLI_API_KEY` | (required) | Your `boli_sk_` key. The scripts refuse to run without it and never print it. |
| `BOLI_BASE_URL` | `http://localhost:3100/v1` | The API root. Use your deployed origin + `/v1` later. |

## 3. Run

Node (22.9 or newer, for `--env-file-if-exists`):

```bash
npm install
npm run quickstart     # one reply + usage
npm run stream         # tokens as they arrive + time to first token
```

Python (3.9+):

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r python/requirements.txt
set -a; . ./.env; set +a      # load the key into the shell
python3 python/quickstart.py
```

## Expected output

`quickstart` (Node and Python print the same shape):

```
model: boli-chat  (1840 ms)

Kathmandu ma ghumna ramro thau haru: Pashupatinath, Swayambhu, Boudhanath, Basantapur Durbar Square ...

usage: {"prompt_tokens":38,"completion_tokens":61,"total_tokens":99}
```

`stream`:

```
Himal ko chuchura ma ... (text appears word by word)

time to first token: 420 ms, total: 3100 ms
usage: {"prompt_tokens":31,"completion_tokens":74,"total_tokens":105}
```

The cost of a call is `prompt_tokens x 2 + completion_tokens x 6` micro-credits (2 / 6 credits per 1M tokens), so a call
like the one above costs well under 0.01 credits. Each call shows up in the dashboard under **/usage**.

## Errors

Every error has the OpenAI shape `{"error": {"message", "type", "code"}}`; the scripts print status, code and message.

| Status | `error.code` | Meaning | What to do |
|---|---|---|---|
| 400 | `invalid_request` | Bad body: empty `messages`, wrong types, unknown fields out of range | Fix the request; the message says which field. |
| 401 | `invalid_api_key` | Key missing, mistyped or revoked | Check `BOLI_API_KEY` in `.env`; create a new key at /keys if it was revoked. |
| 402 | `insufficient_quota` | Credit balance is 0 | Add credits at /billing. |
| 404 | `not_found` | Unknown model or path | Use model `boli-chat` and the `/v1/...` paths. |
| 429 | `rate_limit_exceeded` | More than 30 requests in a minute (all your keys and Kura share it) | Wait the seconds in the `Retry-After` header, then retry. |
| 503 | `model_unavailable` | The model server is down or unreachable | Retry in a minute; locally, start the model server and check `LLAMA_BASE_URL`. |

The scripts set `maxRetries: 0` so you see each error as it happens; in a real app leave the SDK's default retries on.
