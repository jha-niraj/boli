# Initial prompt for Claude Code

Copy everything below the line into Claude Code as your first message, from inside an empty folder named `boli` that already contains `00-PROJECT-BRIEF.md`, `01-RESEARCH-DOSSIER.md` and `02-LEARNING-ROADMAP.md`.

---

We are starting a new project called **Boli** (बोली) — a self-hosted, Sarvam-style Nepali speech platform: speech-to-text and text-to-speech behind our own API, API keys, playground and docs, running open Nepali models on infrastructure we control, with a hard rule that no audio or text ever goes to a third-party AI service.

This folder contains three documents that are the source of truth. Read all three completely before doing anything else, in this order:

1. `00-PROJECT-BRIEF.md` — scope, constraints, architecture, phases with "done when" gates, repo layout, working agreement, first tasks.
2. `01-RESEARCH-DOSSIER.md` — the landscape, every candidate model and dataset, links, and known gotchas.
3. `02-LEARNING-ROADMAP.md` — what I am learning at each phase and the functions I write myself.

Decisions that are fixed (they are in the brief, repeating them so nothing drifts):

- The API/inference service, Cloudflare gateway, playground and shared types are **Node.js + TypeScript** (pnpm workspace). Python lives only in `ml/` for the eval harness, ONNX export and fine-tuning, plus a fallback model worker if a model cannot be exported. Nothing Python sits in the request path unless the export gate in Phase 2 fails.
- Models are served from Node via ONNX (sherpa-onnx Node bindings or onnxruntime-node). Whether this works per model is proven by an export spike with parity tests, not assumed.
- Edge is Cloudflare (Singapore/Mumbai), database is Neon Postgres (Singapore). GPU host is to be chosen; propose a short comparison when we get to Phase 2.
- Absolutely no calls to Sarvam, Google, Azure, OpenAI, ElevenLabs, Deepgram, AssemblyAI, Cloudflare Workers AI or any other external AI API, anywhere, ever — including "temporary" fallbacks. If a library would do this, stop and tell me.
- Every model, dataset and frontend gets a row in `LICENSES.md` with its license and a commercial-use verdict before it is used.
- Whisper is not a baseline for Nepali (see dossier §G). Do not propose it.

About me and how we work (brief §9, roadmap): I can code, but Python is new to me and I have never trained or served a model. This project is also how I learn speech ML. So: explain each new concept in a few plain lines and name it before writing code; keep code boring and readable with type hints; leave me one or two small functions per week to write myself (the roadmap lists them) and review what I write; never claim a model is good without a number from the eval harness; and after every session append a short entry to `docs/journal/YYYY-MM-DD.md`. We do not start a phase until the previous one's "done when" criteria are met.

What I want from you right now, in this order:

1. Confirm you have read all three files by listing, in your own words, the five biggest risks you see in this plan and anything in the documents that is contradictory, outdated or that you cannot verify.
2. Ask me every blocking question you have. The brief §11 lists some open ones; ask about those plus anything else. Do not guess at answers.
3. Then produce a task plan for **Phase 0 and Phase 1 only**, as a checklist, with my learning tasks from the roadmap interleaved at the right points. Keep Phase 1 centred on the evaluation harness — measuring Kriti V1, NepaliConformer, Qwen3-ASR-Nepali and the TTS candidates on NepTel and FLEURS test with one shared Devanagari normaliser — because nobody in Nepal has published that comparison and it decides which models we serve.
4. Wait for me to approve the plan. Only then start on task 1 of Phase 0: scaffold the repo per brief §8 (`api/`, `ml/`, `gateway/`, `web/`, `packages/shared/`, `db/`, `deploy/`, `docs/`), create `CLAUDE.md` from brief §9, create an empty `LICENSES.md` with the column headings, and a `make dev` (or `just dev`) that runs a hello-world Fastify or Hono server with `/healthz` plus `uv run pytest` in `ml/`.

Keep answers compact. When something in the docs says "verify", actually verify it against the source before relying on it, and tell me what you found.
