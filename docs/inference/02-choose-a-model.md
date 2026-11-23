# 02 - Choose a model

**Gets you:** a decision between candidate models made from your users' real messages, with settings and prompts
recorded so the comparison can be re-run.

**Measured on:** Apple M5, 16 GB, 2026-11-23/24. Candidates: Gemma 4 E4B (`ggml-org/gemma-4-E4B-it-GGUF:Q4_0`, 4.6 GB)
and Qwen 3.5 4B (`ggml-org/Qwen3.5-4B-GGUF:Q4_K_M`, 3.0 GB). Notes: `ml/llm/NOTES-gemma4-e4b.md`, `NOTES-qwen35-4b.md`.

## Steps

### 1. Shortlist

Filter by: licence you can serve commercially (both Apache 2.0), ready GGUF builds (ggml-org), size that fits the
target machine at 4-bit, and general quality. Do not pick from leaderboards: none test Romanized Nepali, and published
studies (arXiv 2604.14171, 2611.12628) show older small models failing at it without fine-tuning.

### 2. Build the test set

Small enough to read every answer. Split by **how people write** and by **task**:

- English (control), Romanized Nepali, code-mixed.
- Tasks: short reply, one-line summary, one-word label, "what does this mean".
- Spelling variants (cha / xa / chha, malai / mlai) and 10-15 real users' messages.
- A **baseline** you trust (the hosted model in use today), scored **blind** (A vs B, names hidden) by a native speaker.

### 3. Fix everything but the model

| Hold fixed | Why (seen in this test) |
|---|---|
| Interface: a script, not the chat page | The page's hidden prompt and tools changed language and topic |
| The product's system prompt | Without it Gemma drifted between English, Devanagari and Romanized |
| Sampling settings (state them) | Qwen looped at temperature 0.3; fine at its card's settings |
| Precision class (~4-bit for all) | Quantization changes quality by different amounts per model |
| Runs per prompt: at least 2 | Same prompt and settings gave different answers |

Recommended settings: read the model card. Qwen 3.5 (non-thinking, general): temperature 0.7, top_p 0.8, top_k 20,
presence_penalty 1.5. Gemma 4: its GGUF metadata records temperature 1.0, top_p 0.95, top_k 64 (see 05).

### 4. The system prompt used

```text
You are Boli, a helpful assistant for people in Nepal. Always reply in the same language AND script as the user's
latest message: English -> English; Romanized Nepali (Nepali in Latin letters) -> Romanized Nepali; a mix -> the same
mix in Latin letters. Never switch to Devanagari unless the user writes in Devanagari. Keep replies short: at most 80
words unless asked for more. If you are not sure a fact is true, say so instead of guessing.
```

The explicit mapping line is load-bearing: a shortened version without it made Gemma answer English in Devanagari.

### 5. Run the scripts (server up on :8080, one model at a time)

```bash
python3 ml/llm/probe_plain.py           # no system prompt, 7 prompts, timings
python3 ml/llm/probe_system_prompt.py   # system prompt, temperature 0.3, 4 prompts x 2 runs
```

Switch models by stopping the server (Ctrl+C) and starting it with the other `-hf` repo.

### 6. Read and name the failures

| Failure | Example seen | Usual fix |
|---|---|---|
| Language drift | Romanized question, English answer | System prompt |
| Script drift | Romanized question, Devanagari answer | System prompt; fine-tune if it persists |
| Hindi bleed | "kyunki aapke paas time hain" (Qwen) | Better base model or fine-tuning |
| Misreading | "malai" read as a person "Mali", Bengali reply (Qwen) | Better base model or fine-tuning |
| Invented facts | "Tiffin House", waterfalls at Gokarneshwar | "Say when unsure" in prompt; retrieval |
| Repetition loop | "pani pani pani..." at temp 0.3 (Qwen) | Model card sampling settings |
| Tool distraction | Told the user to write JavaScript (Qwen in chat page) | Do not offer unneeded tools |

## Result (2026-11-24)

| | Gemma 4 E4B | Qwen 3.5 4B |
|---|---|---|
| English | good | good |
| Understands Romanized | yes | often not |
| Writes Romanized (with prompt) | mostly; some Hindi words | mostly Hindi |
| Stays in user's script | 6/8 | ~3/8 |
| Label task | correct, 0.4 s | correct, 0.3 s |
| Decode speed (M5) | 28-35 t/s | 30-35 t/s |

**Chosen: Gemma 4 E4B.** Remaining gaps (Hindi words, grammar slips, the exam question answered in English) are the
brief for fine-tuning.

## Done when

- One model is chosen, and its file, flags, system prompt, sampling settings, scripts and failure notes are saved.
