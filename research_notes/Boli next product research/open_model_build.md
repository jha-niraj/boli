# Building "paste your website link, get a chat assistant" on open models only (Boli, Nov 2026)

Scope: what Boli (boli-chat = Gemma 4 E4B instruct, 4-bit GGUF on llama.cpp `llama-server`; app on Next.js + Cloudflare Workers + Neon Postgres) needs for crawl -> extract -> chunk -> embed -> retrieve -> grounded answer with citations -> embeddable widget, for Nepali (Devanagari), Romanized Nepali and English. Research done 2026-11-24 with ~20 searches/fetches; many items are third-party summaries and are flagged as such. Nothing here was run or benchmarked by me.

Repo context worth knowing (from the git log, not the web): commit 6878fa9 ("docintel: Stage 0") already has `read_doc.py` with text/image/tesseract/hybrid routes and `score.py` with Preeti detection and conversion over a 39-document set of Nepal government notices - reusable for PDF ingestion. `packages/webdata` currently wraps Exa search and Firecrawl scrape (hosted APIs); for the product runtime under the "self-hostable only" rule, those would need a self-hosted replacement or an explicit owner exception.

---

## 1. Crawling and extraction

### Takeaway
Two realistic paths: (a) Cloudflare Browser Rendering's `/crawl` endpoint (fits the Workers stack, renders JS, returns Markdown, obeys robots.txt and sitemaps out of the box, open beta since 2026-03-10), or (b) a self-hosted Crawl4AI (Apache-2.0) container on the same box as the GPU. Firecrawl self-host is AGPL-3.0, which matters if Boli modifies it and offers it as a service. Nepali-specific work is mostly post-processing: Preeti-to-Unicode conversion, PDF text vs OCR routing, and a manual/FAQ path for Facebook-only businesses.

### Cited Findings
- Cloudflare Browser Rendering `/crawl` (REST, open beta, added 2026-03-10) takes a start URL, discovers and renders pages, returns HTML, Markdown or structured JSON; it is an async two-step flow (POST starts a job, GET fetches results). — [Cloudflare changelog 2026-03-10](https://developers.cloudflare.com/changelog/2026-03-10-br-crawl-endpoint); [crawl endpoint docs](https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint)
- `/crawl` respects robots.txt by default including crawl-delay, identifies as `CloudflareBrowserRenderingCrawler/1.0`, reports per-job robots.txt status for the first 50 origins, and can use sitemaps as a link source (`source`: "sitemaps", "links", or "all" default), following nested sitemap indexes to a depth. — [Cloudflare robots.txt reference](https://developers.cloudflare.com/browser-rendering/reference/robots-txt); [crawl endpoint docs](https://developers.cloudflare.com/browser-rendering/quick-actions/crawl-endpoint)
- Since 2026-08-31 `/crawl` supports Content Signals: a request declares `contentUse` (`reference` or `full`, default `full`) and is rejected with a 400 when the site's robots.txt is more restrictive. — [Cloudflare changelog 2026-08-31](https://developers.cloudflare.com/changelog/post/2026-08-31-crawl-content-use/)
- Crawl4AI: Apache-2.0, runs as a Python library, CLI, or self-hosted Docker server; latest release reported as 0.9.5 (2026-10-14) by a third-party blog - verify on GitHub releases. — [fastcrw.com (third party)](https://fastcrw.com/blog/best-self-hosted-scrapers); [openalternative comparison](https://openalternative.co/compare/crawl4ai/vs/firecrawl)
- Firecrawl repo is "primarily AGPL-3.0" (SDKs and some UI MIT); self-hosting means running the full server with its own queues, workers and databases. — [firecrawl GitHub](https://github.com/firecrawl/firecrawl)
- Preeti (legacy ASCII Nepali font) conversion: `npttf2utf` (pip) maps Preeti, Sagarmatha and other Nepali ASCII fonts to Devanagari Unicode, supports .docx/.txt, last release 0.3.7 (May 2021), licence listed oddly - check before reuse; an npm `preeti-unicode` package (ISC) exposes `convertToUnicode`. — [npttf2utf GitHub](https://www.github.com/casualsnek/npttf2utf); [PyPI](https://pypi.org/project/npttf2utf/0.3.6); [npm preeti-unicode](https://www.npmjs.com/package/preeti-unicode)

### Inferences
- For a v1 on this stack, `/crawl` with `source: "all"`, a page cap (e.g. 50-200 pages for a small business) and Markdown output avoids running a headless browser fleet. A per-tenant crawl is a long job (30s+), so per AGENTS.md section 5 it belongs in a Cloudflare Workflow, with progress polled by the page.
- Crawl4AI is the fallback when `/crawl` blocks or for sites needing custom JS interaction; it can live on the GPU box.
- Consent: the business owner submits their own URL, so add an "I own or manage this site" checkbox and keep robots.txt respected (default in `/crawl`). Use `contentUse: "reference"` semantics if a site signals restrictions.
- Facebook-only businesses: no compliant scraping path was researched; v1 should offer "paste your FAQ / menu / price list / upload PDF" as the knowledge source, and later the Messenger channel (section 6).
- Run Preeti detection on every extracted text block (the repo's `score.py` already does detection) before chunking; garbled Latin-looking Preeti text will otherwise poison both embeddings and BM25.

### Gaps
- Did not verify Trafilatura and Jina Reader (self-host) current versions/licences in this pass.
- Browser Rendering pricing/limits for `/crawl` (browser hours, pages per job) not checked.
- No source found on how often small Nepali business sites are JS-only vs static.

---

## 2. Open embedding models and rerankers for Nepali / Romanized Nepali / English

### Takeaway
BGE-M3 (MIT, 568M, dense+sparse+multi-vector, 8K context) is the safest default with the only Nepali-specific evidence found (84.0% Recall@1 in a Nepali benchmark). Qwen3-Embedding-0.6B (Apache-2.0, 1024-d, 32K) and EmbeddingGemma-308M (Gemma licence, 100+ languages) are lighter candidates worth testing. Jina v3/v4 are NOT usable self-hosted for commercial use (CC BY-NC / possibly Qwen Research License). No public benchmark covers Romanized Nepali retrieval properly - Boli must build its own small eval.

### Cited Findings
- A recent multi-task benchmark of LLMs and embedding models on Nepali reports BGE-M3 at 84.0% Recall@1 on retrieval and recommends BGE-M3 or multilingual-E5 over English-only defaults; code/data at github.com/RameshKadariya/nepali-llm-benchmark. (Snippet only; full paper 403'd.) — [ResearchGate](https://www.researchgate.net/publication/408986977_How_Well_Does_AI_Understand_Nepali_A_Multi-Task_Benchmark_of_Large_Language_Models_and_Embedding_Models_on_a_Low-Resource_Language)
- On Hindi-BEIR CC News, BGE-M3 nDCG@10 34.40 vs mE5 20.81. — [Hindi-BEIR, arXiv 2408.09437](https://arxiv.org/pdf/2408.09437)
- A 2026 benchmark found mE5-large the strongest open model, ahead of BGE-M3 by ~0.109 nDCG on average (not Nepali). — [arXiv 2605.23618](https://arxiv.org/html/2605.23618v1); contradicts the Hindi-BEIR direction above - result depends on the test set.
- BGE-M3 on MIRACL (18 languages) reported nDCG@10 70.0 (all modes) vs ~65.4 mE5. — [DeepInfra summary of BGE-M3 paper](https://deepinfra.com/BAAI/bge-m3-multi)
- Qwen3-Embedding: Apache-2.0; 0.6B has 28 layers, 32K sequence length, 1024-d output, instruction-aware; 8B scores 70.58 on MTEB Multilingual. — [Qwen blog](https://qwenlm.github.io/blog/qwen3-embedding); [Qwen3 Embedding paper](https://arxiv.org/html/2506.05176v3)
- Qwen3-Embedding-0.6B MMTEB mean ~64.33 (third-party catalog, not confirmed in the official paper excerpt). — [Accenture AI Refinery catalog](https://sdk.airefinery.accenture.com/distiller/model_catalog/Embedding/Qwen/Qwen3-Embedding-0.6B/)
- EmbeddingGemma: 308M params, built on Gemma 3, trained on 100+ languages, ranks 8th overall on MTEB(Multilingual, v2), 17 places above the next sub-500M model. No Nepali breakdown found. — [EmbeddingGemma paper arXiv 2509.20354](https://arxiv.org/abs/2509.20354); [HF blog](https://huggingface.co/blog/embeddinggemma)
- jina-embeddings-v3 is CC BY-NC 4.0 (commercial use needs a Jina licence or their API); jina-embeddings-v4's HF card says CC BY-NC 4.0 while Jina's model page says Qwen Research License (no commercial use) - conflicting. — [HF v3 README](https://huggingface.co/jinaai/jina-embeddings-v3/blob/e9ac638886aae46dc290174ed6a8f5423a90da49/README.md); [Jina v4 page](https://jina.ai/en-US/models/jina-embeddings-v4/); [Jina commercial terms](https://jina.ai/COMMERCIAL-LICENSE-TERMS.pdf)
- Community Nepali embedders exist: `nepali-e5-base-v1` says Romanized support is only partial, measured on synthetic transliteration, romanized-query score 0.2983 described as a ceiling; `nepali-embedder-v1` lists cross-script pairs as a v2 roadmap item. — [nepali-e5-base-v1](https://huggingface.co/Ganu000/nepali-e5-base-v1); [nepali-embedder-v1](https://huggingface.co/premmm/nepali-embedder-v1)
- Reranker: bge-reranker-v2-m3 has many GGUF conversions (Q4_K_M, Q8_0, Q2_K-FP16) and runs in `llama-server` with `--reranking` (some guides add `--embedding --pooling rank`), exposed at `/rerank` and `/v1/rerank` taking `query`, `documents`, optional `top_n`. — [gpustack GGUF](https://huggingface.co/gpustack/bge-reranker-v2-m3-GGUF/tree/main); [llama.cpp rerank guide](https://www.simplified.guide/_export/xhtml/llama-cpp/server-call-rerank-api)

### Inferences
- MIRACL's 18 languages do not appear to include Nepali (I am inferring from the language list, not a source stating it); Hindi results are the nearest proxy.
- Practical choice for v1: BGE-M3 (1024-d dense; its sparse output also helps lexical matching) or Qwen3-Embedding-0.6B, served by `llama-server --embedding` on the same GPU as boli-chat, plus bge-reranker-v2-m3 for top-20 -> top-5. All three are small (<1B) and fit beside a 4-bit E4B on one 24 GB card.
- Romanized Nepali queries against Devanagari pages are the weakest link; the evidence (nepali-e5 card) says dense models do poorly cross-script. Mitigate with transliteration (section 5) and hybrid lexical search, and build a 100-200 query eval set (Devanagari / Romanized / English x the same pages) before picking a model.
- Qwen3-Reranker was not researched in this pass; it is Apache-2.0 per the Qwen embedding release (same family blog) but sizes/Nepali quality unverified.

### Gaps
- No direct Nepali numbers for Qwen3-Embedding, EmbeddingGemma or nomic.
- Nepali benchmark full tables (mE5 margin, Romanized results) not retrieved (403).
- CPU throughput/latency for BGE-M3 embedding not measured or sourced.

---

## 3. Vector storage and hybrid search on Neon / Cloudflare

### Takeaway
pgvector on Neon is the natural fit (one database, tenant id filtering, joins with chunks and sources). HNSW indexes vectors up to 2,000 dims (halfvec up to 4,000), so 1024-d BGE-M3/Qwen3 is fine. For BM25, Neon deprecated ParadeDB `pg_search` (new installs blocked, removal of existing installs scheduled September 2026) in favour of `lakebase_text`; built-in Postgres full-text search or a trigram index is the fallback. Cloudflare Vectorize is an option (10M vectors/index, up to 1,536 dims) but splits data across two stores.

### Cited Findings
- Neon pgvector: HNSW supports up to 2,000 dims for `vector`, 4,000 for `halfvec`, 64,000 for `bit`; `sparsevec` up to 1,000 non-zero elements; IVFFlat same limits. — [Neon pgvector docs](https://neon.com/docs/extensions/pgvector)
- Neon deprecated `pg_search`: new installs blocked, existing installs to be removed September 2026; replacement `lakebase_text` adds a `lakebase_bm25` index type. — [Neon migration guide](https://neon.com/docs/extensions/migrate-pg-search-to-lakebase-text); [lakebase_text docs](https://neon.com/docs/extensions/lakebase-text)
- Vectorize: indexes up to 10 million vectors (changelog 2026-01-23), up to 1,536 dims at 32-bit; max 10 metadata indexes per index, 64 bytes indexed metadata per vector; billed on queried + stored dimensions; Workers free tier includes Vectorize for prototyping. Third-party sites quote 20M vectors (conflict - trust the changelog). — [Vectorize changelog 2026-01-23](https://developers.cloudflare.com/changelog/post/2026-01-23-increased-index-capacity/index.md); [Vectorize limits](https://developers.cloudflare.com/vectorize/platform/limits); [Vectorize pricing](https://developers.cloudflare.com/vectorize/platform/pricing/)

### Inferences
- Schema sketch: `kb_source` (tenant, url, kind, crawl status), `kb_chunk` (tenant, source, text, script tag devanagari/latin, `embedding vector(1024)`, tsvector), HNSW on embedding, GIN on tsvector/trigram. Every query filters by tenant (AGENTS.md section 6). Small tenants (hundreds of chunks) barely need ANN; a tenant filter + exact scan is fine at v1 scale.
- Postgres `to_tsvector('simple', ...)` works for Devanagari tokens split on whitespace; `pg_trgm` similarity helps Romanized spelling variants ("cha"/"chha", "garnu"/"garnuhos"). Combine dense + lexical with reciprocal rank fusion in SQL, then rerank.
- Neon over HTTP from Workers is fine for retrieval (one round trip per query with a CTE doing both searches).
- Check whether `lakebase_text` is available on Boli's Neon plan/region before relying on BM25 proper.

### Gaps
- Did not confirm `pg_trgm` / `lakebase_text` availability per Neon region or Postgres version.
- Neon compute cost for HNSW builds at scale not researched.

---

## 4. Can a ~4B model (Gemma 4 E4B) do grounded RAG reliably?

### Takeaway
No published eval was found for Gemma 4 E4B specifically on RAG faithfulness, citation accuracy or refusal. The literature says small models CAN be trained to cite and abstain, but untuned small models tend to answer everything and ignore "say you don't know" instructions. E4B has a 128K context window (but weak long-context retrieval: 25.4% on MRCR v2 8-needle 128K), so keep contexts short (~3-6K tokens of top reranked chunks). Plan a guard layer (retrieval-score threshold + post-hoc citation check) rather than trusting the prompt, and keep Gemma 4 26B-A4B (MoE, ~4B active) as the step-up model.

### Cited Findings
- Gemma 4 model card: E4B = 4.5B effective params (8B with embeddings), 42 layers, 512-token sliding window, 128K context; 12B/26B-A4B/31B have 256K. MRCR v2 8-needle 128K: E4B 25.4% (vs 66.4% for the top model in the table). — [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- "Knowing Before Answering" reports smaller, non-instruction-tuned models tend to answer every question and ignore refusal instructions; prompting alone does not fix it. — [arXiv 2608.27661](https://arxiv.org/pdf/2608.27661)
- OCC-RAG trains small models (0.6B/1.7B) for context-grounded QA with citation-aware output and abstention, reportedly beating baselines under 4B (Qwen3-4B appears as a baseline). — [OCC-RAG arXiv 2606.00683](https://arxiv.org/html/2606.00683)
- Trust-Align defines grounded-refusal metrics (correct refusal on unanswerable, correct answer on answerable) and catalogs citation errors (overcitation, improper citation); shows alignment training improves them. — [arXiv 2409.11242](https://arxiv.org/html/2409.11242)
- AssameseLM-E2B (a low-resource Indic language, 2026): baseline models scored roughly 20-40% citation F1 and 0% refusal accuracy in RAG before fine-tuning. — [arXiv 2611.06170](https://arxiv.org/pdf/2611.06170)
- Citation correctness is not citation faithfulness: a model can cite a supporting doc it did not actually use; needs separate measurement. — [Wallat et al. 2025](https://staff.fnwi.uva.nl/m.derijke/wp-content/papercite-data/pdf/wallat-2025-correctness.pdf)
- Unanswerable questions should be built from the same knowledge base for a realistic refusal test. — [arXiv 2412.12300](https://arxiv.org/pdf/2412.12300)
- Gemma 4 26B-A4B MoE ~149.56 tok/s via Ollama on RTX 4090 (third-party); 31B dense ~7.84 tok/s on a 4090 because it spills to system RAM. — [markaicode (third party)](https://markaicode.com/benchmarks/llamacpp-gemma-4-rtx-4090-throughput-benchmark/); [vantaige (third party)](https://vantaige.io/zh/blog/gemma-4-rtx-4090-tokens-per-sec-vram-benchmark)

### Inferences
- Prompt pattern for E4B: numbered sources `[1]..[k]` with title+URL; instruct "answer only from sources, cite [n] after each sentence, if not found say <fixed sentence in user's language> and offer contact"; low temperature; short answers. Then enforce in code: (1) if max rerank score < threshold, skip generation and return the fixed "not found + contact" reply; (2) strip citations to nonexistent indices; (3) optionally verify each cited sentence with the reranker (query=sentence, doc=cited chunk) and drop low scorers.
- A Boli-specific path that matches the repo direction (own models, fine-tune later): a small LoRA on E4B with grounded-answer/refusal examples in Nepali/Romanized/English is the documented route to fix refusal (OCC-RAG, Trust-Align, AssameseLM). Not needed for a demo, needed for production trust.
- Step-up: 26B-A4B has ~4B active parameters so decode speed is similar to E4B on a GPU that holds it (needs ~16+ GB at 4-bit, inference), giving much better long-context and reasoning; use it for paying tiers or as a "hard question" fallback. 31B dense is too slow on a single 24 GB card.

### Gaps
- No Gemma 4 E4B-specific faithfulness / Nepali RAG eval exists that I found; Boli must build one (50-100 Q/A per demo site incl. unanswerable ones).
- Qwen3-class 4B/8B comparison on Nepali not researched.

---

## 5. Romanized Nepali handling

### Takeaway
AI4Bharat IndicXlit supports Nepali in both directions (Roman <-> Devanagari), is ~11M params, and has a NepaliXlit fine-tune aimed at social-media Romanized Nepali. Use it to normalise Romanized queries into Devanagari for a second retrieval pass; answer in the script the user typed (detected by character ranges), which the LLM can do from an instruction.

### Cited Findings
- IndicXlit supports 21 Indic languages including Nepali (nep), Roman->native and native->Roman; transformer ~11M params; trained on Aksharantar which includes Nepali. — [IndicXlit README](https://raw.githubusercontent.com/AI4Bharat/IndicXlit/master/README.md); [IndicXlit repo mirror](https://github.com/aymanimtyaz-goswift/IndicXlit); [Aksharantar paper, EMNLP Findings 2023](https://preview.aclanthology.org/fix_video/2023.findings-emnlp.4.pdf)
- `ai4bharat-transliteration` Python package lists Nepali (ne); newer releases support both directions; an npm `@ai4bharat/indic-transliterate` exists. — [PyPI](https://pypi.org/project/ai4bharat-transliteration); [npm](https://www.npmjs.com/package/@ai4bharat/indic-transliterate)
- NepaliXlit: fine-tuned from IndicXlit for Romanized Nepali common on social media. — [ACL Anthology author page](https://aclanthology.org/people/suraj-patel/)
- Romanized Nepali-English code-mixing is common on social media and research has used cross-script transfer (sentiment, not retrieval). — [arXiv 2402.04542](https://arxiv.org/html/2402.04542v1)

### Inferences
- Pipeline: detect script (Devanagari block U+0900-097F vs Latin); if Latin and not clearly English (a cheap word-list or fastText-style check), transliterate to top-k Devanagari candidates with IndicXlit and run retrieval on both original and transliterated forms, fused with RRF. Also index a transliterated Romanized copy of Devanagari chunks for trigram matching.
- IndicXlit is a fairseq/PyTorch model; it is small enough for CPU on the GPU box. Running it inside a Worker is unlikely (inference).
- Reply script: instruct the model "reply in the same script and language as the user's last message"; verify with a script check and regenerate once if wrong.

### Gaps
- No published accuracy for IndicXlit/NepaliXlit on Nepali found in this pass.
- No Romanized Nepali retrieval dataset found; FIRE CMIR exists only for Bengali-English ([CEUR Vol-4173](https://ceur-ws.org/Vol-4173/T3-9.pdf)).

---

## 6. The widget and messaging channels

### Takeaway
Widget security/streaming patterns were not deeply researched in this pass (see Gaps). For channels: WhatsApp changed pricing on 2026-10-01 - incoming messages free, 1,000 free service replies per business number per month, then replies billed at the country utility rate; Nepal now has its own rate card. Messenger Send API is reported free (third party) within a 24-hour window, with a Human Agent tag (7 days, needs app approval). Viber is pay-per-message via aggregators with varying minimums.

### Cited Findings
- WhatsApp from 2026-10-01: every business phone number gets 1,000 free service messages/month (no rollover); beyond that replies billed at recipient-country utility rate; utility templates billed even inside the window; incoming messages free; 72-hour Click-to-WhatsApp-ad window free; Nepal moved out of "Rest of Asia Pacific" to its own rate card. — [Sparrow SMS (Nepal Meta Tech Provider), 2026-10-01](https://sparrowsms.com/blog/whatsapp-pricing-update-october-2026/); primary: [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)
- Nepal per-message rates differ by source: Infobip lists utility EUR 0.003795 (~USD 0.0046) and marketing USD 0.092; other guides list ~USD 0.0034 utility, USD 0.0732 marketing. — [Infobip](https://www.infobip.com/whatsapp-business/pricing); [flowcall (Nov 2026)](https://www.flowcall.co/blog/whatsapp-business-api-pricing)
- Messenger: 24-hour standard window opens when a person messages the Page; Human Agent tag allows human replies up to 7 days, requires app approval; CONFIRMED_EVENT_UPDATE, ACCOUNT_UPDATE, POST_PURCHASE_UPDATE tags retired 2026-02-10. — [Meta Send a Message](https://developers.facebook.com/docs/messenger-platform/send-messages); [Messenger policy](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy)
- Messenger Platform reportedly costs nothing for Send API / in-window replies (third party, checked 2026-11-16). — [Unipile](https://www.unipile.com/facebook-messenger-api-pricing/)
- Viber Business Messages: priced by destination and type (transactional/promotional/session), session allows up to 5 consecutive business messages without a user reply; no setup fee at some aggregators, others require ~EUR 200/month minimum; domestic vs international rates since 2024-10-01. — [Infobip Viber](https://infobip.com/viber-business/pricing); [tyntec FAQ](https://tyntec.com/?p=35147); [MessageWhiz](https://messagewhiz.com/viber/); [8x8](https://cpaas.8x8.com/en/blog/rakuten-vibers-new-business-messaging-rates-8x8-viber-for-business-api/)

### Inferences
- Widget design (standard industry pattern, not sourced here): a `<script src=".../widget.js" data-bot="pk_...">` loader that injects an iframe (style isolation); a public, per-bot key checked server-side against an allowlist of `Origin`/`Referer` hosts; secret keys only for server-to-server API; per-IP + per-bot rate limits (Cloudflare rate limiting binding or a Durable Object counter); per-tenant monthly message cap tied to credits; Turnstile challenge after N messages; SSE streaming from a Worker route proxying llama-server; lead capture as a tool/form after "not found"; human handoff = email/WhatsApp link to the owner in v1; analytics = store every Q, retrieved sources, answered/refused flag.
- Messenger is the most relevant later channel for Facebook-only Nepali businesses (free API, Page-based); WhatsApp next (customer-initiated replies mostly inside the 1,000 free/month for a small shop).

### Gaps
- Did not source widget security best practices, Cloudflare rate-limiting binding limits, or Turnstile pricing.
- No official Meta Messenger pricing page found; Viber exact Nepal rates not found.

---

## 7. Cost per 1,000 chats and v1 scope

### Takeaway
The only credible E4B throughput figure found is ~130 tok/s single-stream on an NVIDIA L4 with llama.cpp (Google QAT q4_0 build). At ~300 output tokens per reply that is ~2-3 s generation per answer per stream; a single L4-class GPU can serve thousands of chats/day, so GPU cost per 1,000 chats is dominated by the rental price and idle time, not tokens. CPU-only is plausible for a demo but slow for Devanagari (more tokens per word) - unmeasured.

### Cited Findings
- AWS builder guide: Gemma 4 E4B on NVIDIA L4 with llama.cpp (QAT q4_0), 129.7 tok/s (E2B 133.4/217.6 in different settings); speculative decoding gave no gain for E4B. Single-user runs. — [AWS builder article](https://builder.aws.com/content/3LHTWAMUeCaDq0EB6JxSfqXRCGe/size-your-model-to-where-you-run-it-gemma-4-e2b-and-e4b-on-an-aws-l4-and-two-small-gpus)
- Online E4B speed numbers vary from single digits to 100+ tok/s; ~9 tok/s figures on a 4090 are a vLLM TRITON_ATTN fallback issue, not llama.cpp. No official 4090 + llama.cpp E4B benchmark exists. — [vantaige](https://vantaige.io/zh/blog/gemma-4-rtx-4090-tokens-per-sec-vram-benchmark); [dev.to/runaihome](https://dev.to/jovan_chan_9500711396d4e6/google-gemma-4-for-local-ai-which-size-fits-your-gpu-2026-guide-4l4b)

### Inferences (worked estimate, assumptions marked)
- Assume a chat = 4 turns; each turn ~4K prompt tokens (system + 5 chunks + history) and ~250 output tokens; prefill on an L4 is much faster than decode (assumption, typical for llama.cpp on GPU). At ~130 tok/s decode, one turn ~2-3 s; 1,000 chats = 4,000 turns ~ 3 GPU-hours single-stream, less with llama-server parallel slots (`-np`) batching.
- If an L4/4090-class GPU rents at roughly USD 0.4-0.8/hour (ASSUMPTION - not sourced in this pass), that is ~USD 1-3 of GPU time per 1,000 chats at full utilisation; real cost is driven by keeping the GPU on 24/7 (~USD 300-600/month) until volume fills it. Embeddings and reranking add little (<1B models).
- CPU (no GPU): expect an order of magnitude slower decode (inference, unmeasured); acceptable only for a demo with one user at a time.
- v1 that fits a few weeks: (1) URL submit + `/crawl` Workflow (page cap, robots respected) + PDF/FAQ paste upload; (2) extraction cleanup with Preeti detection/conversion; (3) chunk ~300-500 tokens with heading path + URL; (4) BGE-M3 (or Qwen3-Emb-0.6B) embeddings in Neon pgvector + Postgres FTS/trigram, RRF, bge-reranker-v2-m3; (5) IndicXlit query normalisation; (6) E4B grounded answer with numbered citations and a score-threshold refusal; (7) script-tag widget with public key + domain allowlist + rate limit + SSE + "leave your number" lead capture; (8) owner dashboard: sources, re-crawl, transcripts, unanswered questions. Defer: Messenger/WhatsApp/Viber, human live handoff, fine-tuned refusal LoRA, 26B tier.
- Demo prep: hand-build an eval set for 3-5 real Nepali business sites (answerable + unanswerable, three scripts) and report answer/refusal/citation rates before showing customers.

### Gaps
- GPU rental prices (Nov 2026) for L4 / 4090 / A10 not sourced.
- No measured E4B throughput with concurrent slots, or on CPU.
- No measured Devanagari tokens-per-word ratio for the Gemma 4 tokenizer.
