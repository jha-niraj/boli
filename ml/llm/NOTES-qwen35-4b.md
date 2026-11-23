# Qwen 3.5 4B (Q4_K_M) first probe - 2026-11-23

`llama-server -hf ggml-org/Qwen3.5-4B-GGUF:Q4_K_M --no-mmproj -c 8192 --port 8080 --reasoning off` (3.0 GB file)

| Setting | Result |
|---|---|
| No system prompt (`probe_plain.py`) | English good (2.0 s). Romanized answered in Hindi ("Chalo thoda sa exam ke baad..."), Devanagari essays, one reply in **Bengali** that misread "malai" as a person "Mali". Classification correct (0.3 s); summary garbled. |
| System prompt, temp 0.3 (`probe_system_prompt.py`) | Repetition loops on 4 of 8 runs ("pani pani pani...", "Koshish garu" x 25, a looping place list). |
| System prompt, Qwen's recommended non-thinking settings (temp 0.7, top_p 0.8, top_k 20, presence_penalty 1.5) | Loops gone, but replies are Hindi in Latin letters ("karo, kyunki aapke paas time hain"), Devanagari switches, invented places ("Tiffin House", waterfalls at Gokarneshwar). |
| Web UI (adds ~450 hidden tokens incl. tool definitions) | Answered "mero exam sakiyo" in Hindi by asking the user to write a JavaScript function - distracted by the `run_javascript` tool. |

Speed: 30-35 t/s output, prompt 190-280 t/s - same class as Gemma 4 E4B.

## Gemma 4 E4B vs Qwen 3.5 4B (same Mac, same prompts)

| | Gemma 4 E4B | Qwen 3.5 4B |
|---|---|---|
| English | good | good |
| Understands Romanized Nepali | yes | often no (Hindi / Bengali / wrong topic) |
| Writes Romanized Nepali (with system prompt) | mostly, with Hindi words and small grammar slips | mostly Hindi in Latin letters |
| Stays in the user's script with a system prompt | 6 of 8 | about 3 of 8 |
| Made-up facts | rare with system prompt | frequent |
| Short tasks (classify) | correct, 0.4 s | correct, 0.3 s |
| Speed | 28-35 t/s | 30-35 t/s |
| File size | 4.6 GB | 3.0 GB |

Decision for the next stage: **Gemma 4 E4B** is the base model.
