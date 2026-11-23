# Research Dossier — Nepali Speech AI Landscape

Compiled 17–19 October 2026. Everything we found while asking "is there a Sarvam-like platform for Nepal?" Organised so Claude Code can use it as a reference for model selection, competitive positioning and eval design. Items marked **verify** were read from a website or model card, not tested by us.

---

## A. The one-line conclusion

No Nepali company runs a self-serve speech developer platform. The best Nepali speech models are open-source from two small Kathmandu labs and nobody has productised them. The best *productised* Nepali speech experience is Sarvam (India). Bhashini (Indian government) is partnering with Kathmandu University to build a Nepali platform; nothing shipped yet.

---

## B. Nepal-based companies and labs

### B1. Self-serve (you can sign up today)

**TingTing** — Prixa, Kupandole, Kathmandu
- What: AI telephony suite — Call Broadcast, Text (SMS), Forms (voice surveys), Agents (voice bots), Connect, Omni (unified inbox). Five Nepali TTS voices: Ashmita, Subina, Samriddhi (female), Dhiraj (beta male), Binod (male).
- Developer access: signup with 100 free AI credits, no card. API docs list auth, API token generation, phone numbers, campaigns, a Test Voice endpoint, a Demo Call endpoint and OTP endpoints. It is a campaign/telephony API, **not** a raw STT or TTS API.
- Weakness: the developer page's "How does it work" section is copied from Modal's documentation (suggests they run inference on Modal). API docs are thin.
- Links: https://www.tingting.io · https://suite.tingting.io/register · https://www.tingting.io/for-developers · https://www.tingting.io/experience-center · https://www.tingting.io/playground?category=tingting-call-broadcast&type=generic · Live agent: +977-9700066088
- Lesson for us: there *is* demand for Nepali voice from banks/telcos (they list 50+ B2B clients, 10M interactions). Their voice samples are a useful quality bar to beat.

**Koili.ai** — Virtual Technology Pvt. Ltd., Pokhara
- What: Nepali TTS web app. Free registration, audio history, "generate API access key".
- Weakness: footer links for API, Demo, Pricing, Blog all go nowhere. No docs, voice list or pricing found. No STT.
- Links: https://koili.ai · https://koili.ai/accounts/signup/ · https://koili.ai/accounts/login/ · Developer: https://vtechnepal.com

### B2. Open research labs (free demos / weights, no commercial API)

**Ampixa Labs** — Nepal (location not specified beyond "Nepal-based")
The most complete open Nepali speech stack. Everything is public code, weights, datasets or demos.
- *NepaliConformer* — ASR. Two 121M-param Conformer models (offline + cache-aware streaming) trained from scratch on ~1,655 h of mostly conversational Nepali. Reported **33.8% WER on real call-centre audio** vs 40.6% next-best open and 96.3% for zero-shot Whisper-large-v3 on the same audio/scorer.
  - Code: https://github.com/Ampixa/nepaliconformer · Offline: https://huggingface.co/ampixa/nepali-conformer-offline · Streaming: https://huggingface.co/ampixa/nepali-conformer-streaming · Live demo: https://huggingface.co/spaces/voidash/nepaliconformer
- *NepTel* — benchmark of real spontaneous Nepali call-centre speech, 75 segments / 2,375 words, reviewed by a native speaker, ungated, per-system outputs published. **Use this as our hardest eval set.** https://huggingface.co/datasets/ampixa/neptel
- *Kala* — open-source Nepali VITS TTS with its own Devanagari G2P, no eSpeak dependency, five voices, ~50× real time on CPU, open training recipe. `pip install kala-tts`. **verify license** (frontend/resources listed as CC-BY-SA-4.0).
  - Demo: https://tts.ampixa.com/kala/ (redirect-looped on 17 Oct; use the Space) · Space: https://huggingface.co/spaces/ampixa/real-nepali-tts · Models: https://huggingface.co/ampixa/kalaTTS · Training recipe: https://github.com/Ampixa/nepal-tts-training · Model card referenced: https://huggingface.co/ampixa/real-nepali-v0.2-kala
- *sanoTTS* — neural voices of 745k–1.8M params, nine voices across six languages incl. Nepali, <4 MB per voice, numpy inference, runs in-browser via WASM and on an ESP32. `pip install sanotts`. Perfect for a free CPU tier.
  - Code: https://github.com/Ampixa/sanoTTS · Models: https://huggingface.co/ampixa/sanoTTS · Demo: https://tts.ampixa.com/sanoTTS/
- *NepTTS-Bench* — first Nepali TTS benchmark: 365 sentences, 12 systems, 5,760+ human MOS ratings from 164+ native speakers, plus a NepaliMOS predictor. `pip install neptts-eval`. **Use for TTS eval.**
  - Code: https://github.com/Ampixa/neptts-bench · Data: https://huggingface.co/datasets/ampixa/neptts-bench
- *nepali-mfa* — forced alignment, pronunciation dictionaries, review dashboards; ~509 h of MFA-prepared data. **Use in Phase 6.** https://github.com/Ampixa/nepali-mfa
- *nepa-newa-text-frontend* — Devanagari → phone tokens for TTS, documents the dialect it encodes (Kathmandu Newari-influenced Nepali). https://github.com/Ampixa/nepa-newa-text-frontend · Try: https://tts.ampixa.com/g2p/
- *nepali-reverse-g2p*: https://github.com/Ampixa/nepali-reverse-g2p
- *nepal-ttf2utf* — legacy font (Preeti, Kantipur…) → Unicode converter. Useful for text normalisation of old documents. https://github.com/Ampixa/nepal-ttf2utf
- Also: Limbu, Gurung, Dhimal TTS demos; LimbuOCR; Barnamala (handwritten Devanagari); Nepali Sign Language research.
- Org links: https://ampixa.com · https://github.com/Ampixa · https://huggingface.co/ampixa · hello@ampixa.com
- Lesson: Ampixa's whole approach — publish the benchmark, publish per-system outputs, state limitations — is exactly the posture our `eval/` should take.

**Naamche Labs** — Kathmandu
- *Kriti V1* — 119M-param Nepali-only Conformer-RNNT, MIT license. Primary WER 24.08% (punctuation-insensitive), raw WER 24.69%, CER 8.29% on a frozen 3,630-utterance dev set; ties AI4Bharat IndicConformer RNNT for #1 of 19 systems. Training: 630 h / 402,905 clips from OpenSLR 54 (153k), OpenSLR 43 (2k), FLEURS Nepali (4.3k), AI4Bharat IndicVoices (242k). Architecture: 17 Conformer blocks + RNNT + a separate 1,025-param head that decides whether to emit a terminal danda (।). Derived from AI4Bharat IndicConformer (commit `cd09ba7`) with multilingual heads pruned. 16 kHz input. **verify** model file format (likely NeMo).
- *Kriti Telephony* — narrowband adaptation; 32.38% WER on NepTel (claimed new SOTA there). https://naamchelabs.com/models/kriti-telephony
- No hosted demo or API found on their site.
- Links: https://naamchelabs.com · https://naamchelabs.com/models/kriti-v1 · Weights: https://huggingface.co/harrrshall/kriti · Code: https://github.com/Naamche-Labs/kriti · Reproducibility: https://github.com/Naamche-Labs/kriti-reproducibility · News: https://theubj.com/naamche-labs-launches-kriti-an-open-nepali-speech-recognition-model-built-in-nepal/
- Note the eval-set caveat: Kriti's 24% is on a dev set drawn from the same sources as training (read speech, IndicVoices); NepTel (spontaneous phone audio) gives 32%+. Expect our real-world numbers to look like the latter.

### B3. B2B / sales-only

**TalkC.ai** — Kathmandu. AI call-centre / voice agents in "70+ Asian languages"; claims production use at Yango Nepal (~22K calls/month), Office of Company Registrar, Budhanilkantha and Arjun Chaupari municipalities. "14-day free trial" is a contact form; "API Docs" link is dead. https://talkc.ai · Blog with competitive claims: https://talkc.ai/blog/best-nepali-voice-ai-agents-guide-2026 · team@talkc.ai

**Wiseyak / WiseAI** — Kathmandu. Health-tech origins (WiseMD, Sajilo Doctor), now "Voice-to-Voice Conversational Agent AI". Deployed at Global Bank, Nepal Telecom, HRDC, SDNTC. GSMA Innovation Fund grantee for English-Nepali-Maithili code-mixed STT/TTS/voice-to-voice. Internal repos reveal an *OmniVoice* TTS (voice "Pratikshya") and ASR endpoints on `*.wiseai.wiseyak.com` dev hosts — no public access. https://wiseyak.com/products/ai-agent/ · https://wiseyak.com/career/ · GSMA: https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/announcing-the-gsma-innovation-fund-for-impactful-ai-grantees/ · Public repo showing their stack: https://github.com/aagaman-wiseyak/wiseai-call · info@wiseyak.com
- Lesson: this is the closest thing to a real competitor for bank/telco deals. They sell as a service, not a platform.

**Paaila Technology** — Chakupat, Lalitpur. Robotics (humanoids "Pari", "Ginger"), proprietary Nepali ASR and TTS for their robots. Both product pages say "API is coming real soon" and have for years. https://paailatechnology.com/ai/ · https://paailatechnology.com/ai/nepali-speech-recognition · https://paailatechnology.com/ai/nepali-text-to-speech · https://github.com/paaila

**Diyo AI** — Jwagal, Lalitpur. Nepali chatbots: *Muna* (government services; Butwal, Lalitpur, UNDP, Nepal Tourism Board) and *Golu*. Claims 173+ h speech data collected, 3.5M-sentence parallel corpus, transliteration accuracy 0.864. No self-serve. https://www.diyo.ai · https://www.diyo.ai/muna · https://www.diyo.ai/golu

**Others mentioned in the ecosystem:** Fusemachines (NASDAQ-listed, ran a Nepali ASR fellowship project in 2017 — https://medium.com/fusemachines/nepali-automatic-speech-recognition-nepali-asr-88c1dd884e8c), Kathmandu AI Labs (Nepali BERT variant), NAAMII (research institute), NConnect AI (WhatsApp CPaaS). None offer speech APIs.

Directory sources: https://www.sajedar.com/articles/top-ai-automation-agencies-in-nepal · https://www.nucamp.co/blog/coding-bootcamp-nepal-npl-nepals-top-10-startups-that-tech-professionals-should-watch-out-for-in-2025 · https://fivizo.com/blog/artificial-intelligence-in-nepal-ai-trends-companies-and-business-solutions

---

## C. Policy and institutional context

- **Bhashini × Kathmandu University MoU (6 June 2026):** Digital India BHASHINI Division and KU's Centre for DPI & AI (Prof. Bal Krishna Bal) will collaborate on Nepali datasets, speech corpora, STT, TTS, MT and conversational AI — a "voice-first platform for Nepal". https://www.fintechbiznews.com/fintech-technology/bhashini-kathmandu-university-to-create-voice-first-platform-for-nepal
  - Implication: a free, India-hosted Nepali speech platform may appear. Our moat is Nepal-controlled hosting + on-prem + DX, not raw model quality.
- **Nepal National AI Policy (2025):** aims to train 5,000 AI professionals, build provincial AI centres, develop a Nepali LLM. https://ictbyte.com/news/ascent-of-artificial-intelligence-in-nepal/
- **Public interest in AI voice fakes in Nepali** (Kantipur, Oct 2026) — relevant to a future audio-watermarking / provenance feature: https://ekantipur.com/technology/2026/10/15/en/draft-only-34-24.html

---

## D. Open models for Nepali — candidate list for Phase 1

### D1. ASR
| Model | Params | Type | License | Notes |
|---|---|---|---|---|
| Kriti V1 (Naamche) | 119M | Conformer-RNNT, 16 kHz | MIT | #1 on its dev set, 24.08% WER. https://huggingface.co/harrrshall/kriti |
| Kriti Telephony (Naamche) | 119M | same, narrowband | MIT (verify) | 32.38% WER NepTel. https://naamchelabs.com/models/kriti-telephony |
| NepaliConformer offline / streaming (Ampixa) | 121M each | Conformer | **verify** | 33.8% WER NepTel; the only open **streaming** Nepali model. https://huggingface.co/ampixa/nepali-conformer-streaming |
| AI4Bharat IndicConformer (RNNT, multilingual) | — | Conformer-RNNT, NeMo | **verify** | Kriti's parent; ties Kriti on dev. Search "ai4bharat indic-conformer" on HF. |
| Qwen3-ASR-Nepali (sidskarki) | 1.7B | fine-tuned Qwen3-ASR | **verify** | Avg 41.4% WER across FLEURS/IndicVoices-R/OpenSLR-43; trained for ~$7. https://huggingface.co/sidskarki/Qwen3-ASR-Nepali · https://github.com/sidskarkii/nepali-asr |
| Meta MMS-1B (`npi`) | 1B | wav2vec2-CTC | CC-BY-NC-4.0 (verify) | 45.5% avg WER in the above table. Non-commercial — likely **excluded** from product. |
| Whisper large-v3 (OpenAI) | 1.5B | enc-dec | MIT | **Do not use for Nepali**: 94–106% WER even after fixing a float16 dtype bug that made earlier evals worse. Keep as a cautionary baseline only. |
| amitpant7/whisper-small-nepali, anish/wav2vec2-nepali | small | fine-tunes | verify | Suspiciously low OpenSLR-43 scores (2–5%) suggest train/test leakage; treat with care. |

### D2. TTS
| Model | Size | Type | License | Notes |
|---|---|---|---|---|
| Kala (Ampixa) | — | VITS, 5 voices, own G2P | **verify** (CC-BY-SA-4.0 frontend) | 50× RT on CPU. Primary candidate. https://huggingface.co/ampixa/kalaTTS |
| sanoTTS Nepali (Ampixa) | 0.7–1.8M | tiny neural | verify | Runs anywhere; free-tier / edge candidate. https://huggingface.co/ampixa/sanoTTS |
| Matcha-TTS Nepali (sandipghimire) | — | flow-matching, 2 speakers (F/M), 22.05 kHz | verify | Trained on AI4Bharat Rasa Nepali; uses Ampixa G2P; HiFi-GAN universal vocoder. https://huggingface.co/sandipghimire/matcha-tts-nepali |
| F5-TTS OpenBible Nepali | — | zero-shot DiT, 24 kHz | verify | Voice cloning from a reference clip; trained on Bible read speech → domain-limited. https://huggingface.co/multilingual-tts/F5-TTS-OpenBible-Nepali |
| eSpeak-ng `ne` | — | formant | GPL | Robotic; only as a last-resort fallback. Tutorial: https://tamrakar-shreyaa.medium.com/nepali-text-to-speech-engine-from-scratch-no-apis-needed-f50f0550336d |

### D3. Datasets (for eval now, fine-tuning later)
| Dataset | Content | License | Use |
|---|---|---|---|
| NepTel (Ampixa) | 75 real call-centre segments | open, ungated | **Primary hard eval.** https://huggingface.co/datasets/ampixa/neptel |
| FLEURS Nepali (Google) | read speech, train/dev/test | CC-BY-4.0 | Standard eval; note Kriti trained on part of it — use **test** only. |
| OpenSLR 54 | ~165 h Nepali read speech, 527 speakers (Kjartansson et al.) | verify | Kriti & Qwen3-ASR trained on it — hold out carefully. |
| OpenSLR 43 | Nepali TTS corpus (Sodimana et al.) | verify | TTS training; small ASR eval (but synthetic-like). |
| AI4Bharat IndicVoices / IndicVoices-R | large, incl. Nepali | verify | Kriti trained on 242k clips. |
| AI4Bharat Rasa | expressive TTS, Nepali subset | verify | Matcha-TTS Nepali's training data. |
| Mozilla Common Voice Nepali | crowd-sourced | CC0 | Check volume/quality; often tiny for Nepali. |
| pujanpaudel/nepali-speech-to-text | aggregate of the above | mixed | Convenience; check provenance before use. https://huggingface.co/datasets/pujanpaudel/nepali-speech-to-text |
| NepTTS-Bench | 365 sentences + MOS | verify | TTS eval. https://huggingface.co/datasets/ampixa/neptts-bench |
| yushan-wiseyak/Text-to-Speech-Nepali-dataset | Wiseyak-published TTS set | verify | https://huggingface.co/datasets/yushan-wiseyak/Text-to-Speech-Nepali-dataset |

Survey paper for background: *A Comprehensive Study of the Current State-of-the-Art in Nepali ASR* — https://arxiv.org/pdf/2402.03050

---

## E. Non-Nepali platforms that support Nepali (what we are *not* allowed to call, but must match on DX)

**Sarvam AI (India)** — the product bar. Unified STT model *Saaras v3* covers 22 Indian languages incl. Nepali `ne-IN`, with diarization, Nepali-English code-mixing, streaming via WebSocket at sub-250 ms, modes `transcribe / translate / translit / codemix`. TTS *Bulbul V4 Flash* at ₹20 per 10,000 characters, 8–48 kHz output. Playground + Content Studio + API; Startup Program with 6–12 months of credits.
- https://www.sarvam.ai/apis/speech-to-text/nepali · https://www.sarvam.ai/speech-to-text · https://www.sarvam.ai/apis/text-to-speech · Streaming API ref: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe/ws · Docs: https://docs.sarvam.ai · Dashboard: https://dashboard.sarvam.ai · https://en.wikipedia.org/wiki/Sarvam_AI
- **Design decision:** mirror Sarvam's request/response shapes and the `api-subscription-key` header so switching to us is a URL change.

**Global APIs with Nepali** (reference only): ElevenLabs Scribe STT — https://elevenlabs.io/speech-to-text/nepali · AssemblyAI — https://www.assemblyai.com/languages/nepali · Deepgram — https://deepgram.com/product/speech-to-text · CAMB.AI TTS — https://www.camb.ai/text-to-speech/nepali · Play.ht Nepali voices — https://play.ht/text-to-speech-voices/nepalese-nepali/ · Speak AI — https://speakai.co/how-to-transcribe-nepali/ · ModelsLab voice clone — https://modelslab.com/voice-cloning/nepali · Google (`ne-NP` STT/TTS, WaveNet) · Azure (`ne-NP-HemkalaNeural`, `ne-NP-SagarNeural`).

Useful eval idea (Phase 1, optional, **owner decision**): since these are third parties, we never route user traffic to them — but we *may* run them once on NepTel/FLEURS with our own test audio to know where we stand. Document clearly if done.

---

## F. Older / academic Nepali ASR (context only, not candidates)
- JuJu2181 wav2vec2 Nepali ASR + summariser (final-year project): https://github.com/JuJu2181/Automatic-Nepali-Speech-Recognition-and-Summarizer
- sanjaalcorps NepaliNLPWebApp (NLP toolkit, long-running hobby project): https://github.com/sanjaalcorps/NepaliNLPWebApp
- Early Nepali TTS by character recordings (2010s): https://github.com/rajeebbanstola/nepalitexttospeech
- Nepali voice-controlled home automation (CNN-LSTM): https://www.github.com/Ayushma00/nepali-speech-recognition-automation
- Wiseyak-adjacent: `wiseai-date` Nepali date library on PyPI (handy for TTS number/date normalisation): https://pypi.org/project/wiseai-date/
- `nepal-gov-agent` (RAG over Nepal gov documents, mentions Paaila NLU/TTS): https://pypi.org/project/nepal-gov-agent/

---

## G. Known gotchas collected during research
1. **Whisper is not a baseline for Nepali.** ~96–106% WER. Some published evals were further broken by a float16 bug. Don't let anyone (including Cloudflare Workers AI) talk you into Whisper.
2. **Train/test leakage is rampant** in small Nepali fine-tunes (OpenSLR-43 scores of 2–5% WER are a red flag). Our eval must use NepTel + FLEURS *test* + a held-out slice, and we must record which training sets each candidate used.
3. **Devanagari normalisation decides your WER as much as the model does.** Danda (।) vs period, nukta forms, ZWJ/ZWNJ, chandrabindu vs anusvara variants, Unicode NFC. Define one normaliser, publish it, apply it to both reference and hypothesis.
4. **Dialect is real.** Ampixa's frontend explicitly encodes Kathmandu Newari-influenced pronunciation and says who it is *not* right for. Expect Terai/Madhesh and hill-dialect speakers to score worse; log region if users consent.
5. **Code-mixing is the norm**, not an edge case ("म room book गर्न चाहन्छु"). The eval set must include it; Sarvam's `codemix` mode is the UX reference.
6. **Legacy fonts.** Government and media text is often in Preeti/Kantipur ASCII fonts; TTS input will need `nepal-ttf2utf`-style conversion.
7. **Licenses are mixed.** MIT (Kriti), CC-BY-SA-4.0 (Ampixa frontend), CC-BY-NC (MMS), GPL (eSpeak). A share-alike frontend inside a commercial API needs a human legal read before launch.
