# Boli inference platform - open chat first, then speech, behind our own API keys

| | |
|---|---|
| **App / module** | `repo/platform` (spans `ml/`, `packages/db`, `apps/main`, a gateway Worker) |
| **Status** | Planned |
| **Opened** | 2026-11-23 |
| **Last updated** | 2026-11-23 |
| **Files** | links: [`../ml/small-llm.md`](../ml/small-llm.md) (model choice + test), [`../ml/model-spike.md`](../ml/model-spike.md) (speech models) |

## What was asked

"No one wants to do this open inferencing." Start with open chat, then add STT / TTS on top. Test locally, practise
inference, then build our own platform where the owner generates an API key and uses the model inside any product.
Fine-tuning and how models are built come after. Produce learning documentation at every step.

## What "done" looks like (phase 3)

- The owner opens Boli's developer page, creates an API key, and calls
  `POST https://<boli-api>/v1/chat/completions` from any product with the OpenAI SDK (base URL + key changed only).
- The request is checked (key, rate limit), forwarded to our model, streamed back, and logged with token counts.
- The developer page shows keys, usage, and a playground to chat with the model.
- A reading artifact exists for each phase.

## Open questions

- Inference host after the Mac: free HF Space CPU first; then a rented GPU, CoreValley or YetiCloud in Nepal. Decided
  at phase 5 with measured numbers.
- Domain / subdomain for the API (e.g. `api.<domain>`). Owner decides at phase 3.

---

## Phases and tasks

- [ ] **1. Pick the model locally** (= `small-llm.md` phases A-E)
  - llama.cpp on the Mac, Gemma 4 E2B/E4B/12B, Qwen 3.5 2B/4B/9B. Only widely used, Apache-2.0 model families (owner, 2026-11-23); no niche lab models.
  - 60-prompt test: English, Romanized Nepali, mixed; blind scores vs Claude Haiku.
  - Acceptance: one chosen model with speed, memory and score per language.
  - Verified:
- [ ] **2. Serve it like an API, on the Mac**
  - `llama-server` OpenAI-compatible endpoint; call it with curl, Python, and the AI SDK (`packages/ai`).
  - Measure streaming, first-token latency, 1 vs 4 parallel requests (slots), context length vs memory.
  - Acceptance: a short script hits `localhost:8080/v1/chat/completions` with streaming; numbers recorded.
  - Verified:
- [ ] **3. Platform v0 - our own API keys**
  - DB (`packages/db`, additive SQL script): `api_key` (prefix + hash, owner, name, created, last used, revoked),
    `api_usage` (key, model, prompt tokens, output tokens, latency, status, time).
  - Gateway Worker: `/v1/chat/completions` and `/v1/models`; key check (hash, constant-time), rate limit, forward to the
    inference node, stream back, write usage.
  - Inference node: the Mac's llama-server exposed through a Cloudflare Tunnel (practice only).
  - `apps/main` developer page: create / revoke keys (shown once), usage table, playground.
  - Acceptance: a separate test app uses Boli via the OpenAI SDK with a Boli key; usage row appears.
  - Verified:
- [ ] **4. Fine-tune for Romanized Nepali** (= `small-llm.md` 4c)
  - QLoRA on a free Kaggle / Colab GPU; same 60-prompt test before and after; GGUF export.
  - Swap the model behind the same API as a new model name (`boli-chat-v1` -> `v2`); clients change nothing.
  - Verified:
- [ ] **5. Move inference off the Mac**
  - Free HF Space CPU, then one paid option; measure cold start, tokens/s, concurrent users, cost per 1M tokens.
  - Verified:
- [ ] **6. Speech on the same platform**
  - `/v1/audio/speech` (TTS: Kala first) and `/v1/audio/transcriptions` (STT: Kriti), same keys, same usage meter.
  - Verified:

## Learning docs (one reading artifact per phase, plus `docs/inference/*.md`)

1. What inference is: weights, tokens, the forward pass, quantization (4-bit), GGUF, llama.cpp.
2. Serving: OpenAI-compatible APIs, streaming (SSE), sampling (temperature, top-p), context window, KV cache, slots.
3. Platforms: API keys and hashing, rate limits, metering tokens, gateways, tunnels.
4. Fine-tuning: LoRA / QLoRA, datasets, evaluation, before vs after.
5. Hosting: CPU vs GPU, cost per token, cold starts, scaling.
6. Speech: audio as numbers, STT and TTS models, WER, RTF.

## Notes / decisions

- 2026-11-23: Candidate models limited to popular families (Gemma 4, Qwen 3.5). SAGEA and other small-lab models are
  out of the chat test. GGUF builds from `ggml-org` (llama.cpp's own org) for Gemma 4 and Qwen 3.5.
- 2026-11-23: `docs/inference/` is a reusable playbook: written so a future product (or Claude Code) can self-host a
  model by following it. Each phase adds or updates one doc there.

- 2026-11-23: Chat first, speech later; both behind ONE OpenAI-compatible API with Boli keys, so every product uses the
  same SDK. Fine-tuning moved after the platform: a better model is then a swap behind a stable API.
- Matches PLAN-phase-0-1: `apps/main` becomes the platform site; a gateway Worker fronts inference.
