# Known Nepal-based AI speech/language players - self-serve status (checked 2026-11-23)

Method: I read public pages directly (WebFetch, plus curl for link lists and the Hugging Face public API). I did not sign up or submit any form. "Verified" means I read the page at that URL on 2026-11-23. "Claimed" means a company says it but I could not test it without signing up. Older facts are marked with their date.

## Q1. Does each company offer self-serve signup + API key + public docs + pricing for raw Nepali STT, TTS, translation or LLM? What launched since October 2026?

### Takeaway
None of the eight companies works like Sarvam. No one offers self-serve signup, an API key, public docs and published pricing for raw Nepali STT, TTS, translation or LLM all together. The closest are TingTing (self-serve with 100 free credits and a public developer page, but the API is for telephony and campaigns) and Koili.ai (self-serve TTS account with a "generate API access key" step, but no docs or pricing). Since October 2026 the real change is in open models, not in hosted APIs. Ampixa released Rani and Ratna ASR, Eka voice cloning, the Yak tokenizer and tiny-swar. Naamche released Swar voice cloning and a public Swar Playground.

### Cited Findings

**TingTing / Prixa (tingting.io)**
- Products today: Call Broadcast, Text, Forms, Agents, Connect and Omni. The homepage has an "Introducing TingTing Omni" banner. Verified - [tingting.io](https://www.tingting.io)
- Omni is an omnichannel inbox (WhatsApp, Facebook, Instagram, Email, TikTok, Web Chat) with AI replies, ticketing, a knowledge base and human takeover. Customer history import is marked "Soon". The page gives no launch date and no API. Omni is new since my October notes. Verified - [TingTing Omni](https://www.tingting.io/product/tingting-omni)
- Signup: self-serve at suite.tingting.io/login, "100 free AI credits to be used across TingTing Suite - no card required." Verified (page text; signup itself not tested) - [tingting.io](https://www.tingting.io)
- Credit rules: 1 voice credit = 30 seconds of call time (31-60 s = 2 credits). Outbound call = 1 credit per call, voice survey = 3 credits per call, AI-agent inbound call = 5 credits, 1 SMS credit = 1 message. Agents and Connect pricing is "contact the team". The FAQ contradicts itself on outbound calls (1 credit per call vs duration-based). No NPR or USD price per credit is published. Verified - [TingTing FAQs](https://www.tingting.io/faqs)
- Developer page: public endpoint list for auth (login, refresh token, generate or get API token, user details), phone numbers, campaigns (CRUD, contacts, attributes, voice assistance, **test voice**, demo calls, run campaign, reports) and OTP (send, list). It has no raw TTS or STT endpoint. Some sections ("How does it work?", "Programming language support") look copied from Modal's site. Verified - [For developers](https://www.tingting.io/for-developers)
- Playground-like tools: "Experience Center" (/experience-center), "Call Me Now" and a "Play Sample" for the "Ashmita" voice. Verified (links exist on the homepage) - [tingting.io](https://www.tingting.io)
- Voices: the October 2026 notes recorded 5 Nepali TTS voices. On 2026-11-23 the site names only "Ashmita" and the FAQ gives no list. Claimed/unverified for the count - [TingTing FAQs](https://www.tingting.io/faqs)
- History: four products (Voice, Text, Forms, Agent) launched in January 2026. Voice runs on the in-house "Riri" TTS engine - [NepaliTelecom, Jan 2026](https://www.nepalitelecom.com/2026/01/tingting-launches-four-ai-products-via-virtual-product-launch.html). Tingting Connect (AI call center) launched in March 2026 - [eKantipur, 2026-03-03](https://ekantipur.com/market/2026/03/03/en/ai-native-call-center-solution-tingting-connect-launched-23-53.html). TingTing is a subsidiary of Prixa Group - [ICT Samachar](https://ictsamachar.com/news/tingting-a-nepali-ai-startup-unifying-business-communication-on-a-single-platform/)

**Koili.ai (Virtual Technology Pvt. Ltd., Pokhara)**
- One product: Nepali text-to-speech ("Convert Nepali text to speech effortlessly"). No STT. Verified - [koili.ai](https://koili.ai)
- Self-serve signup: /accounts/signup/ is live and asks for first name, last name, email and password, with reCAPTCHA. "Registration is fast, easy, and free." Verified (form seen, not submitted) - [Koili signup](https://koili.ai/accounts/signup/)
- The homepage lists a "Generate API access key" step. The footer's Features, API, Demo, Blog, Careers, Partners, Privacy, Terms and Cookie links all point to "#" (placeholders), as in October. No docs, no pricing, no credit amount, no voice list. Footer says "© 2025". Verified - [koili.ai](https://koili.ai)
- Unchanged since October 2026.

**Ampixa Labs (ampixa.com, huggingface.co/ampixa)**
- The site lists 61 projects. Featured demos: Eka (Nepali voice cloning on a laptop CPU), Ratna ASR (35 MB Nepali STT that runs in the browser), Rani (open-weights Nepali ASR, offline and streaming), sanoTTS, Devanagari OCR and NepTTS-Bench + Arena. Also listed: Kala TTS, Pocket TTS, LimbuOCR, Barnamala, a forced aligner, NepaliG2P, Gurung and Limbu TTS, newsTTS and a Nepali Sign Language dataset. The site has no API, no pricing and no general signup. "Ratna streaming ASR" is noted as requiring login. Verified - [ampixa.com](https://ampixa.com)
- Dated changes on the site: 2026-08-27 Nepali RVC voices plus a browser runtime, 2026-09-10 sign-language dataset, 2026-10-23 Yak tokenizer on Hugging Face (blog post 2026-11-03), 2026-11-12 Eka voice cloner on Hugging Face. Verified - [ampixa.com](https://ampixa.com)
- The Hugging Face public API lists 25 public models under ampixa. None of them is NepaliConformer, which matches the October 401 errors: those repos are gone or private. Verified - [HF API ampixa models](https://huggingface.co/api/models?author=ampixa&limit=100)
- Model licenses from the Hugging Face API:
  - rani-asr: "other", auto-gated, created 2026-11-08
  - ratna-asr: "other", created 2026-11-09
  - sanoTTS: GPL-3.0, about 587k downloads, updated 2026-11-17
  - kalaTTS: CC-BY-SA-4.0
  - tiny-swar: CC-BY-SA-4.0, created 2026-11-22

  Verified - [HF rani-asr](https://huggingface.co/ampixa/rani-asr), [HF sanoTTS](https://huggingface.co/ampixa/sanoTTS)
- Hugging Face Spaces: real-nepali-tts is RUNNING. gurung-tts is in RUNTIME_ERROR. Also limbu-tts and nepali-rvc-tts. Verified - [HF API ampixa spaces](https://huggingface.co/api/spaces?author=ampixa&limit=100)

**Naamche Labs (naamchelabs.com)**
- Four open-weights models:
  - Swar: Nepali voice cloning, tagged "New", claims 2.92% pronunciation error on NepTTS-Bench
  - Kriti V1: 119M ASR, 24.08% WER, "#1 of 19"
  - Kriti Telephony: call-center and code-switched ASR, 32.38 NepTel WER
  - BarunLM 35M: research base language model, trained on 5.7B tokens

  The only call to action is a mailto link. No hosted API, no pricing, no signup. Verified - [naamchelabs.com](https://naamchelabs.com)
- **New: Swar Playground.** It offers 9 ready-made voices, about 30-second voice cloning, and Nepali, English or mixed text input. It says "Nothing to install." The page does not say whether login is needed, and it mentions no API or limits. Verified - [Naamche Playground](https://naamchelabs.com/playground)
- Swar on Hugging Face (Aarjan/swar): text-to-speech, CC-BY-SA-4.0, created 2026-10-22, built on F5-TTS / IndicF5. Kriti Telephony (Aarjan/kriti-telephony): MIT, updated 2026-11-09. Verified - [HF Aarjan/swar](https://huggingface.co/Aarjan/swar)
- Kriti V1: MIT, weights at huggingface.co/harrrshall/kriti. The page gives no API and no release date. Verified - [Kriti V1 page](https://naamchelabs.com/models/kriti-v1)

**TalkC.ai**
- B2B voice agents: inbound AI call answering, an Outbound Campaign Manager ("just launched", free to try), WhatsApp/Messenger AI, document reading, order taking and CRM lookups. It claims 70+ languages including Nepali. Verified - [talkc.ai](https://talkc.ai)
- Trial: "14-day free trial, no credit card". The form asks for name, work email and phone, and the team "will contact you within 2 hours". This is sales-assisted, not instant. Live demo line "Tara": +977 970-500-7877 (Nepali and English). Verified - [talkc.ai](https://talkc.ai)
- API: the homepage mentions a REST API with webhooks and shows an example endpoint, `POST /api/v1/calls/handle`. No docs link is listed. Verified - [talkc.ai](https://talkc.ai)
- **Published pricing:**
  - Inbound calls: $0.03-0.06 per minute, rounded up per started minute
  - Outbound and campaigns: $0.03-0.06 per answered minute (unanswered and failed calls are not billed)
  - The $0.03 rate needs a volume commitment
  - On top of that: a monthly platform fee and a one-time setup fee, quoted per business
  - Invoices in NPR, INR or USD
  - "Whole-business automation" is custom priced
  - API access is not mentioned in the plans

  Verified - [TalkC pricing](https://talkc.ai/pricing)

**Wiseyak / WiseAI (wiseyak.com)**
- WiseAI is a SaaS text and voice conversational AI. It offers SIP-based two-way voice query answering, "bidirectional text-to-speech and speech-to-text conversion", outbound survey campaigns and scheduled audio broadcasts. It claims native ASR and TTS in "local languages like Nepali and Maithili". Verified - [WiseAI product page](https://www.wiseyak.com/products/wiseai/)
- **New since October notes:** a "Try Now" link goes to wiseai.l.wiseyak.com/register, which returns HTTP 200 and is a JavaScript (Next.js) app. I did not render or submit it, so I cannot confirm what it gives you or whether API keys exist. No API docs and no pricing on the page. Verified (link exists); access claimed/unverified - [WiseAI product page](https://www.wiseyak.com/products/wiseai/)
- The rest of the site covers healthcare products (WiseMD EMR, diagnostics, retinopathy, pneumonia, telemedicine). Verified - [wiseyak.com](https://www.wiseyak.com)

**Paaila Technology (paailatechnology.com)**
- The live domain now serves a copy rebuilt by the Wayback Machine Downloader. It links to waybackmachinedownloader.com and says the "DEMO version includes only 4 pages" (home, waiter, pari, room-service). The AI subpages, such as /ai/nepali-text-to-speech/, show that tool's demo notice, not product content. The October "API coming soon" text is no longer there. Verified - [Paaila TTS page](https://paailatechnology.com/ai/nepali-text-to-speech/), [paailatechnology.com](https://paailatechnology.com)
- The homepage still names Nepali Speech Recognition, Nepali TTS and Query-AI Chatbot, but its content is from about 2017-2018 (awards 2017-2018, footer "2017"). No signup, no pricing, no API. Verified - [paailatechnology.com](https://paailatechnology.com)

**Diyo AI (diyo.ai)**
- The site now lists "Language Services" (Translation, Text to Speech, Speech to Text, Subtitling) and "Language Solutions" (Conversational AI, AI Agents, Agent Studio, AI Calling Assistants). Solutions shown: Golu, Muna and Juna. Language preservation work: NepSwor, YetiVoices. "API" is listed as one way to work. The footer has "Documentation" and "SDKs" entries with no URLs. Calls to action are "Talk to Diyo" or contact. No pricing. The page has a "Try Voice AI: Nepali" demo section. AI Calling Assistants is described as a direction still being explored. Verified - [diyo.ai](https://www.diyo.ai)
- **Agent Studio** (agentstudio.diyo.ai) is a self-serve, no-code website chat-agent builder: Google sign-up, "No credit card", "Get started free". It has no API key, docs or pricing, and it is not an STT, TTS or translation API. Verified - [Diyo Agent Studio](https://agentstudio.diyo.ai/)

**Market context**
- Foreign APIs with self-serve Nepali STT or TTS that the builder can use today: Sarvam (Saaras v3 Nepali STT) - [Sarvam](https://www.sarvam.ai/apis/speech-to-text/nepali); ElevenLabs - [ElevenLabs](https://elevenlabs.io/speech-to-text/nepali); Deepgram - [Deepgram](https://deepgram.com/product/speech-to-text/nepali); AssemblyAI - [AssemblyAI](https://www.assemblyai.com/languages/nepali)
- I found no press report of a Nepal-based self-serve speech or LLM API launched in October-November 2026 (search, 2026-11-23).

### Inferences
- TingTing is the only one that has all three of: instant signup, free credits and a public API reference. Its API, though, is for campaigns, calls and OTP. You can reach Nepali TTS only indirectly through "test voice" and campaigns, billed in call-time credits.
- Koili.ai is closest in shape to a raw TTS API, but with no docs, no pricing and placeholder links it looks unfinished or abandoned (footer still 2025).
- For raw Nepali STT and TTS, the open-weights releases (Ampixa, Naamche) are the practical option to self-host. Watch the licenses: Swar and Kala are CC-BY-SA, sanoTTS is GPL-3.0, Rani and Ratna are "other", and Kriti is MIT.
- Paaila looks inactive in software. Its domain seems to have lapsed and been rebuilt from archives.

### Gaps
- What the WiseAI register page leads to (free tier? API keys?) can only be learned by signing up, which was out of scope.
- TingTing's price per credit in NPR is not published.
- Rani and Ratna's "other" license terms were not read.
- Kriti V1's release date is not stated.
- Whether the Diyo "Try Voice AI" section is interactive was not tested.
- I did not check LinkedIn or Facebook posts (they need login).

## Q2. Which, if any, has a working web playground anyone can use without talking to sales?

### Takeaway
Free, no-sales playgrounds exist only at the open-model labs: Naamche's Swar Playground and Ampixa's demos and Hugging Face Spaces (real-nepali-tts is running). TingTing has an Experience Center, voice samples and self-serve trial credits. Koili lets you register for free. TalkC has a public demo phone line, not a web playground.

### Cited Findings
- Naamche Swar Playground: 9 voices, voice cloning, Nepali/English/mixed text, "Nothing to install". Login need not stated. Verified - [Naamche Playground](https://naamchelabs.com/playground)
- Ampixa: six featured demos (Eka, Ratna ASR, Rani, sanoTTS, Devanagari OCR, NepTTS-Bench), many on Hugging Face Spaces. Ratna streaming ASR needs login. Verified - [ampixa.com](https://ampixa.com). Space status on 2026-11-23: real-nepali-tts RUNNING, gurung-tts RUNTIME_ERROR. Verified - [HF API ampixa spaces](https://huggingface.co/api/spaces?author=ampixa&limit=100)
- TingTing: Experience Center, "Call Me Now", Ashmita voice "Play Sample". The 100 free credits need an account. Verified - [tingting.io](https://www.tingting.io)
- TalkC: live demo phone number, a /demo page and a "Watch Demo" video. No interactive playground. Verified - [talkc.ai](https://talkc.ai)
- Diyo: "Try Voice AI: Nepali" demo section on the homepage. Verified that it exists; not tested - [diyo.ai](https://www.diyo.ai)

### Inferences
- No commercial Nepal company offers a Sarvam-style developer playground (pick a model, type or upload, see the API call, copy a key).

### Gaps
- I did not test any demo in a real browser session, so "working" means listed and, for Hugging Face Spaces, reported RUNNING.

## Q3. Exact prices / credits where published

### Takeaway
Only TalkC publishes cash prices ($0.03-0.06 per minute, plus platform and setup fees quoted per business). TingTing publishes credit rules and 100 free credits, but no price per credit. Koili, Wiseyak, Diyo, Naamche, Ampixa and Paaila publish no prices.

### Cited Findings
- TalkC: inbound $0.03-0.06 per minute (rounded up), outbound $0.03-0.06 per answered minute, the $0.03 rate needs volume, plus monthly platform and setup fees, invoices in NPR/INR/USD, 14-day free trial. Verified - [TalkC pricing](https://talkc.ai/pricing)
- TingTing: 100 free AI credits with no card. 1 voice credit = 30 s. Survey 3 credits per call, AI inbound 5 credits, 1 SMS = 1 credit. Agents and Connect pricing via sales. Verified - [TingTing FAQs](https://www.tingting.io/faqs)
- Koili: "free" registration, no credit amount stated. Verified - [Koili signup](https://koili.ai/accounts/signup/)
- Diyo Agent Studio: "Get started free", "No credit card", no plans listed. Verified - [Diyo Agent Studio](https://agentstudio.diyo.ai/)

### Inferences
- TalkC's $0.03-0.06 per minute covers a whole voice-agent call (STT + LLM + TTS + telephony), so you cannot compare it directly with per-character TTS or per-hour STT API prices.

### Gaps
- TingTing's price per credit, and the amounts of TalkC's platform and setup fees, are not public.
