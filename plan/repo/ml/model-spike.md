# Model spike - which open Nepali STT / TTS model to run, and a free deploy

| | |
|---|---|
| **App / module** | `repo/ml` (`ml/`, outside the pnpm workspace) |
| **Status** | In progress |
| **Opened** | 2026-11-23 |
| **Last updated** | 2026-11-23 |
| **Files** | `ml/spike/` (scripts), `ml/models/` (downloads, git-ignored), `ml/spike/RESULTS.md`, one reading artifact per step |

## What was asked

"Let's do the model testing alongside" the Python reading. Find which model is best to download, run a smaller free
one too, learn how inference works, deploy it and see how much it can do, then focus on STT and TTS. The owner is
reading only; Claude runs everything and explains each step.

## What "done" looks like

- One results table in `ml/spike/RESULTS.md`: model, task, licence, size on disk, load time, RTF on this Mac
  (Apple M5, 10 cores, 16 GB), peak memory, and a small-sample WER (STT) or a listen note (TTS). Every number has the
  command that produced it.
- The owner has heard TTS output and seen STT transcripts next to the references.
- The winner runs in a free Hugging Face Space behind a small HTTP API, with cold-start and warm latency measured
  from this Mac.
- A reading artifact for each step that the owner has read.

## Open questions

- Hosting a model under GPL-3.0 (sanoTTS) or CC-BY-SA-4.0 (Kala) in a paid API needs a human legal read. Working
  assumption: fine for this spike, flagged in LICENSES.md before any product use.
- Free HF Space limits (CPU, RAM, sleep) to be confirmed on the HF pricing page when we deploy.

---

## Tasks

- [x] **0. Toolchain and hardware**
  - Acceptance: uv, ffmpeg and Python 3.12 present; hardware recorded.
  - Verified: `uv --version` -> 0.13.1; `ffmpeg -version` -> 9.0.2; `uv run python -V` -> 3.12.15; sysctl -> Apple M5,
    10 cores (4 performance), 16 GB; `df` -> 535 GiB free.

- [x] **1. Candidates still exist (metadata only, no download)**
  - Acceptance: licence, size, format and last update for each candidate from the HF API.
  - Verified: `scratchpad/hfmeta.py` against huggingface.co/api/models printed:
    - harrrshall/kriti - MIT, 0.50 GB, one `kriti.nemo` (498 MB), updated 2026-08-18
    - ampixa/nepali-conformer-offline and -streaming - HTTP 401 (no longer public)
    - ampixa/sanoTTS - GPL-3.0, 0.30 GB total, voices are ~7-9 MB GGUF files, updated 2026-11-17
    - ampixa/kalaTTS - CC-BY-SA-4.0, 0.83 GB, includes a ready ONNX `real_nepali_v04.sid_prosody.fp32.onnx` (78 MB)
    - sandipghimire/matcha-tts-nepali - CC-BY-4.0, 251 MB PyTorch checkpoint (+ a 5 GB audio tarball we skip)
    - sidskarki/Qwen3-ASR-Nepali - licence "other", 4.08 GB safetensors
    - rhasspy/piper-voices - `ne/ne_NP/chitwan` and `ne/ne_NP/google` exist

- [ ] **2. Smallest TTS first: Kala ONNX (and sanoTTS)**
  - Acceptance: a Nepali sentence -> `.wav` the owner plays; load time and RTF recorded.
  - Verified:

- [ ] **3. Kriti V1 STT: NeMo -> ONNX -> sherpa-onnx**
  - Acceptance: transcripts for ~20 FLEURS ne_np test clips + NepTel clips next to references; WER, RTF, peak memory.
  - Verified:

- [ ] **4. Comparisons: Piper ne_NP via sherpa-onnx, Matcha-Nepali, Qwen3-ASR-Nepali (reference only)**
  - Acceptance: same table columns filled; Qwen marked "not servable on CPU" if RTF > 1.
  - Verified:

- [ ] **5. Free deploy of the winner on a Hugging Face Space**
  - Acceptance: public endpoint for STT (and TTS); cold start, warm latency and 3 concurrent requests measured from this Mac.
  - Verified:

- [ ] **6. Reading artifact per step**
  - Acceptance: published links listed here and in LEARNING.md.
  - Verified:

---

## Verification pass

- [ ] `ml/spike/RESULTS.md` numbers re-run once from a clean shell -> _paste_
- [ ] Nothing under `ml/models/` is tracked by git -> `git status --short ml/` -> _paste_
- [ ] Anything the owner must run (HF login, Space creation) -> _named, not run_

## Notes / decisions

- 2026-11-23: NepaliConformer (Ampixa) dropped from the comparison: both repos return 401. Kriti is the only open
  Nepali STT candidate that is MIT and downloadable today.
- 2026-11-23: Kala now ships an ONNX file, so the first inference lesson can be plain onnxruntime with no training code.
- Whisper stays out (dossier section G: ~96-106% WER on Nepali).
