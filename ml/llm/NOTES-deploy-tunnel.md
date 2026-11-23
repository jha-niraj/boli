# Deploy attempt 1: Hugging Face Space (blocked) and Cloudflare quick tunnel (works) - 2026-11-24

## Hugging Face Space
`hf repos create nirajjha31/boli-chat --type space --sdk docker --flavor cpu-basic` -> **402 Payment Required**:
"hosting Gradio and Docker Spaces on free cpu-basic requires a PRO subscription" ($9/month). Files kept in
`deploy/hf-space/` (Dockerfile on `ghcr.io/ggml-org/llama.cpp:server`, README front matter `sdk: docker`, `app_port: 8080`).

## Cloudflare quick tunnel from the Mac
- Server: `LLAMA_API_KEY="$(cat ~/.config/boli/api_key)" llama-server -hf ggml-org/gemma-4-E4B-it-GGUF:Q4_0 --no-mmproj -c 8192 --port 8080 --reasoning off` (still on 127.0.0.1)
- Tunnel: `cloudflared tunnel --url http://localhost:8080` (cloudflared 2026.11.0) -> random `*.trycloudflare.com` URL
- Probe: `python3 ml/llm/probe_remote.py <url>` (key from `~/.config/boli/api_key`, never printed)

| Check | Result |
|---|---|
| `/health` | `{"status":"ok"}` (no key needed) |
| No key | HTTP 401 in 0.3-0.4 s |
| English, 44 tokens | 1.7-2.1 s through the tunnel (1.5 s locally) |
| Label, 2 tokens | 0.5 s (0.4 s locally): tunnel adds about 0.1-0.3 s here |
| 3 requests at once | all done in 3.3-4.0 s; per-stream speed 29-30 t/s in one run, 19-21 t/s in another; total output 43-55 t/s vs ~30 for one stream |
| Same prompt twice | second call prefilled only 5 tokens: the server reused the cached prefix (KV cache) |

## Lesson found by accident
A shortened system prompt ("same language and script", without the explicit English->English, Romanized->Romanized
mapping) made Gemma answer **English and Romanized questions in Devanagari**. Restoring the full prompt fixed it.
The explicit mapping is load-bearing. The exam question still gets an English reply (known failure).
