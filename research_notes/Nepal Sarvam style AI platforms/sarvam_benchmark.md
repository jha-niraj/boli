# Sarvam AI benchmark and foreign self-serve Nepali AI APIs (as of 23 Nov 2026)

## What exactly does Sarvam's self-serve developer experience include today, and which of its APIs support Nepali?

### Takeaway
Sarvam is a full self-serve platform: free signup with Rs 100 of credits that never expire, one universal credit wallet, published INR per-unit prices, Python and JS SDKs, streaming and WebSocket TTS, plus a startup programme. Nepali (code `ne-IN`, India-locale, not ne-NP) works only in Saaras v4 STT, Sarvam-Translate and Sarvam Vision (document OCR). There is NO Nepali TTS (Bulbul), no Nepali in Mayura translate, and no Nepali in the Sarvam-105B LLM language list.

### Cited Findings
**Signup, credits, billing**
- Rs 100 free credits on signup. Credits work on every API, never expire and roll over. Top-ups are credited 1:1 (Rs 1,000 = 1,000 credits), non-refundable. When credits run out, calls return errors until you top up. A minimum top-up exists but no amount is given — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- Plans (INR/month): Pay-as-you-go Rs 0; Pro Rs 9,999; Growth Rs 49,999; Business Rs 1,99,999; Enterprise custom. The paid plans' monthly fee comes back in full as credits, with lower unit rates. Enterprise adds higher rate limits, custom concurrency, SLAs. No rate-limit numbers are published (a 429 means you hit the limit) — [Sarvam API pricing](https://www.sarvam.ai/api-pricing); [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart)
- API keys are made in the dashboard at `indus.sarvam.ai/key-management` and used as the env var `SARVAM_API_KEY` — [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart)

**SDKs, docs, tooling**
- Python SDK `sarvamai` (`pip install -U sarvamai`, Python 3.9+, client `SarvamAI`). JS/TS SDK `sarvamai` (`npm install sarvamai@latest`, Node 18+, client `SarvamAIClient`). More languages are listed under "Libraries & SDKs" — [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart)
- An MCP server for the docs (`docs.sarvam.ai/_mcp/server`) lets Claude Code and Cursor read them. The docs also publish llms.txt and .md versions of pages, plus a dated changelog (e.g. 18 Aug 2026) — [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart); [Sarvam changelog](https://docs.sarvam.ai/changelog/2026/8/18)
- Playground: an older changelog entry says it lets you test Sarvam-M, Sarvam-Translate and TTS/STT live. No current page confirming the playground's scope was found — [Sarvam changelog](https://docs.sarvam.ai/api/changelog)

**Models (current list)**
- STT: **Saaras v4** (latest, default). Modes: transcribe, translate, verbatim, translit, codemix. 23 languages (22 Indian + English). Saaras v3 is still available — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models)
- **Saarika (v2.5) is deprecated.** One docs page says its code examples were removed; another still says "will be deprecated soon", so the docs disagree — [Saarika docs](https://docs.sarvam.ai/api-reference-docs/models/saarika); [Sarvam changelog](https://docs.sarvam.ai/api/changelog)
- TTS: **Bulbul v4 Flash** (latest, 200+ persona voices, about 10 languages). **Bulbul v3** (stable API default, 30+ speakers, 11 languages: hi, bn, ta, te, gu, en, kn, ml, mr, pa, od). **Instant Voice Cloning** (beta, 12 Indian languages). Neither Bulbul list includes Nepali — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models)
- Translate: **Mayura** (11 languages, no Nepali). **Sarvam-Translate** (23 languages, includes ne-IN). There is no separate transliteration model on the models page, but transliteration is a priced API, and Saaras v4 has a `translit` mode — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models); [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- LLM: **Sarvam-105B** (128K context, reasoning) and **Sarvam-105B Conversations** (32K). Both list 11 languages, no Nepali. Sarvam-M and Sarvam-30B are deprecated. A `/v2` API also serves open-weight models (GLM-5.3, GLM-5.3 Flash, Gemma 4 31B, DeepSeek V4.1 Flash, DeepSeek V4 Pro, Kimi K3.1 Pro, Qwen 3.8 27B) — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models)
- Document intelligence: **Sarvam Vision** (OCR and structured output, 23 languages including ne-IN). Parse and Extraction APIs — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models)
- Other products: audio and video dubbing, and Voice Agents "as low as Rs 3 a minute" — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)

**Nepali support**
- Code `ne-IN`. Supported in Saaras v4 (STT), Sarvam-Translate and Sarvam Vision. Not in Bulbul v3, Bulbul v4 Flash, Mayura or Sarvam-105B — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models)

**Streaming**
- TTS (Bulbul v3 and v4 Flash) is priced separately for real-time, streaming and WebSocket. STT has real-time and batch tiers. Voice cloning supports `convert_stream` and WebSocket — [Sarvam API pricing](https://www.sarvam.ai/api-pricing); [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart)

**Unit prices (INR, read 23 Nov 2026; PAYG rate, with Business tier in brackets)**
- STT real-time or batch: Rs 0.49/min (0.38). Batch with diarization: Rs 0.59/min (0.47). Language ID: Rs 0.35 per 1K chars — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- TTS per 1K chars: Bulbul v4 Flash Rs 2.00 (1.60). Bulbul v3 Rs 3.00 (2.60). Voice cloning Rs 2.00 — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- Translate (standard, formal or colloquial): Rs 2.00 per 1K chars (1.35). Transliterate: Rs 2.00 (1.70). Document translation: Rs 5.00 (4.00) — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- LLM per 1M tokens (input / cached / output): Sarvam 105B Rs 10 / 0.25 / 25 ("introductory", no end date). Gemma 4 Rs 35 / 10 / 90. GLM 5.3 Rs 126 / 20 / 390. GLM 5.3 Flash Rs 13.5 / 2.5 / 45. DeepSeek V4.1 Flash Rs 25 / 0.5 / 105 — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- Document AI: Parse Rs 0.50/page, Extraction Rs 1.00/page. Dubbing Rs 40/min — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)

**Startup programme**
- 6-12 months of API credits sized to the startup (no fixed amount published), priority support from engineers, and co-marketing. "Powered by Sarvam" must be shown in the product. Unused credits lapse when the programme ends. You apply through a multi-step form (stage, funding, APIs needed, year 1-2 usage) — [Sarvam Startup Program](https://www.sarvam.ai/startup-program)

### Inferences
- For a Nepali product, Sarvam today covers STT, translation and OCR, but not TTS or a Nepali-tuned LLM. A Nepal-based platform with good Nepali TTS would fill a gap that Sarvam does not.
- Sarvam labels Nepali as Indian Nepali (`ne-IN`). How well it handles Nepal-standard Nepali vocabulary and accents is unverified.
- At a reference rate of about Rs 88 = USD 1 (an assumption, not sourced), Rs 0.49/min STT is about USD 0.0056/min. That is in line with OpenAI and Deepgram STT prices and above AssemblyAI's cheapest tier.

**"Sarvam-like" checklist for scoring Nepal candidates** (based on the findings above)
1. Self-serve signup with no sales call, and an API key issued at once
2. Free credits on signup (Sarvam: Rs 100, never expire)
3. Public per-unit price list in local currency, prepaid credit wallet, pay-as-you-go plus volume tiers
4. Browser playground to try each model
5. Public API reference docs, quickstart, changelog, and LLM-friendly docs (llms.txt or MCP)
6. Official SDKs (at least Python and JS/TS)
7. STT model with real-time, streaming and batch modes, diarization and language ID
8. TTS model with several voices, streaming or WebSocket, and voice cloning
9. Translation and transliteration APIs (formal and colloquial styles)
10. A native-language LLM or chat API
11. Document intelligence (OCR, parse, extract)
12. Higher-level products (voice agents, dubbing)
13. Startup programme or credits
14. Published rate limits and SLA tiers (Sarvam itself is weak here)

### Gaps
- The exact signup screens on dashboard.sarvam.ai were not checked (no signup per the constraints). Docs point to `indus.sarvam.ai`.
- The playground's current scope (does it include Saaras v4 and Bulbul v4?) is unconfirmed.
- Bulbul v4 Flash's exact language list is somewhat unclear. The page summary listed about 10 languages, none of them Nepali.
- No published rate-limit numbers were found.

## Which foreign platforms provide self-serve Nepali STT and TTS, at what prices?

### Takeaway
Self-serve Nepali **STT** is common: Google Chirp, Azure, ElevenLabs Scribe, AssemblyAI and Deepgram (Nova-2) all list it, as does Sarvam. Self-serve Nepali **TTS** is rare: Azure (2 neural voices, ne-NP-HemkalaNeural and ne-NP-SagarNeural), ElevenLabs v3/v4, and Google Gemini-TTS (ne-NP, Preview only). Bhashini lists Nepali for ASR, TTS and language detection, but it is a government registration-based platform, not a priced commercial API. Cloudflare Workers AI has no confirmed Nepali support.

### Cited Findings
**Google Cloud**
- STT v2: ne-NP is supported on `chirp` (asia-southeast1, europe-west4; punctuation only), `chirp_2` (same regions; punctuation, model adaptation, word confidence, profanity filter) and `chirp_3` (eu; punctuation, adaptation, profanity filter). No Nepali rows were seen for `long`, `short` or `telephony` — [Google STT supported languages](https://docs.cloud.google.com/speech-to-text/v2/docs/speech-to-text-supported-languages)
- Classic Cloud TTS voice table (Standard, WaveNet, Neural2, Chirp 3 HD): no ne-NP row was found in the parts read. The list goes from Norwegian straight to Polish — [Google TTS voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)
- Gemini-TTS (Cloud TTS) lists Nepali (Nepal) ne-NP as **Preview**. Which model variants (Flash or Pro TTS) support it is unclear — [Gemini-TTS docs](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)
- Price (secondary sources): Chirp 3 standard recognition about USD 0.016/min for the first 500K min/month, dynamic batch about USD 0.003-0.004/min — [Future AGI STT guide 2026](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks); [convertaudiototext pricing 2026](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026)

**Microsoft Azure Speech**
- STT ne-NP: real-time yes, batch yes, fast transcription yes, LLM Speech transcription yes, custom speech (plain text only) — [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
- TTS ne-NP: `ne-NP-HemkalaNeural` (female) and `ne-NP-SagarNeural` (male), Standard neural, no HD voices. Nepali also appears in the Personal voice (custom TTS) table — [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
- Speech translation: every STT locale can be a source language (so ne-NP works), and Nepali `ne` is a translate-to-text target. Video translation lists ne-NP as a source and target for standard voice. Language identification includes ne-NP — [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
- Price (secondary sources, they disagree): real-time about USD 0.017-0.024/min, batch about USD 0.18/hr — [convertaudiototext pricing 2026](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026); [Future AGI STT guide 2026](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks)

**ElevenLabs**
- TTS: Nepali (ne) is in the language lists for Eleven v4 / v4 Turbo (90+ languages) and Eleven v3 / v3 Conversational (70+). It is NOT in Multilingual v2 or Flash v2.5 — [ElevenLabs models](https://elevenlabs.io/docs/overview/models)
- STT: Scribe v2/v3 and the Realtime versions claim 90+ languages. The official models page does not name Nepali, but ElevenLabs has a Nepali STT landing page, and Vapi's table lists Nepali for ElevenLabs STT — [ElevenLabs Nepali STT](https://elevenlabs.io/speech-to-text/nepali); [Vapi ElevenLabs transcriber](https://docs.vapi.ai/providers/transcriber/elevenlabs)
- ElevenLabs' own comparison claims Scribe v1 gets 9.4% WER on FLEURS Nepali against Deepgram Nova-2 at 100% (vendor claim, not independent) — [ElevenLabs Nepali STT](https://elevenlabs.io/speech-to-text/nepali)
- Price (secondary source): Scribe about USD 0.22/hr (about USD 0.0037/min) — [convertaudiototext pricing 2026](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026)

**AssemblyAI**
- Nepali is supported in its Universal models (99 languages) with automatic language detection — [AssemblyAI Nepali](https://www.assemblyai.com/languages/nepali); [AssemblyAI languages](https://www.assemblyai.com/languages)
- A third-party blog (May 2026) reports about 13% WER for AssemblyAI on Nepali — [Praxium Labs](https://praxiumlabs.com/blog/nepali-voice-assistant/)
- Price (secondary source): Universal-2 pre-recorded USD 0.15/hr, Universal-3.5 Pro USD 0.21/hr — [Future AGI STT guide 2026](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks). No TTS product.

**Deepgram**
- Has a Nepali STT page and lists Nepali (ne) in the Nova family. The docs recommend Nova-2 for languages Nova-3 does not yet support, so Nepali is likely Nova-2 only (unconfirmed) — [Deepgram Nepali](https://deepgram.com/product/speech-to-text/nepali); [Deepgram models & languages](https://developers.deepgram.com/docs/models-languages-overview)
- Price (secondary source): Nova-3 streaming USD 0.0077/min list (promo USD 0.0048), batch about USD 0.0043/min — [Future AGI STT guide 2026](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks). Its TTS (Aura) is not known to support Nepali.

**OpenAI**
- Price (secondary source): gpt-4o-transcribe USD 0.006/min, gpt-4o-mini-transcribe USD 0.003/min — [convertaudiototext pricing 2026](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026)

**Bhashini (Government of India)**
- The BHASHINI site and ULCA page list Nepali among supported languages. The API docs list Nepali for the multilingual ASR model, TTS, and audio and text language detection — [Bhashini](https://bhashini.gov.in/); [Bhashini ULCA](https://bhashini.gov.in/ulca); [Bhashini API models](https://dibd-bhashini.gitbook.io/bhashini-apis/available-models-for-usage)
- Access: register on Bhashini/ULCA to get a user ID and API key, then call the model-pipeline endpoint and the inference endpoint. The ULCA contracts are open-source (MIT) — [ULCA GitHub](https://github.com/bhashini-dibd/ulca)

**Cloudflare Workers AI**
- Billed in neurons at USD 0.011 per 1,000, with 10,000 free neurons per day — [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/index.md)
- Translation runs on m2m100-1.2B (100 languages). STT runs on Whisper. No source confirming Nepali on Workers AI was found — [CODERCOPS](https://blog.codercops.com/blog/cloudflare-workers-ai-edge-inference-2026)

**Comparison summary (STT / TTS / Translation for Nepali)**

| Platform | Nepali STT | Nepali TTS | Nepali translation | Indicative STT price |
|---|---|---|---|---|
| Sarvam | Yes (Saaras v4, ne-IN) | No | Yes (Sarvam-Translate) | Rs 0.49/min |
| Google Cloud | Yes (chirp, chirp_2, chirp_3) | Gemini-TTS only, Preview | not verified here | ~USD 0.016/min std |
| Azure | Yes (real-time, batch, fast, custom) | Yes, 2 neural voices + personal voice | Yes (speech translation to `ne`) | ~USD 0.017-0.024/min |
| ElevenLabs | Yes (Scribe, per landing page) | Yes (v3, v4) | n/a | ~USD 0.0037/min |
| AssemblyAI | Yes (Universal) | No product | n/a | USD 0.15-0.21/hr |
| Deepgram | Yes (likely Nova-2) | Not found | n/a | ~USD 0.0043-0.0077/min |
| OpenAI | likely (see Gaps) | not verified | not verified | USD 0.003-0.006/min |
| Bhashini | Yes | Yes | likely (see Gaps) | free / govt registration |
| Cloudflare | unconfirmed | No | unconfirmed | USD 0.011 per 1K neurons |

### Inferences
- Nepali STT is now widely available and cheap from foreign vendors (USD 0.003-0.016/min). A Nepal-based platform has to beat them on Nepal-standard accuracy, code-mixing (Nepali-English) and local billing, not on availability.
- Nepali TTS is the thinnest category abroad: 2 Azure voices, ElevenLabs v3/v4, and Google Gemini-TTS in preview. This is the clearest opening for a "Sarvam for Nepal".
- Foreign vendors bill in USD by card. Paying in NPR through local wallets (eSewa, Khalti) is a likely difference for Nepal platforms. This was not verified here.

### Gaps
- Most foreign STT prices come from secondary 2026 blog roundups that disagree with each other. Official pricing pages (Google, Azure, AssemblyAI, Deepgram, OpenAI, ElevenLabs) were not fetched, and TTS prices for Azure, ElevenLabs and Gemini-TTS were not collected.
- OpenAI: no primary source confirming Nepali for gpt-4o-transcribe or TTS voices was read. Whisper is widely known to include Nepali, but that was not checked this session.
- Gemini API (AI Studio): Nepali support in its native audio and STT was not verified. Only the Cloud Gemini-TTS ne-NP Preview listing was found.
- Translation: Nepali support in Google Cloud Translation, Azure Translator and Bhashini NMT was not checked directly. AI4Bharat (IndicTrans2, IndicConformer, Indic Parler-TTS) was not researched, and it is open-weights rather than a hosted self-serve API.
- Bhashini: no Nepali pipeline ID was found, and it is unclear whether access is fully self-serve or needs approval. It has no published commercial pricing.
- Cloudflare: the m2m100 and Whisper model pages were not checked for Nepali.
- No independent Nepali WER benchmark across vendors was found. The numbers above are vendor or blog claims.

## What makes a platform "Sarvam-like" (the checklist to score Nepal candidates against)?

### Takeaway
"Sarvam-like" means a self-serve, credit-based developer platform with a full set of native-language AI models (STT, TTS, translation, transliteration, LLM, document AI) behind public docs, SDKs, a playground and transparent per-unit prices. The 14-point checklist is under the first question, and every item maps to a Sarvam feature cited there.

### Cited Findings
- Self-serve keys and SDKs — [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart)
- Free credits, a universal non-expiring wallet, public INR unit pricing and plan tiers — [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- A full model set (STT, TTS, translate, LLM, vision) — [Sarvam models](https://docs.sarvam.ai/api-reference-docs/getting-started/models)
- Startup programme — [Sarvam Startup Program](https://www.sarvam.ai/startup-program)
- Changelog, llms.txt and docs MCP — [Sarvam changelog](https://docs.sarvam.ai/changelog/2026/8/18); [Sarvam quickstart](https://docs.sarvam.ai/api-reference-docs/getting-started/quickstart)

### Inferences
- Suggested weights for scoring Nepal candidates: core models for Nepali (STT, TTS, translation, LLM) 40%; self-serve onboarding (signup, free credits, key at once) 20%; docs, SDKs and playground 20%; public pricing and local payments 10%; streaming and real-time 10%.
- For the comparison, also score each foreign platform's Nepali TTS and STT. A Nepal platform should at least match Azure and ElevenLabs on TTS voice quality and Sarvam on STT price (about Rs 0.49/min, roughly NPR 0.78/min at the fixed INR-NPR peg of 1.6, which is an assumption, not sourced here).

### Gaps
- The weights are a suggestion, not taken from a source.
