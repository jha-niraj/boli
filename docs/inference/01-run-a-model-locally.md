# 01 - Run a model locally

**Gets you:** an open model answering on `http://localhost:8080`, with a chat page and an OpenAI-compatible API, and
the ability to read its speed and memory correctly.

**Measured on:** Apple M5 MacBook, 16 GB, macOS, 2026-11-23. llama.cpp via Homebrew (server build `b12359`).

## Prerequisites

- 16 GB of memory or more for a ~4-5 GB model (model + context memory + the rest of the system).
- ~6 GB free disk per model.
- macOS with Homebrew, or Linux (release binaries or Docker), or Windows (release binaries).

## Steps

### 1. Install llama.cpp

```bash
brew install llama.cpp
llama-server --version
```

Homebrew's build already uses the Apple GPU (Metal). On Linux use a release build or the Docker image
`ghcr.io/ggml-org/llama.cpp:server` (see 04).

**Verify:** `llama-server --version` prints a version/build line.

### 2. Download and serve a model (one command)

```bash
llama-server -hf ggml-org/gemma-4-E4B-it-GGUF:Q4_0 --no-mmproj -c 8192 --port 8080 --jinja --reasoning auto
```

| Part | Meaning |
|---|---|
| `-hf <repo>:<quant>` | Download a GGUF from Hugging Face. `ggml-org` is llama.cpp's own org. `:Q4_0` picks the 4-bit file (4.59 GB; the 16-bit file is 15.05 GB) |
| `--no-mmproj` | Skip the image add-on (~1 GB). Text only |
| `-c 8192` | Context size in tokens |
| `--port 8080` | Port. **Always pass it**: the default is 9931, not 8080 |
| `--jinja --reasoning auto` | Use the model's own chat template and let EACH REQUEST choose thinking: Boli sends `chat_template_kwargs: {"enable_thinking": false}` by default and `true` when Kura's Think toggle is on. `--reasoning off` would force it off for every request. |

The first run downloads the file (took ~8 minutes on home broadband). It is cached in the Hugging Face cache:
`~/.cache/huggingface/hub/models--ggml-org--gemma-4-E4B-it-GGUF/`. Later starts take seconds.

**Verify:** the log ends with `listening on http://127.0.0.1:8080`. Then:

```bash
curl -s http://127.0.0.1:8080/health          # {"status":"ok"}
curl -s http://127.0.0.1:8080/v1/models        # lists the model id
```

### 3. Call it like an API

```bash
curl -s http://localhost:8080/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in Romanized Nepali, one line."}]}' | python3 -m json.tool
```

Read in the response: `choices[0].message.content` (answer), `finish_reason` (`stop` = ended itself, `length` = hit
`max_tokens`), `usage.prompt_tokens` / `usage.completion_tokens` (what an API would bill), and llama.cpp's `timings`
(prefill and decode speed).

**Verify:** you get an answer and a `usage` block. Measured: 26 prompt tokens, 4 output tokens, ~0.3 s total.

### 4. Read the server log

| Log line | Meaning |
|---|---|
| `n_slots = 4, n_ctx_slot = 8192` | 4 conversations at once, 8,192 tokens of context each |
| `prompt eval time = ... tokens per second` | **Prefill** (reading the prompt). Measured 130-680 tokens/s |
| `eval time = ... tokens per second` | **Decode** (writing the answer). Measured 25-35 tokens/s |
| `n_gen = 100, tg = 31.65 t/s` | Progress while generating |
| `no API key is set and CORS allows all origins` | Anyone who can reach the port can use it. Fine on 127.0.0.1 only |

Time for an answer is roughly **output tokens / decode speed**. A slow answer is usually a long answer.

### 5. Measure memory correctly

`ps` and macOS `footprint` under-report: the model file is memory-mapped, and per-process tools mostly do not count
mapped file pages (measured: `ps` 1.8 GB, `footprint` 612 MB, for a 4.6 GB model). Budget instead:
**file size + KV cache (grows with `-c` and slots) + the rest of the machine**, and watch whole-machine memory
(Activity Monitor on macOS, `free -h` on Linux). To find which file a running server uses:

```bash
lsof -p $(pgrep -n llama-server) | grep gguf
```

## Traps already hit

- **Reasoning on by default.** With reasoning, a two-sentence answer generated 335 tokens (~285 of them hidden
  thinking) and took 10 s. With reasoning off: 47 tokens, 1.5 s. Boli starts the server with `--jinja --reasoning auto`
  and turns thinking off per request (`chat_template_kwargs.enable_thinking=false`) unless the user asks for it.
- **The built-in chat page is not your app.** It adds its own system prompt and tool list (an 18-token message arrived
  as 224 tokens) and changes answers. Test with scripts, not the page.
- **No length control.** Without a system prompt asking for brevity, answers ran to 400-560 tokens (12-22 s). Use a
  system prompt and `max_tokens`.
- **Port default is 9931.** Always pass `--port`.
- **`LLAMA_API_KEY` in your shell.** llama-server reads it from the environment; if it is exported, every local server
  demands a key. Pass it per command (see 03).

## Done when

- `/health` returns ok, `/v1/chat/completions` answers, and you can state the prefill and decode speeds from the log.
