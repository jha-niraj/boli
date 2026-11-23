# Self-hosting an open model - the playbook

Step-by-step instructions for running an open-weights language model yourself and serving it behind an API key, so a
product (Boli, or any client's product) can call it like it calls OpenAI. Every command here was run and every number
measured, on the hardware named in each doc. Written while building Boli (2026-11).

## For an AI agent (Claude Code or similar) reading this

You are guiding a person through deploying a model. Follow these rules:

1. **Go in order** (01, 02, 03, 04...). Each doc lists prerequisites, exact commands, the output to expect, how to
   verify, and traps already hit. Do not skip the **Verify** lines; a step is done only when its verify check passes.
2. **The person runs anything that touches a secret, money or an account** (creating keys, logging in, signing up,
   paying, creating hosted resources). Give them the exact command and explain each part; run read-only checks yourself.
3. **Never print, log or paste an API key or token.** Keys live in files with `umask 077` and are read by commands
   (`"$(cat file)"`), never echoed.
4. **One step at a time.** Say what will run, run it (or have them run it), show the result, then continue.
5. **Re-check anything time-sensitive** (free tiers, prices, image tags) against the provider's own page before relying
   on it. Docs here record what was true on the date shown.
6. If something differs from the expected output, stop and diagnose before moving on.

## The docs

| # | Doc | What it gets you | Status |
|---|---|---|---|
| 01 | [`01-run-a-model-locally.md`](01-run-a-model-locally.md) | llama.cpp installed, a GGUF model serving on localhost, the numbers to read | done |
| 02 | [`02-choose-a-model.md`](02-choose-a-model.md) | A repeatable comparison of candidate models with your system prompt | done |
| 03 | [`03-expose-with-a-tunnel.md`](03-expose-with-a-tunnel.md) | The model reachable from anywhere over HTTPS, key required, no open ports | done |
| 04 | [`04-hosting-options.md`](04-hosting-options.md) | Where else the model can run, with real limits and a ready Docker setup | done (options as of 2026-11-24) |
| 05 | [`05-inspect-a-model-file.md`](05-inspect-a-model-file.md) | What is inside a GGUF: architecture, layers, weights, defaults | done |
| 06 | [`06-host-on-a-server.md`](06-host-on-a-server.md) | The model on a machine whose only job is serving (Cloudflare Containers or Modal; options in 04) | planned (placeholder) |
| 07 | [`07-api-keys-and-gateway.md`](07-api-keys-and-gateway.md) | Per-user keys stored as hashes, one gateway route: auth, rate limit, balance, forward, stream, charge, OpenAI-shaped errors | draft from design |
| 08 | [`08-credits-and-billing.md`](08-credits-and-billing.md) | Micro-credit ledger, prices per token, the welcome grant, eSewa / Khalti top-ups, worked costs | draft from design |
| 09 | `09-speech-endpoints.md` | Speech to text and text to speech behind the same keys | planned |

Fine-tuning is a separate playbook (later).

## Defaults used in Boli (copy for a new product, then re-check)

| Thing | Value |
|---|---|
| Engine | llama.cpp `llama-server` (Homebrew on macOS; official image `ghcr.io/ggml-org/llama.cpp:server` on Linux/Docker) |
| Model | Gemma 4 E4B instruction-tuned, 4-bit: `ggml-org/gemma-4-E4B-it-GGUF:Q4_0` (4.59 GB, Apache 2.0) |
| Server flags | `--no-mmproj -c 8192 --jinja --reasoning auto` (+ `--port`, `--host`, `-np`, `-t` per machine) |
| Key | random, in `~/.config/boli/api_key` (mode 600), passed as `LLAMA_API_KEY="$(cat ~/.config/boli/api_key)"` |
| System prompt | see `02-choose-a-model.md`; it is part of the deployment and is pinned with the model |
| API shape | OpenAI-compatible: `POST /v1/chat/completions`, `GET /v1/models`, `GET /health` |
| Test scripts | `ml/llm/probe_plain.py`, `ml/llm/probe_system_prompt.py`, `ml/llm/probe_remote.py` |

## Where the learning version lives

The same material written as a course (stories, quizzes, exercises) is in ShipIt HQ:
`shipithq/apps/main/content/learn/inference/`. Raw measurements: `ml/llm/NOTES-*.md`.
