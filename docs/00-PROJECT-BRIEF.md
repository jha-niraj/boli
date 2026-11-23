# Nepali Speech Platform — Project Brief for Claude Code

**Status:** Pre-build. This document is the single source of truth for scope, constraints, architecture and phasing. Read it fully before proposing a plan. Companion files: `01-RESEARCH-DOSSIER.md` (landscape, models, datasets, links) and `02-LEARNING-ROADMAP.md` (what the owner is learning at each phase).

**Date:** 19 October 2026
**Owner:** solo founder/developer, Nepal-focused. Can code; Python is new to them (see §9 — this project is also a learning expedition and you must build accordingly).

---

## 1. What we are building, in one paragraph

A self-hosted, Sarvam-style speech platform for Nepali: a REST + WebSocket API for **speech-to-text (STT)** and **text-to-speech (TTS)**, with API keys, usage metering, a browser playground and developer docs — running open Nepali models on infrastructure we control, so that no audio or text is ever sent to a third-party AI vendor (Sarvam, Google, OpenAI, ElevenLabs, etc.). First consumer is the owner's own product; second is Nepali developers via self-serve signup; third is Nepali banks, telcos and government bodies who refuse foreign AI APIs and will eventually need an on-prem deployable version.

## 2. Why this exists (the gap we found)

Research summary (full detail in the dossier):

- No Nepali company offers a self-serve developer platform for speech. TingTing is a telephony/outbound-calling suite with a half-finished API; Koili is TTS-only with dead API links; TalkC, Wiseyak, Paaila and Diyo are sales-only B2B. Paaila's "API coming soon" has been up for years.
- The genuinely good Nepali speech work is **open and un-productised**: Naamche Labs' *Kriti* (ASR, MIT, 24.08% WER, #1 of 19 systems on its dev benchmark) and Ampixa Labs' *NepaliConformer* (ASR, 33.8% WER on real call-centre audio), *Kala* (VITS TTS, 5 voices) and *sanoTTS* (tiny CPU TTS). Nobody has wrapped these in a platform.
- Sarvam supports Nepali (`ne-IN`) well, and Bhashini (India) signed an MoU with Kathmandu University in June 2026 to build Nepali STT/TTS. That means the "Sarvam-like experience for Nepali" will exist — but hosted in India. The opening is a **Nepal-controlled** alternative with a compatible developer experience.

## 3. What we are NOT doing (v1)

- **Not training ASR/TTS models from scratch.** The labs spent months and 600–1,600 hours of audio to reach 24–34% WER. We start by serving their open models, measure them honestly, and fine-tune later with our own data (Phase 6).
- Not building a voice agent, LLM, translation or transliteration. Those are Phase 8+ and only if STT/TTS has users.
- Not building telephony (SIP/PSTN). TingTing and TalkC own that.
- Not promising "data never leaves Nepal" in v1 — see §5, this must be worded honestly.

## 4. Hard constraints and decisions already made

| Decision | Value | Rationale |
|---|---|---|
| v1 scope | STT + TTS API, batch first, streaming second | Core primitive; everything else composes on top |
| Language | Nepali (Devanagari) incl. Nepali-English code-mixing | Code-mixing is how Nepalis actually speak; both Sarvam and Ampixa treat it as first-class |
| No third-party AI APIs | **Hard rule.** No Sarvam, Google STT/TTS, Azure, OpenAI, ElevenLabs, Deepgram, AssemblyAI, Cloudflare Workers AI models anywhere in the inference path | This is the product's entire reason to exist |
| Edge/app layer | Cloudflare (Workers/Pages, Singapore or Mumbai PoP), R2 if object storage is needed | Owner already uses it |
| Database | Neon Postgres (Singapore) | Owner already uses it |
| Model inference | A GPU host we control — see §6 | Cloudflare Workers cannot run GPU ASR/TTS models |
| API surface | **Sarvam-compatible shape** where sensible (`language_code`, `model`, `with_diarization`, etc.) | Lets Nepali devs swap Sarvam → us with a URL change; strong adoption lever |
| Licensing | Every model, dataset and frontend must have its license verified and recorded in `LICENSES.md` before it enters the stack | Mix of MIT, CC-BY-SA-4.0, possibly CC-BY-NC in this space; CC-BY-SA on a G2P frontend may have implications for a commercial product — a human must check |
| Repo language | **TypeScript (Node) for the API/inference service, gateway, platform and playground.** Python only where unavoidable: eval harness, model export to ONNX, fine-tuning, and a fallback model worker if a model cannot be exported | Owner's decision (19 Oct). Models are Python artifacts, so the TS path depends on ONNX export + `sherpa-onnx` Node bindings / `onnxruntime-node`; Phase 2 starts with an export spike that proves or disproves this per model |

## 5. Data sovereignty — say it precisely

The owner's actual requirement, clarified: **audio and text must not be sent to any third-party AI service.** Rented infrastructure is acceptable for v1.

So the honest v1 claim is:

> "Your audio is processed only by models we run ourselves. It is never sent to Sarvam, Google, OpenAI or any other AI provider. Infrastructure is currently hosted in Singapore/Mumbai; a Nepal-hosted and on-premises option is on the roadmap."

Do **not** write "data stays in Nepal" anywhere until Phase 7 is done. Banks and government will ask exactly this question and a false claim kills the deal. Phase 7 (on-prem Docker/Helm package + Nepal data-centre option) is what makes the stronger claim true.

Also: store user audio **only** with explicit opt-in (needed later for the fine-tuning flywheel, Phase 6). Default is process-and-discard, with a short retention window for debugging that the user can set to zero.

## 6. Target architecture (v1)

```
                 ┌──────────────────────────────────────────────────────┐
  Developer ───► │ Cloudflare (edge)                                    │
  / Playground   │  • Pages: landing, docs, playground, dashboard       │
                 │  • Worker: API gateway                               │
                 │      - API key auth, per-key rate limits             │
                 │      - usage metering → Neon                         │
                 │      - request validation, routing                   │
                 │  • R2 (optional): opt-in audio retention             │
                 └───────────────┬──────────────────────────────────────┘
                                 │  HTTPS / WebSocket (mTLS or signed token)
                 ┌───────────────▼──────────────────────────────────────┐
                 │ Inference/API service (GPU host, we control)         │
                 │  Node.js / TypeScript (Fastify or Hono)              │
                 │   /v1/speech-to-text        (batch, file upload)     │
                 │   /v1/speech-to-text/ws     (streaming, Phase 5)     │
                 │   /v1/text-to-speech        (batch)                  │
                 │   /v1/models, /healthz, /metrics                     │
                 │  Model runtime (in-process):                         │
                 │   sherpa-onnx Node bindings / onnxruntime-node       │
                 │   ASR:  Kriti V1 → ONNX (primary candidate),         │
                 │         NepaliConformer streaming → ONNX             │
                 │   TTS:  Kala (VITS) → ONNX (primary), sanoTTS (CPU)  │
                 │  Fallback: Python model worker over localhost HTTP   │
                 │   for any model that will not export cleanly         │
                 │  Audio I/O: ffmpeg subprocess → 16 kHz mono PCM      │
                 └──────────────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────────────┐
                 │ ml/ (Python, offline tooling — never in request path)│
                 │  eval harness · ONNX export scripts · fine-tuning    │
                 └──────────────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────────────┐
                 │ Neon Postgres (Singapore)                            │
                 │  users, api_keys, usage_events, jobs, model_versions │
                 └──────────────────────────────────────────────────────┘
```

**GPU host for v1:** a rented GPU in Singapore or Mumbai from a provider where *we* deploy the container and the models (candidates to evaluate: RunPod, Modal, Lambda, Vast.ai, Hetzner GPU, or a plain cloud GPU VM). Criteria: region, $/hour for a 16–24 GB card, cold-start behaviour, WebSocket support, ability to run our own Docker image. Document the choice and the sovereignty implication in `docs/infrastructure.md`. A single modest GPU is enough for v1; Kriti is 119M params and Kala runs at 50× real time on CPU.

**Why not run models on Cloudflare?** Workers have no GPU; Workers AI only offers Whisper-class models, and Whisper large-v3 scores ~96–99% WER on Nepali (i.e. useless) — see dossier. Also, Workers AI *is* a third-party model service, which violates the hard rule.

## 7. Phased plan

Each phase ends with a demo the owner can run and a short write-up in `docs/journal/`. Do not start a phase before the previous one's "done" criteria are met. Estimates assume part-time work and the owner learning Python alongside (see roadmap).

### Phase 0 — Foundations (1–3 weeks)
- Repo scaffold, `uv`-managed Python project, pre-commit, Dockerfile, `Makefile`/`justfile`.
- Owner completes Python basics (roadmap Phase 0) — pair on small scripts: read a WAV, print its duration, resample it.
- `LICENSES.md` started. `docs/infrastructure.md` started.
- **Done when:** owner can clone, run `make dev`, and run a script that loads an audio file and prints sample rate/duration.

### Phase 1 — Evaluation harness, before any API (2–3 weeks)
This is the most important phase and the one every Nepali company skipped. Build the measuring stick first.
- Download eval sets: FLEURS Nepali (test split), NepTel (Ampixa, real call-centre audio), a slice of OpenSLR-54 **held out**, Common Voice Nepali if usable.
- Run candidate ASR models: Kriti V1, Kriti Telephony, NepaliConformer (offline + streaming), Qwen3-ASR-Nepali, MMS-1B (npi), AI4Bharat IndicConformer. Compute WER and CER with `jiwer`, with a documented Devanagari normaliser (danda handling, nukta, ZWJ/ZWNJ, Unicode NFC). Note the known Whisper float16 bug in prior Nepali evals.
- Run candidate TTS models: Kala, sanoTTS (Nepali voice), Matcha-TTS Nepali, F5-TTS OpenBible Nepali. Measure: real-time factor on CPU and GPU, ASR round-trip WER (synthesize → transcribe with best ASR → WER vs input text), and informal listening by the owner on 20 sentences from NepTTS-Bench.
- Output: `eval/REPORT.md` with a results table and a **model decision** for ASR and TTS primaries + fallbacks.
- **Done when:** the report exists, numbers are reproducible with one command, and the owner can explain what WER is and why NepTel is harder than FLEURS.

### Phase 2 — STT API, batch (3–4 weeks)
- **Export spike first (≤ 1 week, Python, in `ml/export/`):** export the chosen ASR primary to ONNX and load it from Node with sherpa-onnx's Node package (or `onnxruntime-node`). Verify transcripts match the Python reference on the 50-clip fixture set within noise. Journal the result. If export fails for the primary, try the fallback candidate; if all fail, stand up the Python model worker and keep the TS API in front of it. **This gate decides the serving architecture — do not skip it.**
- Node/TypeScript service (Fastify or Hono): `POST /v1/speech-to-text` accepting multipart audio (wav/mp3/m4a/ogg/webm), `language_code` (default `ne-NP`), `model`, optional `with_timestamps`. Transcode with ffmpeg to 16 kHz mono PCM.
- Load the ONNX model once at startup; serve via a worker queue (worker_threads or a small pool) so concurrent requests don't block the event loop.
- Response schema mirrors Sarvam's where reasonable: `{ transcript, language_code, model, duration_seconds, request_id, timestamps? }`.
- Dockerise; deploy to the chosen GPU host; `/healthz` and Prometheus `/metrics`.
- **Done when:** `curl` with a Nepali WAV returns a transcript from the deployed service in < 2× real time, and a regression test asserts WER on a 50-clip fixture set hasn't moved.

### Phase 3 — TTS API, batch (2–3 weeks)
- Export spike for Kala (VITS → ONNX; sherpa-onnx has a VITS TTS runtime) and check whether sanoTTS's numpy inference can be exported or ported. Same gate rules as Phase 2.
- `POST /v1/text-to-speech` with `text`, `speaker`, `speech_sample_rate` (8k/16k/22.05k/24k), `output_format` (wav/mp3). Devanagari text normalisation (numbers, dates, English words in Latin script) is a real sub-problem — start simple, log failures.
- Serve Kala (GPU or CPU) and sanoTTS (CPU) as separate `model` values.
- **Done when:** the owner can type a Nepali sentence in the terminal and hear it, and a fixture test checks round-trip WER.

### Phase 4 — Platform layer (3–4 weeks)
- Neon schema: `users`, `api_keys` (hashed), `usage_events` (per request: key, endpoint, model, audio seconds / characters, latency, status), `model_versions`.
- Cloudflare Worker gateway: validates `api-subscription-key` header (same header name as Sarvam for drop-in compatibility), enforces per-key quotas and rate limits, records usage, proxies to the inference host over a signed channel.
- Cloudflare Pages: signup/login, key management, usage dashboard, **playground** (record from mic → transcript; type → audio), docs site (OpenAPI-generated).
- Free tier with hard caps; no billing integration yet, just metering.
- **Done when:** a stranger can sign up, get a key, use the playground, call the API from Python/JS snippets in the docs, and see their usage.

### Phase 5 — Streaming STT (3–4 weeks)
- `WSS /v1/speech-to-text/ws`: 16 kHz PCM chunks in, partial + final transcripts out. Use NepaliConformer's cache-aware streaming model or Kriti with a chunked/VAD strategy — Phase 1 decides. Add VAD (e.g. Silero) for endpointing.
- Target: < 500 ms partial latency on the GPU host.
- **Done when:** the playground shows live words appearing while the owner speaks.

### Phase 6 — Data flywheel + first fine-tune (ongoing from here)
- Opt-in audio retention + a tiny correction UI (user fixes a transcript → stored as a labelled pair).
- Build a clean, consented dataset; forced-align with Ampixa's `nepali-mfa` tooling.
- First fine-tune of the ASR primary on domain data (e.g. the owner's product's audio). Re-run Phase 1 harness; only ship if WER improves on **all** eval sets, not just the in-domain one.
- **Done when:** a model trained on our data beats the open baseline on the harness.

### Phase 7 — On-prem package + Nepal hosting (when a bank/telco/gov conversation is real)
- Single `docker compose` / Helm deployment of the inference service + gateway + Postgres, air-gap capable, with a license-key check. This is what banks actually buy.
- Evaluate Nepal-based colocation / GPU hosting; move production or offer it as a tier.
- **Done when:** the full stack runs on a laptop with no internet, and the sovereignty claim in §5 can be upgraded truthfully.

### Phase 8+ — Only if there are users
Speaker diarization, translation (ne↔en), transliteration (Romanised Nepali ↔ Devanagari — high demand, Diyo reports 0.864 accuracy as a benchmark), voice agent SDK, Maithili/Bhojpuri/Newari.

## 8. Repository layout (proposed)

```
nepali-speech-platform/
├── 00-PROJECT-BRIEF.md            # this file
├── 01-RESEARCH-DOSSIER.md
├── 02-LEARNING-ROADMAP.md
├── CLAUDE.md                      # working agreement, see §9
├── LICENSES.md                    # every model/dataset/library + license + commercial-use verdict
├── docs/
│   ├── infrastructure.md
│   ├── api/                       # OpenAPI + guides
│   └── journal/                   # one short entry per phase/week: what we learned
├── api/                           # Node/TypeScript inference + API service (Fastify/Hono)
│   ├── src/ (routes/, models/, audio/, streaming/, metrics/)
│   ├── test/
│   ├── Dockerfile                 # CUDA base image, Node 22, ffmpeg, sherpa-onnx
│   └── package.json
├── ml/                            # Python, offline only — never in the request path
│   ├── eval/                      # Phase 1 harness: datasets/, normalise.py, run_asr.py, run_tts.py, REPORT.md
│   ├── export/                    # model → ONNX scripts + parity tests
│   ├── worker/                    # fallback Python model server (only if export fails)
│   ├── finetune/                  # Phase 6
│   └── pyproject.toml
├── gateway/                       # Cloudflare Worker (TS)
├── web/                           # Cloudflare Pages app: playground, dashboard, docs (TS)
├── db/                            # Neon migrations
├── packages/shared/               # shared TS types (API schemas), used by api/, gateway/, web/
└── deploy/                        # compose/, helm/, gpu-host/
```

## 9. Working agreement with Claude Code — this is a learning expedition

The owner is learning Python and speech ML *through* this project. Optimise for the owner understanding the system, not for you finishing fastest. Put the following into `CLAUDE.md`:

1. **Explain before you build.** For each new file or concept, give a 3–8 line plain-English explanation of what it does and why, *then* write it. Name the concept so the owner can look it up (e.g. "this is a *context manager*", "this is *CTC decoding*").
2. **Owner writes some code.** Each week, leave one or two small, well-scoped functions for the owner to write (with a docstring, a test, and a hint). Review their code kindly and specifically. Candidates: audio duration calculator, Devanagari normaliser rules, WER table formatter, API key hasher.
3. **No magic.** Prefer boring, readable code over clever code. Avoid heavy frameworks where a 30-line function will do. Type hints everywhere. Comments explain *why*, not *what*.
4. **Measure everything.** Nothing about model quality is asserted without a number from `eval/`. Latency and cost are logged from day one.
5. **Journal.** After each working session, append 5–10 lines to `docs/journal/YYYY-MM-DD.md`: what was built, what broke, one concept learned, next step.
6. **Verify before trusting.** Model formats, license terms, dataset splits and library APIs change. When the brief or dossier says "verify", actually check the source before relying on it.
7. **Sovereignty rule is absolute.** If a library, SDK or tool would send audio or text to an external AI API, stop and flag it. This includes "convenient" fallbacks.
8. **Phase gates are real.** Do not start Phase N+1 before Phase N's "done when" is demonstrably met and journaled.

## 10. Starting points — the first five tasks

1. Read all three documents. Produce a plan for **Phase 0 and Phase 1 only**, as a task list, with the owner's learning tasks interleaved. Ask any blocking questions.
2. Scaffold the repo per §8: pnpm workspace for `api/`, `gateway/`, `web/`, `packages/shared/`; `uv` project in `ml/`; a `Dockerfile` for `api/`; a `make dev` (or `just dev`) that runs a hello-world Fastify/Hono app with `/healthz` and a `uv run pytest` in `ml/`.
3. Write `ml/eval/download.py` that fetches FLEURS Nepali test and the NepTel dataset from Hugging Face into `ml/eval/datasets/`, and `ml/eval/normalise.py` with a documented Devanagari normaliser + tests. (Mirror the normaliser in `packages/shared/` later so API and eval agree.)
4. Get **one** model running end to end: load Kriti V1 (verify its format — it derives from AI4Bharat IndicConformer, likely NeMo `.nemo`; investigate ONNX export / `sherpa-onnx` as a serving path), transcribe 10 FLEURS clips, compute WER with `jiwer`. Journal what you learned about the model's input expectations.
5. Repeat step 4 for NepaliConformer and Qwen3-ASR-Nepali; produce the first `ml/eval/REPORT.md` table. Then stop and review with the owner.
6. (Early de-risk, can run in parallel with 4–5) Check whether sherpa-onnx's Node package installs and runs on the dev machine with one of its sample Nepali-agnostic models; note the version and any CUDA requirements in `docs/infrastructure.md`. This tells us early whether the TS serving path is viable.

## 11. Open questions (owner to answer as they come up)

- Product name: working name is **Boli** (बोली — "speech / spoken language"). Repo: `boli`. Package scope: `@boli/*`. Confirm domain and trademark availability before public launch; alternatives considered: *Kura* (कुरा), *Swar* (स्वर).
- Which GPU provider for v1, after a one-day cost/region comparison.
- Whether the owner's own product has audio we can use for the first eval set and later fine-tuning (and whether its users have consented).
- Legal entity and terms of service before public signup (Phase 4).
- Budget ceiling per month for GPU + Cloudflare + Neon.

## 12. Risks, stated plainly

| Risk | Likelihood | Mitigation |
|---|---|---|
| Open models aren't good enough for real use (24–34% WER is far from "perfect") | High | Phase 1 tells us the truth early; position v1 for use cases tolerant of errors (search, drafts, IVR keyword spotting); Phase 6 flywheel |
| License blocks commercial use of a chosen model/frontend | Medium | `LICENSES.md` gate before any model enters the stack; have a fallback per modality |
| A model will not export to ONNX cleanly, breaking the TS-only serving path | Medium–High | Phase 2/3 export spikes with parity tests; Python fallback worker behind the same TS API so the public contract never changes |
| Bhashini × KU ships a free Nepal platform first | Medium | Our differentiators are Nepal-controlled hosting, on-prem, and developer experience — not model quality |
| Owner burnout from learning + building simultaneously | Medium | Phase gates, journal, owner-written functions kept small; celebrate Phase 1 report as a real milestone |
| GPU cost with no revenue | Medium | Single small GPU, scale-to-zero where possible, sanoTTS CPU tier, hard free-tier caps |
| Sovereignty claim overstated in marketing | Low if §5 is followed | Copy reviewed against §5 before publishing |
