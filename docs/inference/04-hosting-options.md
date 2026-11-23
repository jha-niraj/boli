# 04 - Hosting options

**Gets you:** a choice of where the model runs when it should not depend on a laptop, plus a ready Docker setup that
runs on any container host.

**Checked on:** 2026-11-24, from the providers' own pages, changelogs and CLI. **Re-check before using**: free tiers
and prices change (one of these changed between planning and running the command).

## Options for a ~4-5 GB model (needs ~6 GB of memory)

| Option | Cost (2026-11-24) | Hardware | Catch |
|---|---|---|---|
| Own machine + tunnel (03) | free | the machine you have | only while it is on; quick tunnel address changes |
| Hugging Face Space, Docker SDK | needs **PRO, $9/month** | cpu-basic: 2 vCPU, 16 GB | refused with **402** without PRO ("hosting Gradio and Docker Spaces on free cpu-basic requires a PRO subscription"); CPU only |
| Cloudflare Containers | paid Workers plan + usage | up to 4 vCPU, 12 GiB, 20 GB disk (custom types) | no GPU; good when the app is already on Cloudflare |
| Modal (serverless GPU) | Starter: $0 base, $30/month compute credit; T4 ~$0.59/h | GPUs started per request | cold starts; deployment is Python code |
| Oracle Cloud Always Free | free, card verification | A1 now 2 OCPU / 12 GB (halved; enforced 2026-08-18) | over-limit instances terminated |
| Hetzner CAX31 | ~€20.99/month after 2026-06-15 | 8 vCPU ARM, 16 GB | reported not orderable |
| Cloudflare Workers / Workers AI | - | - | Workers: ~128 MB memory, cannot hold a model. Workers AI: hosts Cloudflare's model list (incl. Gemma 4 26B), not your own weights |

Hugging Face hardware list (from `hf spaces hardware`): cpu-basic 2 vCPU 16 GB; cpu-upgrade 8 vCPU 32 GB $0.03/h;
t4-small 1x T4 16 GB $0.40/h; a10g-small 1x A10G 24 GB $1.00/h.

## Speed expectation

Decode is limited by memory bandwidth / bytes read per token (Gemma 4 E4B reads ~3.0 GB per token; see 05). A laptop
GPU gave 25-35 tokens/s. Server CPUs with few cores give a fraction of that; GPUs give several times more. Always
measure with `ml/llm/probe_remote.py` after deploying.

## The portable Docker setup (any container host)

Kept in `deploy/hf-space/`. The Dockerfile is the whole server:

```dockerfile
FROM ghcr.io/ggml-org/llama.cpp:server
ENV LLAMA_CACHE=/tmp/llama-cache
EXPOSE 8080
CMD ["-hf", "ggml-org/gemma-4-E4B-it-GGUF:Q4_0", "--no-mmproj", "-c", "8192", "-np", "2", "--reasoning", "off", "-t", "2", "--host", "0.0.0.0", "--port", "8080"]
```

- The official image's entrypoint is `/app/llama-server`, so `CMD` holds only its arguments. Tags verified on ghcr:
  `server`, `full`, `light`.
- `LLAMA_API_KEY` is **not** in the file. Set it as the host's secret environment variable; llama-server reads it.
- `--host 0.0.0.0` is required inside a container and is safe only because the key is enforced.
- `-t` = the host's vCPU count; `-np` = parallel conversations (they share the `-c` context memory).
- The model downloads on every cold start unless the host has persistent storage; bake it into the image or mount a
  volume if cold starts matter.

### Hugging Face Space variant (needs PRO)

`deploy/hf-space/README.md` front matter: `sdk: docker`, `app_port: 8080`. Commands (the person runs them):

```bash
LLAMA_API_KEY="$(cat ~/.config/boli/api_key)" hf repos create <user>/<space> --type space --sdk docker --public --flavor cpu-basic --secrets LLAMA_API_KEY
hf upload <user>/<space> deploy/hf-space . --type space
hf spaces logs <user>/<space> --build -f      # build logs
hf spaces logs <user>/<space> -f              # run logs
curl -s https://<user>-<space>.hf.space/health
```

`hf` is installed with `uv tool install huggingface_hub` (v2.4.0 used; commands are `hf repos`, not `hf repo`).

## Choosing

| Situation | Pick |
|---|---|
| Learning, demos, outside testing | own machine + tunnel |
| App already on Cloudflare, CPU speed acceptable | Cloudflare Containers |
| Need GPU speed, traffic is bursty | Modal (or another per-second GPU platform) |
| Steady traffic all day | a dedicated server (CPU or GPU) priced per month |

Doc 06 will record the measured result of moving Boli's model to one of these.
