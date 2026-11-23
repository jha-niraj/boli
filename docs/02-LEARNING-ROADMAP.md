# Learning Roadmap — Python → Speech ML → Serving, learned by building

For the owner, and for Claude Code to pace the project against. Starting point: can code (web/backend in another language), Python is new. Goal: by the end of Phase 6 you can read a model card, run an eval, serve a model, debug latency, and fine-tune an ASR model on your own data — and explain each of those to a bank's CTO.

Each phase below lists: what you'll learn, the one or two functions **you** write (Claude Code reviews), resources, and a "you know it when" check. Resources are deliberately few; depth beats breadth.

---

## Phase 0 — Python, properly but fast (2–3 weeks, alongside repo setup)

You already think in code, so this is translation, not learning to program. Python is **not** the API language (that's TypeScript) but it is unavoidable for the eval harness, ONNX export and fine-tuning — the parts where the real speech learning happens — so you still need it, just at "read and modify scripts confidently" level rather than "build services" level.

**Learn**
- Syntax and idioms: `def`, type hints, f-strings, list/dict comprehensions, `with` (context managers), exceptions, `pathlib`, `dataclasses`.
- Environments: what `uv` does, why `pyproject.toml`, how `import` finds things.
- Testing with `pytest`. Writing a test *before* a function.
- Reading a stack trace calmly.

**You write**
- `audio_info(path) -> AudioInfo` — opens a WAV with `soundfile`, returns sample rate, channels, duration. Test it on 3 files.
- `resample_to_16k_mono(path_in, path_out)` using `librosa` or `torchaudio`. Test that output duration matches input.

**Resources**
- Official tutorial, chapters 1–9: https://docs.python.org/3/tutorial/
- *Automate the Boring Stuff with Python* (free online) for feel: https://automatetheboringstuff.com/
- `uv` docs: https://docs.astral.sh/uv/
- pytest getting started: https://docs.pytest.org/en/stable/getting-started.html

**You know it when** you can write a 40-line script with a function, a dataclass, a test, and run it with `uv run pytest` without asking what any line does.

---

## Phase 1 — Audio and ASR fundamentals, via the eval harness (2–3 weeks)

**Learn**
- *Digital audio*: sampling rate, bit depth, mono vs stereo, PCM vs compressed, why ASR wants 16 kHz mono. Spectrograms and mel filterbanks — what the model actually "sees".
- *Metrics*: Word Error Rate (substitutions + deletions + insertions over reference words), Character Error Rate, why CER matters more for Devanagari, why normalisation changes the number.
- *How modern ASR works*, at the level of being able to draw it: encoder (Conformer = convolution + self-attention) turns audio frames into features; a decoder emits text. Three decoder families you'll meet: **CTC** (Whisper-small fine-tunes, wav2vec2, MMS), **RNN-Transducer** (Kriti, IndicConformer — good for streaming), **attention encoder-decoder** (Whisper). Know *why* Whisper fails on Nepali (tokenizer + training-data coverage), not just that it does.
- *Model cards and licenses*: reading them critically — what data was it trained on, is the eval set contaminated, can we use it commercially.
- *Hugging Face Hub* basics: `huggingface_hub` downloads, `datasets` library, Spaces.

**You write**
- `normalise_devanagari(text) -> str` — the project's canonical normaliser (NFC, danda handling, ZWJ/ZWNJ removal, whitespace, punctuation policy). This is a real, load-bearing function; write it with a table of before/after test cases.
- `wer_table(results) -> str` — formats per-model WER/CER into the Markdown table that goes into `eval/REPORT.md`.

**Resources**
- Hugging Face Audio Course, units 1–5 (the single best fit for this project): https://huggingface.co/learn/audio-course
- *Sequence Modeling with CTC* (Distill) — the clearest CTC explanation that exists: https://distill.pub/2017/ctc/
- Jurafsky & Martin, *Speech and Language Processing*, chapter on ASR & TTS (free draft): https://web.stanford.edu/~jurafsky/slp3/
- `jiwer` docs for WER/CER: https://github.com/jitsi/jiwer
- Ampixa's NepTel dataset card and NepaliConformer README — read how they evaluate: https://huggingface.co/datasets/ampixa/neptel · https://github.com/Ampixa/nepaliconformer
- Nepali ASR survey (skim the methods section): https://arxiv.org/pdf/2402.03050

**You know it when** you can explain to a friend, with a sketch, why a streaming model needs a transducer rather than an attention decoder, and why Kriti's 24% on its dev set becomes 32% on NepTel.

---

## Phase 2–3 — Serving a model as an API (4–7 weeks)

The API service is **Node/TypeScript** (owner's decision). Python stays for export and eval only.

**Learn**
- Node for inference: Fastify or Hono routing, Zod schemas, multipart uploads, streams and backpressure, `worker_threads` so model inference never blocks the event loop, graceful shutdown.
- **ONNX and model export**: what a computation graph is, why ONNX is the bridge from PyTorch/NeMo to Node, what `onnxruntime` is, dynamic axes, parity testing (same input → same output across runtimes). `sherpa-onnx` as a ready-made runtime for transducer ASR and VITS TTS with Node bindings.
- Model loading and lifetimes: load once at startup, keep on GPU, warm up. Why the first request is slow.
- GPU basics: what CUDA is, `nvidia-smi`, VRAM vs RAM, batch size vs latency, fp16/bf16. Why a 119M model fits anywhere and a 1.7B model doesn't.
- Export/serving formats: PyTorch checkpoint vs `.nemo` vs ONNX; why RNNT models have separate encoder/decoder/joiner ONNX files; what breaks on export (custom ops, dynamic shapes).
- Audio transcoding with `ffmpeg` in a subprocess from Node; handling webm/opus from browsers.
- Docker: images vs containers, layers, why model weights should not be baked into the image, GPU passthrough (`--gpus all`).
- TTS-specific: text normalisation (numbers → words in Nepali, dates, English loanwords), grapheme-to-phoneme (G2P), acoustic model vs vocoder, VITS as an end-to-end model, real-time factor.
- Observability: structured logs, request IDs, Prometheus counters/histograms.

**You write**
- `transcodeToPcm16k(input: Buffer): Promise<Int16Array>` in TS (ffmpeg wrapper with tests on 3 formats).
- `nepaliNumberToWords(n: number): string` in TS for TTS normalisation (१२३ → "एक सय तेइस"); start with 0–9999.
- `export_check.py` (Python): loads the PyTorch model and the ONNX model, runs both on 10 clips, asserts the transcripts match.

**Resources**
- Fastify docs: https://fastify.dev/docs/latest/ · Hono docs: https://hono.dev/docs/
- Node `worker_threads`: https://nodejs.org/api/worker_threads.html
- ONNX Runtime Node: https://onnxruntime.ai/docs/get-started/with-javascript/node.html
- sherpa-onnx (transducer ASR + VITS TTS runtime; Node.js API and streaming): https://github.com/k2-fsa/sherpa-onnx · docs: https://k2-fsa.github.io/sherpa/onnx/
- NVIDIA NeMo docs (ASR section, incl. export) — Kriti's parent framework: https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/intro.html
- Docker getting started: https://docs.docker.com/get-started/
- VITS paper for TTS intuition (read abstract + figures): https://arxiv.org/abs/2106.06103
- Kala training recipe (how a Nepali VITS is built end to end): https://github.com/Ampixa/nepal-tts-training

**You know it when** you can deploy a new model version to the GPU host, watch `/metrics`, tell from the numbers whether the bottleneck is transcoding, the model, or the network — and explain why the model had to be exported to ONNX before Node could run it.

---

## Phase 4 — Platform engineering (3–4 weeks)

**Learn**
- Postgres schema design for metering: append-only `usage_events`, indexes, aggregation queries; Neon branching for dev.
- Auth for APIs: why keys are stored hashed, key prefixes for display, rotation.
- Cloudflare Workers: the request lifecycle, KV/Durable Objects for rate limiting, secrets, how a Worker proxies to an origin, WebSocket passthrough.
- Rate limiting algorithms (token bucket) and quotas.
- OpenAPI → generated docs and client snippets.
- Browser audio: `MediaRecorder`, `AudioWorklet`, getting PCM out of a browser for the playground.

**You write**
- `hash_api_key(raw) -> str` and `verify_api_key(raw, stored) -> bool` with tests (and you'll learn why it's not `md5`).
- The SQL for "usage per key per day for the last 30 days".

**Resources**
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Neon docs: https://neon.com/docs
- Postgres tutorial (skim): https://www.postgresql.org/docs/current/tutorial.html
- MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

**You know it when** you can trace one request from a stranger's browser through the Worker, into Neon as a usage row, to the GPU host and back, and explain each hop.

---

## Phase 5 — Streaming (3–4 weeks)

**Learn**
- WebSockets end to end: framing, backpressure, keep-alives, reconnection.
- Voice Activity Detection (Silero VAD) and endpointing; partial vs final hypotheses.
- Cache-aware streaming Conformers (why NepaliConformer has a separate streaming checkpoint); chunk size vs latency vs accuracy.
- Measuring latency properly: time-to-first-partial, finalisation delay, percentiles.

**You write**
- `chunk_pcm(stream, ms=320)` generator with tests.

**Resources**
- Silero VAD: https://github.com/snakers4/silero-vad
- NeMo streaming ASR notes: https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/intro.html (streaming/ buffered inference sections)
- sherpa-onnx streaming examples (same repo as above).

**You know it when** you can state the p50 and p95 time-to-first-partial of your API and explain which knob you'd turn to improve each.

---

## Phase 6 — Data and fine-tuning (ongoing)

**Learn**
- Dataset construction: consent, manifests (JSONL of `{audio_path, text, duration}`), speaker/dialect metadata, train/dev/test splits that don't leak.
- Forced alignment (what MFA does) and why Ampixa built `nepali-mfa`.
- Fine-tuning an RNNT/CTC model: learning rates, freezing the encoder, catastrophic forgetting (why we re-run *all* eval sets), checkpoint selection on dev not test.
- Language-model fusion / shallow fusion for domain vocabulary (bank product names, place names).
- Experiment tracking (Weights & Biases or a plain CSV + git tag — start plain).
- Compute budgeting: estimating GPU-hours before you start.

**You write**
- `build_manifest(dir) -> Path` with validation (missing files, empty text, duration outliers).

**Resources**
- HF Audio Course unit 5 (fine-tuning ASR): https://huggingface.co/learn/audio-course/chapter5/introduction
- NeMo ASR fine-tuning tutorials (in the NeMo repo `tutorials/asr/`): https://github.com/NVIDIA/NeMo
- Montreal Forced Aligner: https://montreal-forced-aligner.readthedocs.io/
- Ampixa `nepali-mfa`: https://github.com/Ampixa/nepali-mfa
- Kriti reproducibility repo (how a serious lab documents a training run): https://github.com/Naamche-Labs/kriti-reproducibility

**You know it when** your fine-tuned model beats the open baseline on NepTel *and* FLEURS, and you can say how many hours of what kind of audio got you there.

---

## Phase 7 — Deployment for enterprises (when needed)

**Learn** `docker compose` → Helm basics, air-gapped installs, license-key checks, backups, log shipping, what a bank's infosec questionnaire asks (encryption at rest/in transit, data retention, audit logs, RBAC).

**Resources** Kubernetes basics: https://kubernetes.io/docs/tutorials/ · Helm: https://helm.sh/docs/

---

## Habits that make this work

1. **Journal every session** (`docs/journal/`). Five lines. The journal is the proof of learning and the thing you'll reread when something breaks in six months.
2. **One concept per week, named.** Ask Claude Code to name the concept ("this is *shallow fusion*") so you can search for it.
3. **Numbers over adjectives.** Never say "the model is good". Say "32.4% WER on NepTel, 11.8% on FLEURS test, p95 latency 1.3 s".
4. **Read one model card or paper abstract a week** from the dossier. Thirty minutes.
5. **Ship the phase demo, then rest.** Phase 1's report is a real achievement — nobody in Nepal has published an independent comparison of these models.

## Suggested weekly rhythm (part-time)
- 2 sessions building with Claude Code (2–3 h each)
- 1 session solo: your assigned function + its test (1–2 h)
- 1 short reading block (30 min) + journal (10 min)
