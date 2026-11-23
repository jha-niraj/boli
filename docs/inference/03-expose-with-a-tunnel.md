# 03 - Expose the model with a tunnel

**Gets you:** the locally running model reachable from anywhere over HTTPS, with every request requiring an API key,
and no port opened on the machine or router.

**Measured on:** Apple M5, 16 GB, home network, 2026-11-24. cloudflared 2026.11.0, Cloudflare quick tunnel.

**Use for:** testing from outside, demos, short client trials. **Not for:** anything people depend on (see Limits).

## Prerequisites

- 01 done: the model runs locally.
- `brew install cloudflared` (or the release binary on Linux/Windows). No Cloudflare account needed for a quick tunnel.

## Steps

### 1. Create the API key (the person runs this)

```bash
mkdir -p ~/.config/boli && (umask 077; echo "boli_$(openssl rand -hex 24)" > ~/.config/boli/api_key)
```

48 random hex characters with a `boli_` prefix, in a file only this user can read. Never printed.

**Verify:** `ls -l ~/.config/boli/api_key` shows `-rw-------`.

### 2. Start the server with the key required (terminal tab 1)

```bash
LLAMA_API_KEY="$(cat ~/.config/boli/api_key)" llama-server -hf ggml-org/gemma-4-E4B-it-GGUF:Q4_0 --no-mmproj -c 8192 --port 8080 --jinja --reasoning auto
```

- The variable is set for this one process only. Do **not** `export` it.
- The server stays on `127.0.0.1`: the tunnel connects from the same machine.

**Verify:** log shows `listening on http://127.0.0.1:8080`.

### 3. Open the tunnel (terminal tab 2)

```bash
cloudflared tunnel --url http://localhost:8080
```

It prints a public address like `https://<random-words>.trycloudflare.com`. **Both tabs must stay open**; closing
either takes the model offline. Ctrl+C in tab 2 kills the address immediately.

### 4. Verify from outside

```bash
curl -s https://<address>/health                              # {"status":"ok"}  (no key needed)
python3 ml/llm/probe_remote.py https://<address>              # reads the key file itself
```

`probe_remote.py` checks, in order:

1. Request **without** a key -> must be **HTTP 401**. If not, stop: the server is open.
2. First and warm calls (English, Romanized, label) with timings.
3. Three requests at once.

Optional: open `https://<address>/health` on a phone using mobile data.

## Measured results

| Check | Through the tunnel | Locally |
|---|---|---|
| No key | 401 in 0.3-0.4 s | - |
| English, 44 tokens | 1.7-2.1 s | 1.5 s |
| One-word label | 0.5 s | 0.4 s |
| 3 requests at once | all done in 3.3-4.0 s; combined 43-55 tokens/s vs ~30 for one | - |
| Same prompt twice | second call prefilled 5 tokens instead of 129 (cache reuse) | same |

## Limits of quick tunnels (Cloudflare docs, checked 2026-11-24)

- Address is random and changes on every start.
- Up to 200 requests in flight, then HTTP 429.
- **No server-sent events**: streaming answers (and the built-in chat page) do not work through it. Non-streaming
  API calls do.
- No uptime guarantee; meant for testing and development.
- A fixed address on your own domain needs a **named tunnel** (Cloudflare account + domain); see 07.

## What the single key does not cover

The chat page and `/health` load without the key; the key is shared by everyone; it cannot be revoked per person;
there is no rate limit; refused requests still reach the machine. Doc 07 (gateway, per-user keys, limits) fixes these.

## Traps already hit

- **Exporting `LLAMA_API_KEY`** makes every llama-server in that shell demand a key.
- **Trusting the page's key prompt.** The page is a client; only the no-key 401 test proves enforcement.
- **A changed system prompt looks like a broken deployment.** A shortened prompt made English answers come back in
  Devanagari through the tunnel. Pin and reuse the exact prompt from 02.

## Done when

- The no-key request returns 401, a keyed request answers from another network, and the timings are recorded.
