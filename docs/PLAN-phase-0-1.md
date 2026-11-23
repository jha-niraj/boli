# Boli - Phase 0 + Phase 1 plan

Approved 2026-10-19. Source of truth for scope remains `00-PROJECT-BRIEF.md`; this file records the plan and the decisions taken before starting.

## Decisions (2026-10-19)

| Topic | Decision |
|---|---|
| Repo shape | Merge into the existing Turborepo: `apps/api` (Hono), `apps/gateway` (Cloudflare Worker), `packages/shared`; `packages/db` (Drizzle) is the Neon schema; `apps/main` becomes the Phase 4 platform site; `apps/admin` stays; `ml/` lives outside the pnpm workspace |
| Package scope | Rename `@repo/*` to `@boli/*` now |
| CLAUDE.md | Merge: brief §9 working agreement + hard rules on top, starter conventions below |
| Toolchain | `uv`, `ffmpeg`, `just`; Node 22 LTS (`.nvmrc`); Python 3.12 for `ml/`; Hono for the API |
| Eval compute | Mac CPU first. Budget is **$0** for Phases 0-1, so no rented GPU: Qwen3-ASR-Nepali (2B) runs on CPU if feasible, otherwise deferred to Phase 2 |
| Reference-only ASR models | NepaliConformer, Kriti Telephony, Qwen3-ASR-Nepali, MMS-1B (npi): evaluated, marked "not servable" |
| Own eval set | Owner records ~1 hour of code-mixed Nepali in parts, from scripts in `docs/recording/`, under a consent form |
| Common Voice | Owner creates a Mozilla Data Collective account; we load Common Voice Nepali from the download |
| Training lineage | Models trained on Google/Gemini output are allowed; lineage noted in `LICENSES.md` |
| Local Whisper | Allowed only as an offline tool inside `ml/eval` (neptts-eval); never a baseline, never in the request path |
| Third-party API benchmarking (dossier §E) | Not done |
| Order | Learning first: Python basics session (`audio_info`) before the scaffold |

## Phase 0 - Foundations

- [ ] 0.1 Toolchain: uv, ffmpeg, just; `.nvmrc` (Node 22); `ml/.python-version` (3.12)
- [ ] 0.2 🎓 Owner: Python tutorial ch. 1-9, uv docs, pytest getting-started
- [ ] 0.3 🎓 Owner writes `audio_info(path)` (stub + test + hint provided)
- [ ] 0.4 🎓 Owner writes `resample_to_16k_mono(path_in, path_out)`
- [ ] 0.5 Scaffold: `apps/api` (Hono, `/healthz`, vitest), `packages/shared` (zod stubs), `apps/gateway` stub, `deploy/`, `docs/{infrastructure.md,api/,journal/}`, api Dockerfile (node:22-slim + ffmpeg), pre-commit (ruff, prettier), `just dev`; rename scope to `@boli/*`
- [ ] 0.6 Merge CLAUDE.md; create `LICENSES.md` pre-filled with the 2026-10-19 verification, every verdict "pending human legal read"
- [ ] 0.7 `docs/infrastructure.md` + sherpa-onnx-node spike on the Mac (Piper ne_NP x_low TTS + a sample transducer ASR): version, CPU-only, speed
- [ ] 0.8 **Gate:** clone, `just dev`, `/healthz` 200, `uv run pytest` green, a script prints sample rate/duration. Journal.

## Phase 1 - Evaluation harness

- [ ] 1.1 🎓 HF Audio Course units 1-2 (sampling, mel spectrograms)
- [ ] 1.2 `LICENSES.md` rows, then `ml/eval/download.py`: FLEURS `ne_np` test (726), NepTel (honour exclusion field), Common Voice Nepali (manual MDC download), Ampixa's published NepTel system outputs. Pinned revisions, 16 kHz JSONL manifests
- [ ] 1.3 Owner records the own eval set in parts (`docs/recording/`), we transcribe and add it as a manifest
- [ ] 1.4 `ml/eval/CONTAMINATION.md`: model × dataset training-data matrix
- [ ] 1.5 🎓 Owner writes `normalise_devanagari` against a spec + before/after test table
- [ ] 1.6 Scorer: jiwer WER/CER + 95% bootstrap CI; validated by reproducing Ampixa's NepTel numbers from their outputs
- [ ] 1.7 Runners in `ml/eval/runners/<family>/`, one uv env each, cached hypothesis JSONL
- [ ] 1.8 Kriti V1 (+ danda head): 10 clips, then all sets; CPU real-time factor. 🎓 RNN-T, BPE, decoding; Distill CTC article
- [ ] 1.9 AI4Bharat IndicConformer-ne, CTC vs RNN-T branch
- [ ] 1.10 Reference-only models (Qwen on CPU if feasible)
- [ ] 1.11 🎓 Owner writes `wer_table(results)`
- [ ] 1.12 Stop and review together
- [ ] 1.13 TTS: Matcha-Nepali, Kala v0.2/v0.4, Piper ne_NP x_low, sanoTTS, F5 (reference). CPU RTF, round-trip WER (corrected for ASR error), blind listening on 20 NepTTS-Bench sentences, NepaliMOS as secondary
- [ ] 1.14 `just eval` reproduces every number
- [ ] 1.15 `ml/eval/REPORT.md`: CIs, contamination flags, license column, ASR + TTS primary/fallback decision
- [ ] 1.16 🎓 **Gate:** owner explains WER and why NepTel is harder. Journal.
