# Gemma 4 E4B (Q4_0) first probe - 2026-11-23

Mac: Apple M5, 16 GB. `llama-server -hf ggml-org/gemma-4-E4B-it-GGUF:Q4_0 --no-mmproj -c 8192 --port 8080 [--reasoning off]`
Scripts: `probe_plain.py` (no system prompt), `probe_system_prompt.py` (system prompt, temperature 0.3, each prompt twice).

| Setting | Short task time | Long answer time | Output speed | Notes |
|---|---|---|---|---|
| Reasoning on (owner, web UI) | 10 s (API key) | 21-29 s | 27-32 t/s | 35-50% of tokens were hidden thinking; web UI adds ~200 tokens of system prompt + tools |
| Reasoning off, no system prompt (curl) | 0.4-1.5 s | 12 s (hit 400-token cap) | 33-35 t/s | rambles; script drifts (English, Devanagari); hallucinated places |
| Reasoning off, no system prompt (web UI) | 2.4 s | 20-22 s | 22-25 t/s | read "exam sakiyo" as an upcoming exam; meeting reply wrapped in Devanagari |
| Reasoning off + system prompt, temp 0.3 (curl) | 1.2-2.8 s | - | 28-34 t/s | stays in Romanized (6 of 8), no Devanagari, short, facts mostly right |

Small tasks: summary of a mixed paragraph in 1.4 s (Romanized, one Hindi word "aur"); classification "Complaint" in 0.4 s (correct).
Errors to fix by fine-tuning: Hindi words in Romanized replies (thoda, aur, jauna), odd grammar ("bhanda" for "bhane"),
"exam sakiyo" answered in English twice even with the rule. Memory: ~5-6 GB real (model file mmapped; `ps` and
`footprint` under-report).
