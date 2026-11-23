# 05 - Inspect a model file

**Gets you:** what is actually inside a GGUF model: its architecture, layer count, vocabulary, where the weights are,
and the sampling defaults its publisher recommends. Useful for estimating memory and speed before deploying.

**Run on:** 2026-11-24, `gemma-4-E4B-it-Q4_0.gguf` (4,590,807,392 bytes).

## Steps

### 1. Find the file

```bash
ls ~/.cache/huggingface/hub/                               # one folder per downloaded repo
lsof -p $(pgrep -n llama-server) | grep gguf               # the file a running server has open
```

### 2. Read the metadata (no weights printed)

```bash
uvx --from gguf gguf-dump --no-tensors <path-to.gguf> | grep -v "tokenizer.ggml.tokens\|scores\|token_type\|merges\|chat_template"
```

### 3. Count weights per part

```bash
uvx --with gguf --with numpy python - <path-to.gguf> <<'EOF'
import sys
from gguf import GGUFReader
r = GGUFReader(sys.argv[1]); tot = 0; groups = {}
for t in r.tensors:
    n = int(t.n_elements); tot += n
    key = "blk.N." + t.name.split(".", 2)[2] if t.name.startswith("blk.") else t.name
    g = groups.setdefault(key, [0, 0, t.tensor_type.name, list(map(int, t.shape))]); g[0] += 1; g[1] += n
print(f"tensors: {len(r.tensors)}  total weights: {tot/1e9:.2f} billion")
for k, (c, n, ty, sh) in sorted(groups.items(), key=lambda kv: -kv[1][1])[:14]:
    print(f"{k:38s} x{c:<3d} {n/1e9:6.3f} B  {ty:6s} shape {sh}")
EOF
```

## What Gemma 4 E4B contains

| Field | Value | Meaning |
|---|---|---|
| `general.architecture` | gemma4 | the wiring llama.cpp uses |
| `general.size_label` | 7.5B | total weights |
| tensors / weights | 666 / 7.46 billion | |
| `gemma4.block_count` | 42 | layers |
| vocabulary | 262,144 tokens | |
| `embedding_length` / `feed_forward_length` | 2,560 / 10,240 | width of each layer / of its feed-forward part |
| attention heads / KV heads | 8 / 2 | grouped-query attention: smaller KV cache |
| `context_length` | 131,072 | maximum context the model supports |
| `attention.sliding_window` | 512 | most layers only look at the last 512 tokens |
| `attention.shared_kv_layers` | 18 | 18 layers reuse another layer's keys and values (24 layers have their own) |
| sampling defaults | temperature 1.0, top_p 0.95, top_k 64 | the publisher's recommended settings |
| license | apache-2.0 | |

Where the weights are:

| Part | Weights | Stored as |
|---|---|---|
| `per_layer_token_embd` (per-layer embeddings) | 2.82 B | Q4_0, looked up one row per token |
| feed-forward (`ffn_up`, `ffn_gate`, `ffn_down`) x 42 | 3.30 B | Q4_0 |
| `token_embd` (vocabulary embedding, also used for output) | 0.67 B | Q8_0 |
| attention (`attn_q`, `attn_output`, `attn_k`, `attn_v`) | 0.59 B | Q4_0 |

## What it tells you

- **"E4B" = effective 4B.** 7.46 B total minus the 2.82 B per-layer lookup table = ~4.6 B weights doing work per token.
- **Bytes read per token ≈ 3.0 GB**, not the full 4.6 GB (the lookup table is read one row at a time). With ~150 GB/s
  memory bandwidth the decode ceiling is ~50 tokens/s; the M5 measured 25-35 (60-70% of ceiling, typical).
- **Small KV cache** thanks to 2 KV heads, sliding windows on most layers and shared KV layers: long contexts are cheap.
- **Sampling defaults** are in the file; use them unless a test shows other settings are better.

## Where the model's code is

The weights are numbers; the code that wires them together is open too: the `gemma4` implementation inside llama.cpp
(C++, what runs here) and the Gemma 4 model code in Hugging Face Transformers (Python). Google's model card:
https://huggingface.co/google/gemma-4-E4B-it
