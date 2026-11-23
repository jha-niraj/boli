# Small chat model - our own inference for everyday AI tasks, Claude for the heavy ones

| | |
|---|---|
| **App / module** | `repo/ml` (spike in `ml/llm/`), later `packages/ai` |
| **Status** | Planned |
| **Opened** | 2026-11-23 |
| **Last updated** | 2026-11-23 (Romanized Nepali) |
| **Files** | `ml/llm/` (prompts, runner, results), `ml/models/` (git-ignored), later `packages/ai/src/config.ts`, `models.ts` |

## What was asked

Two tracks: (1) inference for chat-like work, (2) STT and TTS (`model-spike.md`). Today every task in
`packages/ai/src/config.ts` runs on Claude Haiku 5.5. The owner wants our own model inference for the small chat tasks
and keeps the big tasks on Claude. Research on the web and in the browser first, then come back with a plan.
Clarified 2026-11-23: the chat is in **English and Romanized Nepali** (Nepali in Latin letters, mixed with English,
e.g. "mero exam sakiyo, aba k garne?"), not Devanagari.

## What "done" looks like

- A 60-prompt English / Romanized Nepali / code-mixed test set (with spelling variants: cha / xa / chha) from Boli's real small tasks (short chat replies, summaries, classify),
  scored by the owner (native speaker) for each candidate next to Haiku's answers.
- One table: model, licence, size, where it runs, tokens per second, first-token latency, memory, cost per 1,000
  requests, owner score.
- A decision per task in `AI_TASKS`: stays on Claude, or moves to which open model, with the evidence.
- If a task moves: a second provider in `packages/ai` behind the same task map, usage rows priced, and a fallback to
  Haiku when our model is down.

## Open questions

- No published Nepali benchmark for Gemma 4 or Qwen 3.5 (Zunkiree Labs, 2026-10-05; web search 2026-11-23). Working
  assumption: our own 50-prompt test decides, not leaderboards.
- Workers AI is "our own" only in the sense of open weights on Cloudflare; true self-hosting needs our own machine.
  Owner to decide which counts once the numbers are in.

---

## Research (2026-11-23)

- Cloudflare Workers AI catalog (opened in Chrome): hosts open models we could call from the app's own Workers with no
  server: `gemma-4-26b-a4b-it`, `qwen3-30b-a3b-fp8`, `qwen3.8-27b`, `gpt-oss-20b`, `llama-3.2-3b-instruct`,
  `granite-4.0-h-micro`, plus `indictrans2-en-indic-1B` (translation incl. Nepali). Speech there is Whisper, Deepgram
  nova-3 / flux, Aura (en, es), MeloTTS - nothing Nepali-specific. Billing: 10,000 free Neurons a day.
- Hugging Face: `google/gemma-4-E2B-it`, `E4B-it`, `12B-it`, `26B-A4B-it`, `31B-it`, with official 4-bit QAT GGUF
  builds (`gemma-4-E4B-it-qat-q4_0-gguf`, `12B-it-qat-q4_0-gguf`). Apache 2.0. Card: 35+ languages supported, 140+
  pre-trained; E2B / E4B / 12B also take audio (ASR) - a candidate for the STT track too.
- Hugging Face: `Qwen/Qwen3.5-0.8B / 2B / 4B / 9B / 27B / 35B-A3B`; card says 201 languages and dialects.
- Nepali evidence: IndicParam (Jan 2026) Gemma-3 4B < 30%, 12B 34.8%, 27B ~39%, Gemini 2.5 52%. Community LoRA
  `saliltambe/gemma-4-E2B-it-nepali-lora` shifts script to Devanagari, not quality.
- Serving engines: llama.cpp `llama-server` (OpenAI-compatible, CPU and Apple Metal) for laptop and CPU servers; vLLM
  only with a GPU and many concurrent users; Ollama wraps llama.cpp.

## Research - Romanized Nepali (2026-11-23)

- arXiv 2611.12628 (Nov 2026): Llama-3.2-3B, Qwen2.5-3B, Gemma-2-2B zero-shot answer in English-like text 54-92% of the
  time (chrF++ 10-14). QLoRA on 9,000 transliterated instruction examples lifts chrF++ to 29-31. Gemma-2-2B worst.
- arXiv 2604.14171 (Mar 2026): Llama-3.1-8B, Mistral-7B, Qwen3-8B all fail to generate Romanized Nepali zero-shot;
  Qwen3-8B the only one with relevant output. QLoRA (rsLoRA r=32, ~1% of params) on 10,000 samples, under 27 GPU-hours
  on two T4s, fixes it (BERTScore ~0.75, chrF++ > 23).
- HF `BarshaKC/nepali-romanized-evaluation` (Oct 2026): Qwen2.5-3B-Instruct translated 0 of 23 everyday Romanized
  sentences correctly ("mero exam sakiyo" -> "My exam is starting").
- Indi-RomCoM (arXiv 2606.30790): LLMs get worse as Romanized code-mixing gets denser (4 Indic languages; Nepali
  inclusion not confirmed).
- Data: `syubraj/roman2nepali-transliteration` (MIT, ~2.4M pairs); NepaliXlit (CHiPSAL 2026) for transliteration.
- Gap: no published Romanized Nepali result for Gemma 4, Qwen 3.5 or Claude Haiku. Our test fills it.
- Conclusion: older 2-8B models do not handle Romanized Nepali out of the box; fine-tuning does fix it. Newer models
  and larger hosted ones are untested, so the zero-shot screen comes first and fine-tuning is the expected fallback.

## Tasks (revised 2026-11-23 for Romanized Nepali)

- [ ] **1. Test set**: 60 prompts - 20 English, 20 Romanized Nepali, 20 code-mixed - covering reply, summary,
  classify and "what does this mean"; spelling variants; owner adds ~15 real messages of their own. Haiku answers.
  - Acceptance: `ml/llm/prompts.jsonl` + `haiku.jsonl`; owner has approved the list.
  - Verified:
- [ ] **2. Local, on the Mac**: llama.cpp `llama-server` with Gemma 4 E4B QAT Q4 and Qwen 3.5 4B (Q4 GGUF).
  - Acceptance: both answer the 50 prompts; tokens/s, first-token latency, memory recorded.
  - Verified:
- [ ] **3. Hosted open models on Workers AI**: Gemma 4 26B-A4B and Qwen3 30B-A3B on the same 50 prompts.
  - Acceptance: latency and Neurons per request recorded (needs the owner's Cloudflare account token - owner sets it).
  - Verified:
- [ ] **4. Owner scores** every answer blind (model names hidden) in a scoring artifact.
  - Acceptance: score per model per task type.
  - Verified:
- [ ] **4b. Gate**: if a hosted model scores close to Haiku on Romanized prompts, it is the cheap path. If the small
  local models fail (expected from the research), go to 4c.
  - Verified:
- [ ] **4c. Fine-tune** the best small model (Qwen 3.5 4B or Gemma 4 E4B) with QLoRA on Romanized Nepali instruction
  data (transliterated + our own), on a free Kaggle / Colab GPU; re-run the test; export GGUF for llama-server.
  - Acceptance: owner score before vs after on the same 60 prompts.
  - Verified:
- [ ] **5. Free self-host deploy**: the best small model on a free Hugging Face Space CPU behind llama-server.
  - Acceptance: cold start, warm latency, tokens/s and 3 concurrent requests measured from the Mac.
  - Verified:
- [ ] **6. Decision + wiring** (only if a task moves): second provider in `packages/ai`, Haiku fallback, usage pricing.
  - Acceptance: decided per task with the table above; wiring gets its own plan doc in `plan/packages/ai/`.
  - Verified:

## Notes / decisions

- Chat on the AI page keeps tools and prompt caching on Claude; the first candidates to move are `classify` and
  `summary` (short, no tools, easy to score).
