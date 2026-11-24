# Tigg and a Nepal tax-and-law knowledge API (as of 2026-11-24)

Scope: (a) a factual profile of Tigg (tiggapp.com); (b) what an accounting platform like Tigg would need from Boli's "Nepal tax and law knowledge API", including sources, guarantees, analogues, risks and what the sibling vidhica repo already has. BS = Bikram Sambat. Hyphens only.

---

## 1. What is Tigg - product, users, integrations, API, IRD compliance, pricing, team, traction?

### Takeaway
Tigg is a Nepali cloud accounting + inventory + POS product from BIC Technology Pvt. Ltd. (Lalitpur), launched mid-2021 and co-founded by a chartered accountant. It claims 10,000+ users across 1,500 businesses, is IRD-approved for billing, has a Developer API only on its top plan, already ships "Tigg AI" for invoice and bill scanning, and in October 2026 signed an MoU with ICAN that gives qualifying CA firms free lifetime Basic access. That puts it in front of the exact accountants who ask tax-rate questions. It has no public tax-law Q&A feature.

### Cited Findings
**Company and team**
- Tigg is "a product of BIC Technology Pvt. Ltd." It began as a cloud management system called BIC Technology ("Business in Cloud") and was "built with Nepal's top accounting firms". The founders include "engineers, chartered accountants, lawyers, and management experts". Mission: "enable MSMEs to reap the benefits of digitalization". - [Tigg About Us](https://tiggapp.com/about-us)
- CEO Ramesh KC is a chartered accountant. Research started in 2017, development in 2020, and launch in mid-July 2021. Rs 22 million was raised and Rs 18 million spent by June 2022, with 560+ subscribers and about Rs 4.5-5 million in revenue at that point. KC cited the rule that servers must be in Nepal as a cost challenge. - [Kathmandu Post, 2022-06-27](https://kathmandupost.com/money/2022/06/27/tigg-cloud-based-accounting-software-making-strides)
- A job listing says the company was founded in 2020 and is headquartered in Manbhawan, Lalitpur. - [Kumarijob listing via search](https://www.kumarijob.com/bic-technology-pvt-ltd/68806-sales-associate)

**Product**
- Modules on the homepage:
  - double-entry accounting
  - inventory (multiple warehouses, bill of materials, production orders)
  - invoicing that "Complies with IRD Certified Billing Requirements" and integrates with CBMS
  - POS for retail and restaurants (tables, multi-store, barcode)
  - document upload
  - reports, including "tax and statutory"
  - **Tigg AI**: "AI-powered invoice and bill recording", which the site says is "115x faster than manual entry"
  - bank feed
  - mobile app

  Payroll, eSewa and Khalti are not mentioned on the homepage. - [tiggapp.com](https://tiggapp.com)
- The products are Tigg Accounting, Tigg Retail and Tigg Restro, plus Tigg AI and Bank Feed Integration. Certifications claimed: ISO/IEC 27001:2022, IRD Approved billing, ACCA Approved Employer (Gold). - [Tigg About Us](https://tiggapp.com/about-us)
- Bank feed: on 2025-03-10 Tigg and Global IME Bank launched what they describe as Nepal's first open-banking-API integration with third-party software. Statements reconcile daily, and Tigg's AI suggests account matches from bank descriptions. - [Global IME Bank blog](https://www.globalimebank.com/blog/?p=3627)
- A secondary source mentions "tax calculators" for SMEs. Not verified on Tigg's own site. - [Onlinekhabar English](https://english.onlinekhabar.com/tigg-cloud-accounting-nepal.html)
- The Google Play listing for the Tigg POS app shows an update dated 2026-11-18, and the accounting app one dated 2026-10-09. - [Google Play: Tigg](https://play.google.com/store/apps/details?id=app.tigg.bic&hl=en_US), [Google Play: Tigg POS](https://play.google.com/store/apps/details?id=com.bic.technology.tiggpos)

**Users and traction**
- The homepage claims "Over 10,000 Users Across 1,500 Businesses in Nepal". - [tiggapp.com](https://tiggapp.com)
- On 2026-10-07 ICAN and BIC Technology signed an MoU. Qualifying CA and Registered Auditor firms with renewed membership get free lifetime access to Tigg Basic, and ICAN students get an education version. - [Beema Post, Oct 2026](https://en.beemapost.com/2026/10/14752/) (the page failed to load on direct fetch; details are from the search-result summary)
- FinT Learning Hub runs "Tigg certification" training. - [Edusanjal](https://edusanjal.com/post/fint-learning-hub-launches-official-tigg-certification-training-in-nepal/)
- Awards: Best Startup at CAN Infotech 2022, and an ICT People's Choice award. - [Kathmandu Post](https://kathmandupost.com/money/2022/06/27/tigg-cloud-based-accounting-software-making-strides), [Tigg About Us](https://tiggapp.com/about-us)

**Pricing (NPR; VAT 13% extra; paid in advance)**
| Plan | 1 year | 3 years | 10 years ("lifetime") | Key limits |
|---|---|---|---|---|
| Basic | Rs 15,000 | Rs 35,000 | Rs 80,000 | 30,000 txns/yr, 20 AI scans/day, no inventory, no API |
| Standard | Rs 20,000 | Rs 50,000 | Rs 1,20,000 | inventory, 5,000 products, 50,000 txns |
| Professional | Rs 32,000 | Rs 80,000 | Rs 1,90,000 | POS, Daraz integration, 10,000 products, 2,00,000 txns, **Developer API (extra support fee)** |

- Add-ons: IRD Billing Feature Rs 15,000 one-time, an extra billing location Rs 5,000/yr, SMS Rs 0.99 each. Every plan has unlimited users. Read-only access is charged at 25% of the fee. Retail and Restro have their own Standard, Professional and Enterprise tiers. The trial is listed as both 14 and 15 days (the page contradicts itself). - [Tigg pricing](https://tiggapp.com/pricing)
- In 2022 the plans were Standard Rs 15,000/yr, Professional Rs 25,000/yr and Enterprise by negotiation. - [Kathmandu Post](https://kathmandupost.com/money/2022/06/27/tigg-cloud-based-accounting-software-making-strides)

**API**
- The homepage links a "Tigg Developer API", and the API is gated to the Professional plan. No public developer documentation turned up in search. - [tiggapp.com](https://tiggapp.com), [Tigg pricing](https://tiggapp.com/pricing)

**Competitors and context**
- Tally sells "Tally e-Billing Nepal Edition", which it describes as IRD-accredited and reporting to CBMS. It needs TallyPrime Release 7.0+. - [Tally help](https://help.tallysolutions.com/tally-e-billing-nepal-edition/)
- Busy's Nepal partner markets "IRD Approved Cloud eBilling". - [Busy Nepal partner](https://busysoftwarenepal-com.pages.dev/ird-verified-computer-billing-software)
- Swastik offers desktop and now web accounting. No IRD statement was found. - [IRD verified softwares blog](https://subharambhasewa.digitalpress.blog/ird-verified-softwares-in-nepal/) (low-quality source)
- A blog claims IRD's verified list holds 553 software products. Unverified. - same blog
- vidhica's competitor notes list Nepal Filing (TDS, VAT returns, payroll; "no AI features") and Khatapana as Nepal-native compliance and accounting tools. - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/non-tech/02-market-research/competitors-in-nepal.md`

### Inferences
- The ICAN MoU (Oct 2026) means a large share of Nepal's CA firms could be on Tigg Basic. Basic has no API, but Tigg itself would call Boli server-side, so plan gating does not matter for the integration.
- Tigg already has "AI" in its product language (bill OCR, bank matching). A tax-answer feature ("what TDS on this bill?") fits naturally next to bill scanning. The likely surfaces: a TDS or VAT suggestion at voucher entry, a help or ask box, and a statutory-reports explainer.
- Tigg's CEO is a CA, and its data must stay in Nepal (Kathmandu Post). Expect questions about data residency and whether customer ledger data leaves the country. Boli's open models and its own hosting are an advantage here, but only if inference runs in or near Nepal, or if no customer PII is sent.

### Gaps
- No public figures on Tigg's headcount, funding after 2022, ARR or churn.
- Tigg's Developer API docs are not public, so the endpoint style (REST or otherwise) and auth are unknown.
- eSewa and Khalti integrations are not confirmed. Payroll is not confirmed as a module.
- The full text of the ICAN MoU article could not be fetched (connection reset).
- Search turned up no independent reviews with substance. The iOS app is reported as 1.0/5 by one search summary, which is unverified.

---

## 2. What do Nepali accountants, CAs and SME owners ask that software cannot answer today?

### Takeaway
The hard questions are about **which rate applies to this payment, in this fiscal year, for this payee type**. Nepal's TDS table has dozens of payee-conditional rows. Rates and thresholds change every Finance Act, and FY 2083/84 changed a lot. IRD keeps adding new procedures mid-year (luxury fee, skill fee, VAT on electricity). Local-level taxes and the BS calendar add more traps. Software stores ledgers; it does not hold or explain the rule.

### Cited Findings
**TDS is conditional on the payee and the payment.** From the Baker Tilly Tax Fact 2025/26, Sec 88/89 table:
- Service fee to a VAT-registered provider: 1.5%. Service fee otherwise: 15%.
- Rent to an entity: 10%. House rent to a natural person: "No TDS" under the Income Tax Act, but "may require withholding tax as per the tax related laws of concerned Local Level". So rent to an entity can carry dual withholding, at IRD and at the local level.
- Carriage service to a VAT-registered person: 1.5%. Other carriage: 2.5%.
- Interest from BFIs to natural persons: 6%. Interest in other cases: 15%.
- Dividend (first distribution): 5%.
- Contract payments over Rs 50,000: 1.5%, with the threshold counted over the last 10 days to the same person on the same contract.
- Payments to non-residents: 5%.
- Windfall gains: 25%.
- E-commerce platform sales: 1%.

Source: [Baker Tilly Nepal Tax Fact 2025/26](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

**Final vs advance withholding changes whether income goes in the return.**
- Final withholding covers rent and interest to natural persons, dividends, meeting allowances, payments to non-residents and others. Deemed WHT applies even if the payer fails to withhold.
- TDS returns are due by the 25th of the following month. Interest on delays is 15% p.a.

Source: [Baker Tilly Tax Fact](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

**Deadlines are in BS.**
- Advance tax: 40% by Poush end, 70% by Chaitra end, 100% by Ashadh end.
- No instalments are needed if the estimated liability is below Rs 7,500.
- The annual return is due Asoj end, extendable 3 months to Poush end.
- Shortfall interest: 15% p.a.

The same PDF prints both "13th January 2025" and "14th January 2026" for Poush end 2082, and its footer still says "Income Tax Provisions for 2081/82". Even professional rate cards carry BS-to-AD conversion errors and stale labels. - [Baker Tilly Tax Fact](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

**VAT registration thresholds.**
- Turnover above Rs 50 lakh in 12 months for goods or carriage.
- Above Rs 30 lakh for services or mixed businesses.
- A business loan above Rs 10 lakh.
- A single import over Rs 10,000.
- Registration must happen within 30 days of the trigger.

Source: [Baker Tilly Tax Fact](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

**Amnesty and waiver windows are time-boxed one-offs.** Example from the Finance Act 2082: VAT penalties are waived if returns, VAT due and 25% of interest are paid by Poush end 2082. These are classic "does this apply to my client?" questions. - [Baker Tilly Tax Fact](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

**Secondary sources disagree on basic rates.** For FY 2082/83, blogs disagree on whether the 39% top band was new or carried over, and give conflicting TDS figures. A search summary noted that "the exact TDS schedule ... are operationalised by IRD circulars — verify before deducting". - [Nepacalc 2082/83](https://nepacalc.com/blog/nepal-income-tax-guide-2082-83/), [Onesphere Law](https://onespherelaw.com/annual-income-tax-rate-nepal/), [Lawalpine 2082/83](https://lawalpine.com/blog/budget-2082-83-tax-changes-in-nepal)

**FY 2083/84 brought large changes (Finance Act 2083, budget 2083-02-15 BS = 2026-05-29).**

Income tax:
- Personal tax-free/1% band doubled to Rs 10 lakh.
- Top rate cut from 39% to 29%. The reported bands are 1% / 10% / 20% / 27% / 29% above Rs 40 lakh. One source frames 29% as 27% plus a 2% surcharge.
- The single and married schedules were reportedly merged into one table.
- Donation deduction cap reportedly raised from Rs 1 lakh to Rs 3 lakh.

Capital gains:
- Advance CGT on listed shares changed to 7.5% (held over 365 days) and 10% (365 days or less), and became final.

TDS:
- Insurance agent TDS reportedly 15% to 20%.
- The 1.5% TDS on consumer committees was reportedly repealed.
- New 1% advance tax on ride-sharing driver payments.

VAT:
- 13% unchanged.
- 10% refund or discount for digital payments (sources disagree on the mechanism).
- 5% VAT on electricity above 50 units and on ride-hailing.

Excise and customs:
- Excise removed on 360 items; tobacco and alcohol up about 10%.
- Customs tiers cut from 11 to 7.
- Green Tax consolidated at customs.
- Gold import duty reportedly 10% to 20%.

Sources: [Lawalpine 2083/84](https://lawalpine.com/blog/budget-2083-84-tax-changes-in-nepal), [Attorney Nepal](https://attorneynepal.com/publications/tax-policy-changes-after-budget-2083-84), [Shankar Associates](https://www.saca.com.np/changes-in-income-tax-act-2058-of-nepal-by-finance-bill-2083/), [Nepal HRM](https://nepalhrm.com/blog/nepal-income-tax-slabs-2083-84/), [Nepacalc budget](https://nepacalc.com/nepal/nepal-budget/). All are secondary and several hedge on bill versus act. Treat the specific numbers as unverified against the gazette text.

**IRD issued new FY 2083/84 instruments after the Act** (titles from the IRD homepage):
- Directive on VAT on electricity service (1 Shrawan 2083)
- Exemption application forms under Finance Act 2083 (6 Shrawan 2083)
- Information booklet on exemptions and concessions (22 Bhadau 2083)
- Skill promotion fee procedure, 2083 (13 Asoj 2083)
- Luxury fee procedure, 2083 (13 Asoj 2083)
- An "urgent notice" on issuing bills at actual value (8 Mangsir 2083, i.e. about 2026-11-23)

Source: [IRD homepage](https://ird.gov.np)

**E-billing thresholds keep moving.**
- In April 2026 (directive of Baisakh 4) IRD lowered the threshold for mandatory electronic billing integrated with CBMS from Rs 250 million to Rs 200 million turnover. BFIs are reportedly exempt. - [Ratopati](https://english.ratopati.com/story/59617/businesses-with-transactions-exceeding-rs-200-million-must-now-issue-mandatory-electronic-bills), [ICT Frame](https://ictframe.com/?p=114453)
- A Tally help page cites a Rs 10 crore (restaurants Rs 5 crore) CBMS threshold. - [Tally help](https://help.tallysolutions.com/?p=191766)
- A budget 2083/84 summary cites a Central Invoice Monitoring System for turnover above Rs 100 million. - [Attorney Nepal](https://attorneynepal.com/publications/tax-policy-changes-after-budget-2083-84)

The three sources conflict, which is itself evidence of the confusion.

**Language barrier.** vidhica's market notes say IRD circulars "are almost always in Nepali only". - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/non-tech/02-market-research/foreign-investment-problem.md`

### Inferences
These are typical questions an API must answer. They are derived from the rule tables above, not from a survey.
- "TDS on a Rs 80,000 service bill from a non-VAT individual?" (15% versus 1.5%; depends on VAT status)
- "Rent to a company in Lalitpur: TDS at IRD and at the municipality?"
- "Is this contract over the Rs 50,000 10-day aggregate?"
- "Payroll TDS for Rs 18 lakh salary in FY 2083/84 vs 2082/83?"
- "VAT on an electricity bill above 50 units?"
- "Does the digital-payment VAT refund apply to my POS sale?"
- "When is Chaitra-end advance tax due in AD?"
- "Late TDS return interest for 2 months?"
- "Is this item still under excise after the 360-item removal?"
- "Do I have to be on CBMS at Rs 22 crore turnover?"

Every one of these depends on fiscal year and payee attributes, which a ledger system already knows. That makes a **structured call from inside Tigg** (with payee VAT status, amount, date and payment type) much more valuable than a chat box.

### Gaps
- No survey, ICAN forum dataset or published FAQ log of what Nepali accountants actually ask was found. The brother's (CA) conversations and Tigg support tickets are the best primary source to request.
- SSF contribution rates (employer and employee split) were not verified in this pass. No primary source was fetched.
- The final enacted FY 2083/84 TDS schedule could not be confirmed from a primary source.

---

## 3. Primary sources for Nepal tax law: where, what format, how often they change

### Takeaway
The canonical sources are IRD (Acts, Rules, Directives, Procedures, Notices, Finance Act), the Nepal Gazette (Rajpatra), MoF (budget speech, Finance Bill) and the Law Commission (consolidated Acts). They are mostly Nepali, often PDFs with broken Preeti / CID font encodings, and sometimes scanned.

Cadence:
- the budget on **Jestha 15** each year
- the Finance Act gazetted around **Ashadh end**
- the fiscal year from **Shrawan 1**
- then a stream of directives and procedures through the year, plus occasional ordinances

### Cited Findings
**IRD website structure.**
- Acts: Excise, Finance (आर्थिक ऐन), Income Tax, Liquor, Revenue Tribunal, VAT
- Rules for the same
- Directives: VAT, Income Tax, Excise, Digital Service Tax, CGT on land and house, Transfer Pricing, Casino Windfall, AML
- Procedures, including electronic invoice
- Notices and publications (tax bulletins)
- the taxpayer portal

The site is mostly Nepali with an English toggle, and pages are HTML plus PDF downloads. It has no dedicated "circulars" or "tax calendar" section. - [IRD](https://ird.gov.np)

**Finance Act 2083.** IRD lists "आर्थिक ऐन, २०८३" with Gazette publication date 2083/03/30, posted 31 Asar 2083 (about mid-July 2026). One guide says it took effect 1 Shrawan 2083 (17 July 2026). - [IRD](https://ird.gov.np), [Nepal HRM](https://nepalhrm.com/blog/nepal-income-tax-slabs-2083-84/)

**Budget date.** The FY 2083/84 budget was presented 15 Jestha 2083 (29 May 2026) by Finance Minister Dr. Swarnim Wagle. Outlay: NPR 2,124.34 billion. FY 2083/84 runs 1 Shrawan 2083 to 31 Ashadh 2084. - [Lawalpine](https://lawalpine.com/blog/budget-2083-84-tax-changes-in-nepal)

**PDF encoding (vidhica's findings).**
- Nepali legal PDFs are "born-digital with broken ToUnicode/Preeti (Identity-H CID) font maps", so text extraction returns Devanagari that "looks right but is silently corrupted". Others are scanned images.
- vidhica switched to **Sarvam Document Intelligence** (vision OCR) plus a quality gate that routes bad extractions to human review.

Source: local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/tech/admin/document-processing/document-pipeline-architecture.md`

**Annual update workflow (vidhica's design).** Finance Bill with the budget, then passage, then gazette, then a target of "all changes processed" on day 1 and a full quality-gate re-run on day 2. A specialised Finance Act parser detects amendment type (rate, threshold, text, new section, deleted) per section and writes `finance_act_change` rows. - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/tech/admin/content-management/annual-finance-act-update-workflow.md`

**Secondary rate cards.** Big-4-style "Tax Facts" (Baker Tilly) are useful seeds but carry errors (see §2). - [Baker Tilly](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

### Inferences
- The source tiers for the API: (1) Gazette and IRD Act, Rule and Finance Act text; (2) IRD directives, procedures and notices; (3) professional rate cards and commentary, used only as cross-checks and never cited as authority.
- Notices like "8 Mangsir 2083" show the corpus needs a **weekly IRD crawl**, not just a yearly Finance Act load.
- MoF (mof.gov.np) and the Law Commission (lawcommission.gov.np) were not fetched in this pass. The Law Commission's consolidated Acts would lag Finance Act amendments.

### Gaps
- No direct fetch of mof.gov.np, lawcommission.gov.np or the Rajpatra portal, so their formats and URLs are unconfirmed.
- Customs tariff schedule format (HS-code tables) and Department of Customs sources were not examined.
- Mid-year ordinances in 2026 were not checked.

---

## 4. What vidhica already has (read-only review) and what changes for Boli (open models only)

### Takeaway
vidhica ("Nucleus") already has a working, documented pipeline: Sarvam OCR, then an LLM structurer, then three-layer chunks, then translation, then embeddings into Cloudflare Vectorize. It has a version tree by BS year and a schema for Finance Act changes and practitioner caveats. As of 2026-08-07 only one document (the Income Tax Act 2058) was fully READY. Its models are OpenAI (gpt-4o-mini structuring and translation, text-embedding-3-small) and, in older docs, Claude. Boli would have to swap every model call for open models.

### Cited Findings
- README: "AI-powered legal and compliance intelligence platform for Nepal's CA, law, and finance community". Stack table lists "Primary AI: Claude (Anthropic)" and "Embedding: OpenAI embeddings". - local `/Users/nirajjha/Documents/nirajjha/vidhica/README.md`
- The authoritative pipeline doc says the real pipeline is "Sarvam Document Intelligence + a per-document Durable Object driven by alarms + OpenAI". The structurer uses `gpt-4o-mini` (JSON mode, temperature 0) with an "ORGANIZE only and copy" anti-hallucination rule. Translation goes through a single `callModel` seam. - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/tech/admin/document-processing/document-pipeline-architecture.md`
- Embeddings: `text-embedding-3-small` (1536d) into Vectorize `vidhica-laws`, with vector id equal to chunk id. - local `/Users/nirajjha/Documents/nirajjha/vidhica/workers/document-processor/README.md`
- Data model:
  - `document`: actType, version (BS year), isCurrent, status pipeline
  - `chunk`: three layers (PROVISION embedded, SECTION context, DEFINITION), fullTextNe as the source of truth, fullTextEn as the translation, translationStatus MACHINE/APPROVED/FLAGGED
  - `document_node`: legal hierarchy tree
  - `provision` (stable cross-version identity)
  - `glossary_term`, `caveat` (practitioner knowledge, embedded)
  - `finance_act_change`, `version_pointer`, `quality_gate_*`

  Source: same pipeline doc and local `/Users/nirajjha/Documents/nirajjha/vidhica/packages/db/src/schema/nucleus.ts`
- Corpus state 2026-08-07: "ITA-2058 ... the only READY document in the corpus", with 255 chunks. Headings are monolingual: 0 Nepali section titles, defined terms Devanagari only, and 223/255 refs with mixed-script digits. - local `/Users/nirajjha/Documents/nirajjha/vidhica/docs/nucleus-bilingual-headings.md`
- Versioning design: per-section version tree by FY. To answer for a past FY, fall back to the latest earlier version where a section is unchanged. The use cases are current compliance, historical due diligence and exam prep. - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/non-tech/03-product/law-versioning-system.md`
- Accuracy principles already written down:
  - always show Act, section, sub-section and version year
  - an explicit "I don't know"
  - confidence indicators

  These cite the 2024 Stanford finding that RAG legal tools still hallucinate. - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/non-tech/06-risks-and-challenges/legal-liability-and-ai-accuracy.md`
- Several older design docs (e.g. `srs/tech/admin/knowledge-base/overview.md`) are marked "SUPERSEDED (2026-10-10)". - local
- vidhica's market notes already priced an API for foreign law firms at $500-2,000/month per organisation. - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/non-tech/02-market-research/market-size-and-opportunity.md`

### Inferences
- Reusable as-is: the DO-per-document pipeline shape, the three-layer chunking, the provision identity across versions, `finance_act_change`, caveats and the quality gates.
- Must change for Boli:
  - the structurer and translator move to Boli's own open model
  - embeddings move to an open multilingual embedder; the 1536d index must be rebuilt
  - Sarvam OCR: Boli's `@repo/sarvamai` already wraps Sarvam document OCR. Whether a third-party OCR API is allowed under "only our own open models" is an owner decision. Boli's sibling docintel work (read_doc.py, the Preeti detector) is an alternative.
- The bigger gap for Tigg is not prose RAG. It is **structured rate tables** (TDS rows, slabs, thresholds, deadlines) extracted from the Acts with effective-from and effective-to dates. vidhica stores provisions as text chunks, not rate rows, so a rate layer has to be added on top.
- The corpus is thin (one READY Act in Aug 2026). The VAT Act 2052, the Finance Acts 2081-2083, the Excise Act, IRD directives and the TDS schedule all need to be ingested before a Tigg pilot.

### Gaps
- The current (Nov 2026) READY count in vidhica's production DB was not checked (read-only constraint; no DB access attempted).
- The licensing or ownership relationship between vidhica and Boli is unknown. It decides whether the Nucleus data can be reused.

---

## 5. What the API must guarantee for an accounting product, and what analogous products promise

### Takeaway
Accounting platforms buy **deterministic, versioned, cited rate lookups** with uptime and accuracy commitments (the Avalara model), not chat. Legal-AI products (Jhana and others) sell grounded answers with paragraph-level citations and verifier models. A Nepal API for Tigg should be both: a structured `rate` endpoint backed by curated tables, and an `ask` endpoint whose answers are grounded and cited, and which refuses when unsure. Both are keyed by fiscal year (BS and AD) and carry a change feed.

### Cited Findings
**Avalara AvaTax.**
- Markets "99.99% uptime, even at peak volume" (marketing language). A 2021 competitor comparison said the contractual floor was 99.5%.
- About 20 ms average calculation time (AWS Marketplace listing).
- Since 2015, an accuracy guarantee pays for losses from a negative audit finding caused by an inaccurate AvaTax result, up to the annual service fee. A 2021 comparison cites a 1x fee cap and a 10-day notice window.

Sources: [Avalara calculations](https://www.avalara.com/us/en/products/calculations.html), [Avalara 2015 guarantee](https://www.avalara.com/blog/en/north-america/2015/10/avalara-announces-first-of-its-kind-sales-tax-accuracy-guarantee.html), [TaxJar vs Avalara (archived 2021)](https://webcf.waybackmachine.org/web/20211017222731/https://www.taxjar.com/taxjar-vs-avalara), [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-u4c7qqzqd6cuc), [Avalara product terms](https://legal.avalara.com/product-terms.html)

**ClearTax (India).**
- Its GST APIs are filing and GSP integrations (upload invoices, file returns, GSTIN verification), not law Q&A.
- Access is by subscription, with pricing on request.
- GST 1.0 is deprecated in favour of GST 2.0, which shows that versioned API contracts matter.

Sources: [ClearTax docs](https://docs.cleartax.in/cleartax-docs/gst-gsp-api/introduction-to-gst-gsp-api), [ClearTax GST API access](https://cleartax.in/s/gst-api-access)

**Jhana (India legal AI).**
- Claims quotes, links and Standard Indian Legal Citations on every answer.
- A vendor listing says it cites at paragraph level, runs "verifier models to detect hallucinated, contradicted, or overruled citations", and has 16M+ documents.
- These are company claims. An independent study found general LLMs fabricate Indian case citations.

Sources: [Legaltech Hub: Jhana](https://www.legaltechnologyhub.com/vendors/jhana/), [arXiv 2508.09713](https://arxiv.org/pdf/2508.09713), [Bar & Bench](https://www.barandbench.com/law-firms/view-point/nothing-about-a-fake-citation-looks-fake)

**IRD e-billing.** IRD publishes API documentation for sending invoice data to CBMS, and licensed billing software must integrate. Tigg already integrates (homepage). - [Search summary of IRD CBMS docs](https://www.ird.gov.np/public/pdf/175356524.pdf), [tiggapp.com](https://tiggapp.com)

### Inferences (proposed specification; not sourced facts)

**Endpoints**
- `GET /v1/tax/rates?type=tds&payment=service_fee&payee.vat_registered=false&payee.kind=natural_person&date=2083-08-08` returns structured data.
- `POST /v1/tax/compute` takes amount + payee + date and returns tax amount, breakdown and rows used. It covers TDS, payroll slabs, advance-tax instalments and late interest. It is deterministic code over curated tables; **no LLM in the number path**.
- `POST /v1/tax/ask` answers free-text EN/NE questions with grounded RAG on open models. It returns an answer plus citations, confidence, and `needs_professional_review`. It refuses when retrieval is weak or the question is interpretive.
- `GET /v1/calendar/deadlines?fy=2083/84` returns VAT, TDS (25th of the next month), advance-tax instalments (Poush, Chaitra and Ashadh ends) and annual returns (Asoj end, with extension), each in BS and AD.
- `GET /v1/changes?since=` plus **webhooks** (`finance_act.published`, `directive.published`, `rate.changed`). Each change carries the affected rate ids, old to new values, and effective dates.
- `GET /v1/sources/{id}` serves the document metadata, gazette date, PDF hash, and section text in NE and EN.

**Each rate row carries**
- rate, base, threshold and aggregation rule (e.g. the Rs 50,000 contract threshold over 10 days)
- final vs advance withholding
- conditions (payee VAT status, residency, entity type)
- `effective_from` / `effective_to` in BS and AD, and `fiscal_year`
- `legal_basis` (Act, section, sub-section, Finance Act year)
- `source_url` plus a document hash and page number
- `verified_by` (CA reviewer) and `verified_at`
- `as_of` (corpus snapshot)
- `local_level_note` (e.g. municipal rent tax)

**Guarantees an accounting product would ask for**
- Pinned versioning by FY, so the same call for a past date always returns the same answer.
- An "as of" timestamp on every response.
- A published update SLA after gazette publication. vidhica's own internal target is 48 hours.
- Audit trail: every response id is retrievable later with the exact sources, for an IRD audit defence.
- Bilingual output.
- Latency: under 100 ms for `rates` and `compute` (cacheable tables), a few seconds for `ask`.
- Uptime commitment (Avalara anchors at 99.5-99.99%).
- Data-handling statement: no customer PII needed; Nepal residency if required.
- Pricing per call, or a flat monthly fee per platform, plus a revenue share per end-customer.

### Gaps
- No public price points were found for ClearTax, CCH AnswerConnect or Thomson Reuters to anchor per-call pricing. CCH AnswerConnect and Harvey were not researched in this pass.
- Avalara's current contractual SLA and guarantee terms were not retrieved (only marketing and 2015/2021 material).
- No information was found on what Tigg specifically asked for (format, volume, budget). Only the brother's report says they would "call the API" for "what rate, how much, how it works".

---

## 6. Risks: liability, the yearly Finance Act, ambiguity, need for CA review

### Takeaway
The main risks are (1) a wrong rate flowing silently into thousands of vouchers, which creates liability for Tigg's customers and reputational damage for Boli and Tigg; (2) missing a mid-year directive or a Finance Act change; (3) genuinely ambiguous law and conflicting secondary sources; (4) open-model hallucination on interpretive questions. Mitigations: curated tables verified by a CA, deterministic compute, citations, refusals, a capped accuracy commitment, and clear "information, not advice" terms.

### Cited Findings
- vidhica's own risk doc lists the failure modes: citing a section that does not say what is claimed, citing a stale version (2078 instead of 2082), missing a Finance Act change, and extrapolating. It names "Always Show the Source" as "the single most important accuracy feature". - local `/Users/nirajjha/Documents/nirajjha/vidhica/srs/non-tech/06-risks-and-challenges/legal-liability-and-ai-accuracy.md`
- Secondary sources disagree on FY 2082/83 and FY 2083/84 basics: whether 39% was new, whether 29% is a flat rate or 27% plus a 2% surcharge, whether the digital-payment VAT benefit is a refund or a discount, and three different CBMS thresholds. - [Nepacalc](https://nepacalc.com/blog/nepal-income-tax-guide-2082-83/), [Nepal HRM](https://nepalhrm.com/blog/nepal-income-tax-slabs-2083-84/), [Lawalpine](https://lawalpine.com/blog/budget-2083-84-tax-changes-in-nepal), [Attorney Nepal](https://attorneynepal.com/publications/tax-policy-changes-after-budget-2083-84), [Ratopati](https://english.ratopati.com/story/59617/businesses-with-transactions-exceeding-rs-200-million-must-now-issue-mandatory-electronic-bills)
- Even a reputable firm's tax fact sheet carries inconsistent BS/AD dates and a stale FY footer. - [Baker Tilly](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)
- Avalara caps its accuracy guarantee at the annual service fee, and only for audit findings. That is the industry template for bounding liability. - [Avalara 2015](https://www.avalara.com/blog/en/north-america/2015/10/avalara-announces-first-of-its-kind-sales-tax-accuracy-guarantee.html)
- Local-level taxes (municipal rent tax) sit outside IRD law, so an IRD-only corpus will give incomplete answers on rent. - [Baker Tilly](https://bakertilly.com.np/storage/download/1750310698_Tax_Fact_2025-2026.pdf)

### Inferences
- **CA-in-the-loop is mandatory** for the structured rate tables. The founder's brother is the natural first reviewer, and ICAN's tie-up with Tigg suggests CA-reviewed content would carry weight with Tigg's users.
- Never let an open model produce a rate number at request time. LLMs extract candidate rows offline from gazette text; a CA approves them; the API serves approved rows only. `ask` answers must quote approved rows or section text, and refuse otherwise.
- The highest-risk calendar windows:
  - Jestha 15 to Ashadh end (bill versus act; rates may change between the budget speech and the gazette)
  - the first weeks of Shrawan (directives and forms)
  - Asoj (new fee procedures this year)

  The API should mark rows as `proposed` (from the Finance Bill) vs `enacted` (gazetted).
- Contract terms to propose to Tigg: "information service, not tax advice"; an accuracy commitment capped at fees, covering approved rows only; Tigg shows the citation and as-of date in its UI.
- Positioning: no Nepal-specific tax API competitor turned up. KanoonPortal and others are legal research portals for humans (per vidhica's Aug 2026 competitor scan), and Indian players (CaseMine, Manupatra) could add Nepal (vidhica notes).

### Gaps
- No Nepali case law or regulation was found on liability of software vendors for wrong tax computation. Legal advice is needed.
- No data on how often IRD issues directives per year (cadence) beyond the dated list on its homepage.
- Whether Tigg would pay per call, flat fee or revenue share is unknown and should be asked directly.
