# Nepali-language LLM chat, translation and transliteration offerings (Nepal-built focus), as of November 2026

Research date: 2026-11-23. All pages were read on that date unless noted. Only public pages were read; nothing was signed up for or submitted.

Labels used:
- **OPEN WEIGHTS** - weights you can download and host yourself, with no hosted API from the builder
- **HOSTED SELF-SERVE** - a public API key or playground you can get without talking to sales
- **SALES-ONLY / GATED** - the API exists, but access goes through a contact form, a partnership or a manual signup approval

## Is there any Nepal-built LLM or chat model with a public hosted API or chat playground today?

### Takeaway
Nothing Nepal-built matches Sarvam's self-serve API. The closest is Himalaya AI Labs' HimalayaGPT 0.5B. A Kathmandu host, ScaLabs Cloud, offers an OpenAI-compatible endpoint for it, but you get access through a signup form and a manual key issue within about one working day, and its pricing statements contradict each other. GuffGPT is a free Nepal-made consumer chat app with no API. Its underlying model is not disclosed, so it is probably a wrapper.

### Cited Findings
- **HimalayaGPT 0.5B (Himalaya AI Research Lab / Himalaya AI Labs).** 500M-parameter instruction-tuned model trained on Nepali with a custom Nepali BPE tokenizer, 8K context. Hosted by ScaLabs Cloud on hardware in Kathmandu. The page says "we are the host, not the author". Access means a signup form, with the API key and endpoint sent within one working day. The endpoint is OpenAI-compatible ("point your OpenAI SDK at our endpoint"). The page says both "Free - fair-use rate-limited" and "Pay-per-use, no deposit", which conflict. It gives no licence and no release date, only a 2026 copyright. No playground is mentioned. Status: **GATED hosted API**, 2026. - [ScaLabs Cloud HimalayaGPT page](https://scalabs-cloud.pages.dev/inference/himalayagpt-0-5b)
- The ScaLabs page links to the weights at huggingface.co/himalaya-ai/himalayagpt-0.5b-it, the HF org huggingface.co/HimalayaGPT and GitHub github.com/HimalayaGPT. I did not open these, so licence and open-weight status are unverified. - [ScaLabs Cloud](https://scalabs-cloud.pages.dev/inference/himalayagpt-0-5b)
- Himalaya AI Labs stated purpose, April 2026: "building HimalayaGPT - a sovereign Nepali LLM for the Nagarik App & Hello Sarkar... with safety guardrails aligned to national policies". I found no government confirmation that it is deployed in Nagarik App. - [HimalayaAI on X](https://x.com/HimalayaAILabs/status/2041206703153402135)
- Himalaya AI's own site (himalayaai.org) returned only the title "HimalayaAI - Open Nepali AI Research" to the fetcher. No product or API details could be read. - [himalayaai.org](https://himalayaai.org)
- **Himalaya Gemma 4 E2B-it (Himalaya AI Labs).** Full-parameter SFT of google/gemma-4-E2B-it on a 50/50 mix of himalaya-ai/nepali-sft-dataset and OpenHermes-2.5, about 125k steps on one A100. Bilingual Nepali + English. The model card states no licence; it inherits Gemma terms by default, but that is my inference. It has no HF Inference Provider, but one community Space uses it (Titung/himalaya-gemma-nepali-asr-demo). A GGUF build exists. Status: **OPEN WEIGHTS**, 2026. - [HF model card](https://huggingface.co/himalaya-ai/himalaya-gemma-4-e2b-it)
- Featherless.ai lists himalaya-gemma-4-e2b-it and the Arkios models. Featherless is a US-based serverless host for open HF models, so this is a third-party, non-Nepal hosted route. I did not check pricing. - [Featherless himalaya-gemma](https://featherless.ai/models/himalaya-ai/himalaya-gemma-4-e2b-it); [Featherless arkios-1b-chat](https://featherless.ai/models/sajalregmi4/arkios-1b-chat)
- **GuffGPT.** Free consumer AI chat app "created in Nepal" for Nepali and English conversation, including images. Built by Dikshant Pandey, with Prayas Bhatt as web developer. The site does not say which model it runs on and mentions no API. Journal posts are dated March 2026. Status: **consumer app only, no API**. - [guffgpt.com](https://guffgpt.com/)
- **Arkios 1B chat** has no hosted API or Space from its authors. The card says "This model isn't deployed by any Inference Provider". - [HF arkios-1b-chat](https://huggingface.co/sajalregmi4/arkios-1b-chat)
- **NepalCHATGPT (chatgptnepal.org)** came up in search as advertising "API access, integration support, technical documentation". I did not open the page. Its builder, model and whether it is Nepal-based are all unverified. - [chatgptnepal.org](https://www.chatgptnepal.org/)
- **AI4Nepal and Diyo.AI** both list chatbot platforms, but neither is a general LLM API (see the next section).

### Inferences
- A developer who wants a Nepali chat endpoint today has three options: request a HimalayaGPT key from ScaLabs (a small 0.5B model, so expect limited quality); self-host Himalaya Gemma 4 E2B or Arkios behind vLLM, which gives an OpenAI-compatible endpoint; or use a global LLM API such as Gemini, OpenAI or Sarvam.
- No Nepal-built model I found is big or tested enough to match frontier global models on Nepali. All of them are 0.5B-2B scale.

### Gaps
- I could not verify HimalayaGPT's licence, benchmarks or real deployment in Nagarik App or Hello Sarkar.
- I could not confirm ScaLabs' real pricing (free vs pay-per-use) or how long it has offered the endpoint.
- I did not verify NepalCHATGPT.

## Is there any Nepali translation or Romanized<->Devanagari transliteration API from a Nepal company?

### Takeaway
Two Nepal companies advertise translation APIs: AI4Nepal (Kathmandu, founded 2024) and Diyo.AI (Lalitpur, founded 2020). Both are sales-led, with no self-serve signup, public pricing or playground. I found no Nepal company with a hosted Romanized-to-Devanagari transliteration API. That space is open-source libraries by individual developers.

### Cited Findings
- **AI4Nepal Pvt. Ltd.** Kathmandu, founded 2024, "Founded by IIT Madras Alumni", in partnership with AI4Bharat according to search snippets. Products: Translation API (neural MT across Nepal's languages, document translation, custom glossaries), Nepali ASR (Nepali, Maithili, Bhojpuri), TTS, an AI chatbot platform for 5 languages with WhatsApp, and an NLP toolkit (sentiment, NER, classification). Business model "B2B SaaS + API Services". The site has no self-serve signup, pricing, playground or public docs; its calls to action go to a contact page. Transliteration is not mentioned. Status: **SALES-ONLY**. - [aifornepal.com.np](https://www.aifornepal.com.np/)
- **Diyo.AI.** Nepal AI startup founded 2020 and incubated by NAAMII. It lists Translation, TTS, STT, Subtitling, conversational AI (chat and voice bots), an Agent Studio, and an "API" with docs and SDKs mentioned. It has a "Try Voice AI: Nepali" demo, but no self-serve signup and no pricing; contact is info@diyo.ai. The homepage does not mention transliteration, though a search snippet said it lists it. It won the NYEF Startup Award in 2022. Status: **SALES-ONLY (demo only)**. - [diyo.ai](https://www.diyo.ai/); [Sunway College partner page](https://sunway.edu.np/industry-partner/diyo-ai/)
- No Nepal company with a commercial Romanized-to-Devanagari transliteration API turned up in search. Open-source options:
  - `nepali_unicoder`: Python, Romanized and Preeti to Devanagari, greedy phonetic match plus custom overrides - [PyPI](https://pypi.org/project/nepali_unicoder/)
  - `nepali-citizen-transliterator`: names and addresses - [PyPI](https://pypi.org/project/nepali-citizen-transliterator/)
  - `nepali-to-roman`: Devanagari to Roman, MIT licence - [PyPI](https://pypi.org/project/nepali-to-roman)
  - `romonisedNepali`: npm, based on the ashesh.com.np converter - [GitHub](https://github.com/psuzn/romonisedNepali)
- ai4bharat-transliteration (IndicXlit) ships a self-hostable Flask HTTP server. It is not Nepal-built, and I did not confirm Nepali support from the page. - [PyPI ai4bharat-transliteration](https://www.pypi.org/project/ai4bharat-transliteration/1.0.0/)
- Non-Nepal hosted APIs that support Nepali MT: machinetranslate.org lists 18 MT APIs with Nepali support, including Sarvam AI, OpenAI, DeepSeek, IBM Watson and Qwen-MT. - [machinetranslate.org/nepali](https://machinetranslate.org/nepali)
- Wise-Yak is a Nepali AI company working on Nepali language tools, per a June 2026 feature. It has no product or API details, and search found nothing more on it. - [Nepal News, 2026-06-30](https://english.nepalnews.com/s/feature/as-ai-transforms-the-world-the-nepali-language-remains-stuck-at-the-door/)

### Inferences
- A hosted, self-serve Nepali transliteration API (Sarvam-style transliterate endpoint) is a real gap in the Nepal market.
- AI4Nepal's AI4Bharat link suggests its models may come from IndicTrans2 or IndicXlit lineage, but I could not confirm this.

### Gaps
- I could not see AI4Nepal or Diyo.AI pricing, docs, rate limits or model provenance, because they are behind sales.
- I could not find out whether Diyo.AI actually offers transliteration.

## What open Nepali LLM/translation models exist (with licences) that a developer could self-host?

### Takeaway
The self-hostable options are Arkios 1B (base and chat, Apache-2.0, trained from scratch, Nepali-English), Himalaya Gemma 4 E2B-it (Gemma-based SFT, no licence stated), HimalayaGPT 0.5B (licence unverified), and the IRIIS and NepBERTa encoder models (BERT/RoBERTa-class, licences not shown). The NepaliGPT and "Towards Nepali-language LLMs" papers do not clearly release weights.

### Cited Findings
- **Arkios 1B base / 1B chat.** Authors Sajal Regmi, Siddhartha Pudasaini and Chetan Phakami Pun; no affiliation is listed. 1.04B dense transformer trained from scratch on 150B tokens with a 65,536-token Devanagari-aware bilingual BPE tokenizer. Licence **Apache-2.0**. Paper arXiv 2608.30092, August 2026. Translation results (share of outputs in the correct target script): chat zero-shot 81% for ne->en and 58% for en->ne; base 5-shot 67% and 8%. Base chrF++ is 23.7 for ne->en and 16.7 for en->ne. It runs via Transformers, vLLM or SGLang, which give an OpenAI-compatible endpoint. - [HF arkios-1b-chat](https://huggingface.co/sajalregmi4/arkios-1b-chat); [HF arkios-1b-base](https://huggingface.co/sajalregmi4/arkios-1b-base); [HF tokenizer](https://huggingface.co/sajalregmi4/arkios-tokenizer); [HF paper page](https://huggingface.co/papers/2608.30092)
- **Himalaya Gemma 4 E2B-it**, plus a GGUF build. No licence on the card; the base model is google/gemma-4-E2B-it. 2026. - [HF](https://huggingface.co/himalaya-ai/himalaya-gemma-4-e2b-it)
- **himalaya-ai/nepali-sft-dataset**, a Nepali instruction-tuning dataset. - [HF dataset](https://huggingface.co/datasets/himalaya-ai/nepali-sft-dataset)
- **HimalayaGPT 0.5B-it**, at huggingface.co/himalaya-ai/himalayagpt-0.5b-it according to the host page. Licence not verified. - [ScaLabs](https://scalabs-cloud.pages.dev/inference/himalayagpt-0-5b)
- **NepaliGPT** (Pudasaini, Shakya et al.), arXiv 2506.16399, June 2025. It introduces the Devanagari Corpus and a 4,296-pair QA benchmark, with perplexity 26.32 and ROUGE-1 0.2604. The abstract page does not mention released weights; the paper itself is CC BY 4.0. A project site exists at nepaligpt.github.io. - [arXiv](https://arxiv.org/abs/2506.16399); [NepaliGPT Project](https://nepaligpt.github.io)
- **"Towards Nepali-language LLMs: Efficient GPT training with a Nepali BPE tokenizer"** (Shrestha, Pokharel et al.), arXiv 2512.14585, December 2025. GPT-2-style model with a 16k BPE tokenizer. The abstract page mentions no weights release. - [arXiv](https://arxiv.org/abs/2512.14585)
- **IRIIS Nepal BERT_Nepali_110M and RoBERTa_Nepali_110M** (paper arXiv 2411.15734). These are encoder models for classification and NER, not chat models. Licence not shown in search results. - [HF BERT_Nepali_110M](https://huggingface.co/IRIISNEPAL/BERT_Nepali_110M); [HF RoBERTa_Nepali_110M](https://huggingface.co/IRIISNEPAL/RoBERTa_Nepali_110M); [arXiv 2411.15734](https://arxiv.org/abs/2411.15734v2)
- **NepBERTa**, a pretrained Nepali encoder. Base licence not shown; one fine-tune of it is Apache-2.0. CHiPSAL 2026 systems still used NepBERTa as the text encoder. - [HF NepBERTa](https://huggingface.co/NepBERTa/NepBERTa); [ACL Anthology CHiPSAL author page](https://aclanthology.org/people/suman-shrestha/unverified/)
- **Community translation checkpoints**, e.g. itsbib/nepali-english-bidirectional. Provenance and licence not checked. - [HF](https://huggingface.co/itsbib/nepali-english-bidirectional)
- **English-Nepali-Tamang trilingual parallel corpus and MT benchmark**, EAMT 2026. - [ACL Anthology 2026.eamt-2.11](https://aclanthology.org/2026.eamt-2.11/)
- **CHiPSAL 2026** (2nd workshop, at LREC 2026, proceedings May 2026, 57 submissions). Its Nepali shared task was multimodal hate and sentiment in memes, not LLM or MT, with 12 of 15 system papers accepted. - [ACL Anthology CHiPSAL 2026](https://aclanthology.org/events/chipsal-2026/); [shared task site](https://sites.google.com/view/chipsal/shared-tasks_1/shared-task-1); [proceedings front matter](https://aclanthology.org/2026.chipsal-1.0.pdf)

### Inferences
- Arkios is the only open Nepali generative model I found with a clearly stated permissive licence and published evaluations.
- For production-quality Nepali MT or transliteration, non-Nepal open models probably remain the practical choice; examples are Meta NLLB and AI4Bharat IndicTrans2/IndicXlit, which cover Nepali. Their licences were not checked here.

### Gaps
- I could not verify licences for HimalayaGPT, Himalaya Gemma, IRIIS BERT/RoBERTa or NepBERTa, because the model-card licence fields were not visible.
- I could not confirm whether NepaliGPT weights are downloadable.

## Did the Nepal government's planned Nepali LLM make progress in 2026?

### Takeaway
Only at the pledge and budget stage. A multi-party "National Commitment" pledged a sovereign LLM (April 2026). The FY 2083/84 budget (May 2026) announced a Sovereign AI Compute Centre at Syuchatar, Kathmandu, with no reported amount or timeline. No government Nepali LLM had been built or released as of November 2026. The most concrete "national" LLM work is by Himalaya AI Labs, which says it is building HimalayaGPT for government apps and is reported to be working with the Kathmandu University lab.

### Cited Findings
- **National AI Policy 2082 (2025).** Approved by the Council of Ministers in August 2025. It has no explicit Nepali-LLM provision, only "support for local languages" and language technology in education, and no budget of its own (s.12). The National AI Centre was inaugurated in November 2025. Still pending: an AI law, a data security law, the AI Index, a sandbox and provincial centres; the AI Regulation Council's status is unclear. No AI-specific statute had been enacted as of November 2026. - [Nepal AI Labs policy explainer, "Last reviewed: November 2026"](https://nepalailabs.com/nepal-ai-policy)
- **Sovereign AI Compute Centre at Syuchatar**, announced in the May 2026 budget, with concessional compute for startups. No amount or timeline was reported. - [Nepal AI Labs](https://nepalailabs.com/nepal-ai-policy); [Kathmandu Post opinion, 2026-06-07](https://kathmandupost.com/columns/2026/06/07/nepal-s-ai-budget-the-right-instinct-and-the-trap-inside-it)
- A multi-party "National Commitment" includes plans to "develop a sovereign large language model" and AI literacy through Grade 12. - [Kathmandu Post, 2026-04-20](https://kathmandupost.com/national/2026/04/20/ai-is-transforming-nepal-s-workplaces-its-classrooms-haven-t-caught-up); [Spotlight Nepal, 2026-11-05](https://www.spotlightnepal.com/2026/11/05/ai-revolution-biggest-reset-our-time/)
- A June 2026 feature says building a national LLM is treated as an "extremely expensive and long-term" option, and that no work had been done on the policy's Regulatory Council, National AI Center or Centre of Excellence. This contradicts the Nepal AI Labs claim that the National AI Centre was inaugurated in November 2025. The Language Commission had only Rs 1.8 million for programs. A Nepal-India agreement on language AI and digital infrastructure was signed on 2026-06-06, with no terms published. - [Nepal News, 2026-06-30](https://english.nepalnews.com/s/feature/as-ai-transforms-the-world-the-nepali-language-remains-stuck-at-the-door/)
- A Kathmandu Post report (August 2026) says the Kathmandu University language-processing lab aims to build a Nepali-focused LLM, later adding Rai, Limbu and Newari. It says the effort is led by Himalaya AI, which is still seeking GPU and compute partners. This comes from a search-result summary only: the article URL returned "page does not exist" when fetched, so treat it as lower confidence. - [Kathmandu Post, 2026-08-22](https://kathmandupost.com/science-technology/2026/08/22/ku-info-lab-leads-efforts-to-digitise-and-preserve-nepal-s-indigenous-languages)
- A March 2026 roadmap piece lists "Nepali LLM live and open-source" as a future milestone, not a completed one. - [Karya Technology, 2026-03-25](https://karyatechnology.com/2026/03/25/nepal-at-the-ai-crossroads/)
- In May 2026 the government created a standalone Ministry of Science, Technology and Innovation. - [Wikipedia](https://en.wikipedia.org/wiki/Ministry_of_Science,_Technology_and_Innovation_(Nepal))

### Inferences
- There is no government-built Nepali LLM, API or playground, and no budget line specific to an LLM. The compute centre is the only funded-on-paper step, and it has no timeline.
- Himalaya AI Labs is positioning itself as the de facto "sovereign Nepali LLM" builder, but I found no government contract or procurement document confirming it.

### Gaps
- No official government document (MoCIT or MoSTI, or the budget speech text) was read directly. Budget facts come from secondary sources.
- The conflict over whether the National AI Centre was set up (Nepal AI Labs says yes, November 2025; the Nepal News June 2026 feature says no work had been done) is unresolved.
- I could not fetch the Kathmandu Post August 2026 article to confirm the KU and Himalaya AI link.
