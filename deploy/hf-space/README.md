---
title: Boli Chat
colorFrom: gray
colorTo: gray
sdk: docker
app_port: 8080
pinned: false
license: apache-2.0
short_description: Gemma 4 E4B served by llama.cpp for Boli (API key required)
---

# Boli Chat

Gemma 4 E4B (4-bit GGUF from `ggml-org`) served by llama.cpp's `llama-server` on free CPU hardware, with an
OpenAI-compatible API. Every request needs `Authorization: Bearer <key>`; the key is a Space secret.

```bash
curl https://nirajjha31-boli-chat.hf.space/v1/chat/completions \
  -H "Authorization: Bearer $BOLI_KEY" -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Namaste!"}]}'
```

Model: [google/gemma-4-E4B-it](https://huggingface.co/google/gemma-4-E4B-it) (Apache 2.0), quantized by
[ggml-org](https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF).
