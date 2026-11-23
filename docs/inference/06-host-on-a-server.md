# 06 - Host the model on a server

> **Status: planned. Written on 2026-11-24 as a placeholder; nothing below has been run yet.** Do not follow it as a
> playbook until it has steps, commands, measured numbers and Verify lines like 01-05.

**Will get you:** the model on a machine whose only job is serving, instead of a laptop behind a quick tunnel, with a
fixed address and streaming that works.

## What is decided

- The deployment itself stays the portable Docker setup from 04 (`deploy/hf-space/`, official
  `ghcr.io/ggml-org/llama.cpp:server` image, `LLAMA_API_KEY` as a host secret, not in the file).
- The gateway (07) does not change: it reads `LLAMA_BASE_URL` and `LLAMA_API_KEY`, so moving the model is an env
  change.
- The fixed address comes after the domain (`bolihq.com`) is bought: a named tunnel such as `api.bolihq.com` (plan
  Q3, Q42).

## What is not decided

The host. The two candidates, with their limits as checked on 2026-11-24, are in
[`04-hosting-options.md`](04-hosting-options.md):

| Candidate | Why it is on the list | Its catch (from 04) |
|---|---|---|
| Cloudflare Containers | the app already runs on Cloudflare | CPU only, up to 4 vCPU / 12 GiB; needs the paid Workers plan |
| Modal (serverless GPU) | GPU speed, paid per second | cold starts; deployment is Python code |

Re-check both pages before choosing; free tiers and prices changed during planning.

## What this doc will contain once it is done

1. The chosen host and why, with the date.
2. Exact commands (the person runs anything that creates a paid resource or a secret).
3. Measured numbers with `ml/llm/probe_remote.py` from another network: no-key 401, warm latency, tokens per second,
   three requests at once, cold start time if any.
4. The cost per hour and, with 08's prices, the cost per million tokens compared with what Boli charges.
5. Traps hit on the way.
