# Stage 0 document reader on real Nepali documents

Run on 2026-11-24 on the owner's Mac (Apple M5, 16 GB): llama-server with Gemma 4 E4B Q4_0 plus the vision add-on,
Tesseract 5.5.4 (`nep+eng`, `--psm 4`). Page 1 of every document. Everything here is reproducible with
`python3 ml/docintel/testset/run_testset.py` (results land in each document's `results/` and in `results.json`).

## The short version

- **39 documents, all public and official**: 11 digital PDFs, 16 scanned PDFs, 5 phone photos / image exports,
  7 synthetic-degraded pages. Sources are Nepal government sites (IRD, MoF, NEB, NTA, DoHS, Customs, DoFE, DoTM,
  Nepal Police, PPMO, ministries). No private person's data (see "What was collected").
- **Digits are the weak spot of the image route, and they fail in the worst way: silently.** Against keys whose digits
  are known to be right, the image route got **71.7% of digits right on digital PDFs** (405/565) and **77.9% on the
  degraded pages** (225/289). Most misses are DROPPED digits (letterhead phones, table cells, whole lines), but about
  1 digit in 13 is a real misread (35/565 and 23/289 substitutions), and those change meaning: `०.१९` became `०.११`,
  the VAT Act `२०५२` became `२०७२` everywhere, an amount `१,०४,९६,९०९` became `१,०४,१६,१०१`.
- **Dates on scans and photos: image route 5/16 right, Tesseract route 12/16, hybrid (image + Tesseract) 13/16.**
- **Tesseract beats the vision model at reading.** Tesseract CER 0.21 vs image 0.29 (mean, same 18 keyed pages) and
  digit accuracy 81.6% vs 73.8%; against two hand-corrected keys Tesseract's CER was **1.0%** and **8.2%** vs the
  image route's 6.2% and 14.2%. Tesseract takes about 1 second a page; the vision pass takes about 19.
- **The "text route" is not automatically right.** Three traps found on real government PDFs:
  1. **Preeti / legacy fonts** (3 of 11 digital PDFs, all from NEB and NTA): the text layer is ASCII gibberish
     (`g]kfn ;/sf/` for नेपाल सरकार). The text route then hands the model nonsense and the model INVENTS fields
     (a date `२०८०/०५/२८` that is not on the page). A converter fixes it (below).
  2. **Word-exported Unicode PDFs have a broken text layer** (7 of 8 Unicode PDFs): `ववभाग` for विभाग, `सूचर्ना` for
     सूचना, `िृवि` for वृद्धि. Measured against hand-corrected keys, the PDF's own text layer has a **CER of 24% and
     15%** - worse than Tesseract on the same page. Its DIGITS are right (value), but even there they are ASCII
     `2053` while the page prints `२०५३` (the font draws ASCII digits as Nepali ones).
  3. **Scanners add junk OCR layers** (7 of 16 scans): a Latin-script OCR of a Devanagari page, so the PDF "has a
     text layer" and `--source auto` picks the text route on pure garbage.
- **Speed**: median 19 s per page for the transcription (about 1,220 image tokens in, 550 out), 11-13 s for a fields
  pass. One transcription looped (repeated a sentence until the 3,000-token cap, 92 s).

## How it was measured

- **Image route** (`--source image --pass text`, 150 dpi): Gemma reads the pixels and transcribes to Markdown.
- **Tesseract route**: Tesseract text, scored directly (CER, digits); then Gemma turns it into fields
  (`--source tesseract`). **Hybrid**: Gemma gets the image AND the Tesseract text, told to trust OCR for digits and
  the image for words (`--source hybrid`). Both routes were added to `read_doc.py` by the lead during this run.
- **Text route** (digital PDFs): the PDF's own layer (`pdftotext`), Gemma only fills fields.
- **Fields** use the new `--schema generic` (document type, title, issuer, date + BS/AD, reference numbers, amounts,
  key points); the bill schema stays the default.
- **`ml/docintel/score.py`** (standard library): NFC, Markdown marks dropped, whitespace collapsed. CER = edit
  distance / reference length. Digit accuracy = 1 - edit distance between the digit strings (Devanagari and ASCII
  digits in reading order, compared by VALUE so `४` = `4`) / reference digits. It also counts digits whose script
  changed, detects Preeti / junk OCR layers (`--detect`) and converts Preeti to Unicode (`--preeti`).
- **Keys**: digital PDFs and their degraded copies are scored against the page's own text layer (Preeti converted).
  Because of trap 2 above, **CER against a Word-export key is inflated** (the model is penalised for being right);
  **digit accuracy is not** (the layer's digit values were right in both hand checks). Two pages got hand-corrected
  keys (`answer-key-corrected.txt`). Scans and photos have no text key: their date field was checked against a date
  read by eye (`date-key.json`, 16 documents).
- Script changes (`eng_to_nep`) are NOT counted as errors: on these PDFs the layer stores ASCII digits that the font
  prints as Devanagari, so writing `२०५३` for a layer `2053` is correct.

## What was collected

All files were fetched with curl on 2026-11-24 from official sites (homepage and notice-page download links). Each
folder's `source.md` records the URL, publisher, date, SHA-256, page count, text-layer kind, licence note and why it
has no personal data. No site states a licence; these are official notices published for public information, kept
here only as internal evaluation samples (not redistributed, not used for training).

Left out on privacy grounds (downloaded, read, then not kept in the set): an MoF notice listing named job candidates,
a customs notice listing vehicle plate numbers, an NEB result notice listing exam symbol numbers, two cabinet-decision
PDFs (appointments with home districts), an MoEST press release about a named private individual, and an OPMCM
release with a vehicle number. Kept documents name people only as office holders acting officially (signatories,
ministers, spokespersons) and print only office contacts.

Public OCR datasets: `himalaya-ai/nepali-deva-ocr-eval` has image + ground-truth pairs but **no licence stated**, so
it was not used; `EkaMind/Nepali-OCR` (MIT) is empty; the other Nepali OCR sets found either state no licence or are
gated behind terms, so none were taken. Claude in Chrome was not needed (curl and the sites' own pages were enough).

| Category | Id | Publisher | Pages | What it is |
|---|---|---|---|---|
| digital-pdf | dohs-bipad-report | Department of Health Services, Ministry of Health and Population | 5 | Disaster (flood) health activities situation report no. 48, 2083 Asoj 30 (प्रतिवेदन) |
| digital-pdf | ird-britacof-press | Inland Revenue Department, Ministry of Finance | 4 | Press release, 7th BRITACOF conference |
| digital-pdf | ird-forms-2081 | Inland Revenue Department, Ministry of Finance | 4 | BLANK application form templates under Finance Bill 2081 sections 22-26 (करदाताको निवेदनको ढाँचा) |
| digital-pdf | ird-invoice-notice | Inland Revenue Department, Ministry of Finance | 1 | Notice on issuing bills/invoices (बिल/बीजक जारी गर्ने सम्बन्धी सूचना) |
| digital-pdf | ird-public-notice | Inland Revenue Department, Ministry of Finance | 1 | Public notice on VAT exemption schedule changes under the Finance Act 2083 (सार्वजनिक सूचना) |
| digital-pdf | ird-taxday-press | Inland Revenue Department, Ministry of Finance | 9 | Press release, National Tax Day 2083 (राष्ट्रिय कर दिवस प्रेस विज्ञप्ति) |
| digital-pdf | mof-press-kartik30 | Ministry of Finance | 1 | Press release on Nepal's sovereign credit rating model score (प्रेस विज्ञप्ति कार्तिक ३०) |
| digital-pdf | neb-notice-1 | National Examinations Board, Sanothimi | 1 | Notice on class 11 subject registration (विषय दर्ता सम्बन्धी सूचना) - PREETI font text layer |
| digital-pdf | neb-notice-2 | National Examinations Board, Sanothimi | 1 | Notice on re-totalling results, pre-requisite course exam (पुनर्योगको नतिजा प्रकाशन सम्बन्धी सूचना) - PREETI font text layer |
| digital-pdf | neb-notice-3 | National Examinations Board, Sanothimi | 1 | Notice on SEE 2084 registration forms (रजिस्ट्रेसन फाराम भर्ने सम्बन्धी सूचना) |
| digital-pdf | nta-charter | Nepal Telecommunications Authority | 2 | Citizen charter: services, responsible desks and licence fees (नागरिक वडापत्र) - PREETI/Kantipur text layer |
| scanned-pdf | customs-auction-1 | Siraha Customs Office, Department of Customs | 2 | Auction notice for seized goods, 2083-07-18 (scan with a junk Latin OCR layer) |
| scanned-pdf | dofe-contract-notice | Department of Foreign Employment | 2 | Notice for EPS/G2G workers to come and sign contracts: documents list (scan with junk OCR layer) |
| scanned-pdf | dohs-rate-notice | Department of Health Services | 1 | Notice inviting price quotations for cost estimate, 2083-07-19 (scan with junk OCR layer) |
| scanned-pdf | dop-notice | Department of Printing (मुद्रण विभाग), Ministry of Communication and IT | 1 | Letter of intent to award a bid (newspaper-style clipping, 586x344 px image) |
| scanned-pdf | dop-press | Department of Printing (मुद्रण विभाग) | 2 | Press release on Kartik 2083 work: list of Gazette issues printed (scan with junk OCR layer) |
| scanned-pdf | dotm-newdoc43 | Department of Transport Management | 1 | Notice to public vehicle drivers, hotels/restaurants and passengers on roadside food quality (scan) |
| scanned-pdf | ird-bill-notice | Inland Revenue Department, Ministry of Finance | 1 | Urgent notice on issuing bills at real value (CamScanner scan) |
| scanned-pdf | ird-gift-procedure | Ministry of Finance (published by IRD) | 6 | Taxpayer incentive gift programme operating procedure 2083, 6 pages (scan with junk OCR layer) |
| scanned-pdf | moald-waaw | Ministry of Agriculture and Livestock Development | 1 | Joint message for World AMR Awareness Week 2026 (scan, 72 dpi declared) |
| scanned-pdf | police-archive-tender | Nepal Police Headquarters | 1 | Auction notice for old documents to be pulped (scan with junk OCR layer) |
| scanned-pdf | police-cmat | Nepal Police Staff College | 2 | Notice on filling the CMAT test request form 2027 (scan, page 2 is TU's public notice) |
| scanned-pdf | police-ration-tender | Nepal Police Headquarters | 2 | Sealed bid notice for patient rations and horse/dog feed (सिलबन्दी बोलपत्र) |
| scanned-pdf | police-tender-amend | Nepal Police Headquarters | 1 | Amendment notice to an invitation for bids, 2083-07-28 (low-resolution scan) |
| scanned-pdf | ppmo-3117 | Nepal APF Hospital (published on PPMO) | 1 | English amendment notice to a bid (anaesthesia equipment) - scan with a reasonable English OCR layer |
| scanned-pdf | ppmo-3139 | Krishnapur Municipality (published on PPMO) | 1 | Sealed quotation notice for hiring tipper/excavator (scan with a Unicode OCR text layer) |
| scanned-pdf | tourism-press | Ministry of Culture, Tourism and Civil Aviation | 1 | Press release on the minister's meeting with the Indian ambassador (scan with junk OCR layer) |
| image | dotm-whatsapp | Department of Transport Management | 3 | Notice on listing service providers for vehicle safety equipment (phone photo sent over WhatsApp, page 1 of 3) |
| image | moald-photo | Ministry of Agriculture and Livestock Development | 1 | Notice inviting quotes for digital signatures (phone photo of a printed notice) |
| image | mocit-1000036898 | Ministry of Communication and Information Technology | 1 | Notice cancelling a film-grant notice (phone camera image) |
| image | moewri-activities | Ministry of Energy, Water Resources and Irrigation | 2 | Press release: main activities of the last 15 days, page 1 (phone photo) |
| image | moics-press29 | Ministry of Industry, Commerce and Supplies | 1 | Press release on the 31st CII Partnership Summit (single page image exported from Canva) |
| synthetic-degraded | dohs-bipad-report-photocopy | Department of Health Services, Ministry of Health and Population | 1 image | Disaster (flood) health activities situation report no. 48, 2083 Asoj 30 (प्रतिवेदन) |
| synthetic-degraded | ird-britacof-press-dpi72-jpeg50 | Inland Revenue Department, Ministry of Finance | 1 image | Press release, 7th BRITACOF conference |
| synthetic-degraded | ird-invoice-notice-dpi100-jpeg40 | Inland Revenue Department, Ministry of Finance | 1 image | Notice on issuing bills/invoices (बिल/बीजक जारी गर्ने सम्बन्धी सूचना) |
| synthetic-degraded | ird-public-notice-dpi72 | Inland Revenue Department, Ministry of Finance | 1 image | Public notice on VAT exemption schedule changes under the Finance Act 2083 (सार्वजनिक सूचना) |
| synthetic-degraded | ird-taxday-press-dpi100 | Inland Revenue Department, Ministry of Finance | 1 image | Press release, National Tax Day 2083 (राष्ट्रिय कर दिवस प्रेस विज्ञप्ति) |
| synthetic-degraded | mof-press-kartik30-jpeg25 | Ministry of Finance | 1 image | Press release on Nepal's sovereign credit rating model score (प्रेस विज्ञप्ति कार्तिक ३०) |
| synthetic-degraded | neb-notice-3-rot-blur | National Examinations Board, Sanothimi | 1 image | Notice on SEE 2084 registration forms (रजिस्ट्रेसन फाराम भर्ने सम्बन्धी सूचना) |


## Results per document

CER and digits are page 1 against the key described above ("-" = no text key). "Date" = the fields pass of each
route against the hand-read date: image / Tesseract / hybrid. Seconds and tokens are the image-route transcription.
The two 300+ s timings coincide with other jobs hitting the same llama-server; their fields passes took about 11 s.

| Category | Id | Text layer | Image CER | Image digits | Tess CER | Tess digits | Date: image / tess / hybrid | Image pass s | Tokens in/out |
|---|---|---|---|---|---|---|---|---|---|
| digital-pdf | dohs-bipad-report | unicode-devanagari | 0.32 | 14/17 | 0.29 | 11/17 | - | 16.5 | 1220/381 |
| digital-pdf | ird-britacof-press | unicode-devanagari | 0.25 | 19/28 | 0.21 | 18/28 | - | 19.1 | 1230/439 |
| digital-pdf | ird-forms-2081 | unicode-devanagari | 0.34 | 50/65 | 0.23 | 46/65 | - | 23.0 | 1230/546 |
| digital-pdf | ird-invoice-notice | unicode-devanagari | 0.27 | 5/6 | 0.22 | 6/6 | - | 9.8 | 1230/172 |
| digital-pdf | ird-public-notice | unicode-devanagari | 0.31 | 82/99 | 0.18 | 99/99 | - | 20.7 | 1230/620 |
| digital-pdf | ird-taxday-press | unicode-devanagari | 0.14 | 20/25 | 0.05 | 24/25 | - | 16.6 | 1220/550 |
| digital-pdf | mof-press-kartik30 | unicode-devanagari | 0.27 | 22/23 | 0.21 | 14/23 | - | 8.3 | 1230/286 |
| digital-pdf | neb-notice-1 | legacy-preeti | 0.10 | 43/44 | 0.06 | 39/44 | - | 9.5 | 1230/301 |
| digital-pdf | neb-notice-2 | legacy-preeti | 0.11 | 28/32 | 0.10 | 23/32 | - | 9.4 | 1230/299 |
| digital-pdf | neb-notice-3 | unicode-devanagari | 0.46 | 57/91 | 0.28 | 80/91 | - | 27.0 | 1220/723 |
| digital-pdf | nta-charter | legacy-preeti | 0.50 | 65/135 | 0.34 | 94/135 | - | 27.2 | 1220/729 |
| scanned-pdf | customs-auction-1 | junk-ocr | - | - | - | - | WRONG 2083/07/15 / ok / ok | 28.2 | 1230/935 |
| scanned-pdf | dofe-contract-notice | junk-ocr | - | - | - | - | WRONG 2073/07/16 / WRONG 2083/7816/1146 / WRONG 2083/07/16 | 23.6 | 1220/628 |
| scanned-pdf | dohs-rate-notice | junk-ocr | - | - | - | - | WRONG 2083/07/11 / ok / ok | 20.7 | 1220/427 |
| scanned-pdf | dop-notice | none | - | - | - | - | WRONG 2080/03/26 / WRONG 205830716 / ok | 13.7 | 1220/301 |
| scanned-pdf | dop-press | junk-ocr | - | - | - | - | WRONG 2083/07/01 / ok / ok | 24.3 | 1220/542 |
| scanned-pdf | dotm-newdoc43 | none | - | - | - | - | - | 19.3 | 1220/485 |
| scanned-pdf | ird-bill-notice | none | - | - | - | - | ok / ok / ok | 8.9 | 1220/152 |
| scanned-pdf | ird-gift-procedure | junk-ocr | - | - | - | - | - | 15.1 | 1220/372 |
| scanned-pdf | moald-waaw | none | - | - | - | - | - | 91.6 | 1140/3000 (cut off) |
| scanned-pdf | police-archive-tender | junk-ocr | - | - | - | - | - | 21.2 | 1230/589 |
| scanned-pdf | police-cmat | none | - | - | - | - | ok / ok / ok | 14.5 | 1220/347 |
| scanned-pdf | police-ration-tender | none | - | - | - | - | WRONG 2073/08/02 / ok / ok | 26.9 | 1220/764 |
| scanned-pdf | police-tender-amend | none | - | - | - | - | WRONG 208316 / ok / ok | 13.9 | 1152/337 |
| scanned-pdf | ppmo-3117 | latin | - | - | - | - | ok / ok / ok | 37.7 | 1220/1124 |
| scanned-pdf | ppmo-3139 | unicode-devanagari | - | - | - | - | WRONG 2080/03/04 / WRONG 2083 / WRONG 2083/10/08 | 25.5 | 1152/721 |
| scanned-pdf | tourism-press | junk-ocr | - | - | - | - | - | 16.3 | 1230/414 |
| image | dotm-whatsapp | none | - | - | - | - | WRONG 2063/07/11 / ok / ok | 318.3 | 1220/520 |
| image | moald-photo | none | - | - | - | - | WRONG 2083/07/11 / ok / ok | 9.6 | 1191/169 |
| image | mocit-1000036898 | none | - | - | - | - | ok / ok / ok | 7.8 | 1207/122 |
| image | moewri-activities | none | - | - | - | - | ok / ok / ok | 316.6 | 1220/477 |
| image | moics-press29 | none | - | - | - | - | WRONG 2083/03/29 / WRONG 2083/100128/1147 / WRONG 2083/10/28 | 29.5 | 1230/630 |
| synthetic-degraded | dohs-bipad-report-photocopy | none | 0.35 | 15/17 | 0.33 | 12/17 | - | 15.9 | 1220/371 |
| synthetic-degraded | ird-britacof-press-dpi72-jpeg50 | none | 0.28 | 16/28 | 0.26 | 14/28 | - | 17.1 | 1230/426 |
| synthetic-degraded | ird-invoice-notice-dpi100-jpeg40 | none | 0.27 | 5/6 | 0.22 | 6/6 | - | 9.8 | 1230/170 |
| synthetic-degraded | ird-public-notice-dpi72 | none | 0.33 | 82/99 | 0.21 | 92/99 | - | 21.6 | 1230/607 |
| synthetic-degraded | ird-taxday-press-dpi100 | none | 0.15 | 20/25 | 0.04 | 22/25 | - | 20.8 | 1220/577 |
| synthetic-degraded | mof-press-kartik30-jpeg25 | none | 0.28 | 21/23 | 0.20 | 16/23 | - | 12.4 | 1230/280 |
| synthetic-degraded | neb-notice-3-rot-blur | none | 0.51 | 66/91 | 0.35 | 81/91 | - | 25.7 | 1220/757 |

Text route (digital PDFs): fields JSON was valid 11/11; 22 of 24 numbers it extracted appear in the page's digits.
The two misses are both Preeti: an invented date on `neb-notice-1` and a stray `66` on `nta-charter`.

## Aggregates

Digit counts are pooled (all digits of all pages in the group); CER is the mean over pages.

| Group | Pages scored | Image CER | Tesseract CER | Image digits right | Tesseract digits right |
|---|---|---|---|---|---|
| digital-pdf (text-layer key) | 11 | 0.278 | 0.196 | 405/565 = 71.7% | 454/565 = 80.4% |
| synthetic-degraded (text-layer key) | 7 | 0.310 | 0.232 | 225/289 = 77.9% | 243/289 = 84.1% |
| all keyed pages | 18 | 0.291 | 0.210 | 630/854 = 73.8% | 697/854 = 81.6% |
| Preeti pages only (converted key, the cleanest keys) | 3 | 0.24 | 0.17 | 136/211 = 64.5% | 156/211 = 73.9% |
| 2 hand-corrected keys (ird-invoice-notice, mof-press-kartik30) | 2 | 0.062, 0.142 | 0.010, 0.082 | 27/29 | 20/29 |
| same 2 pages, PDF text layer vs hand key | 2 | text layer CER 0.237, 0.146 | | text layer digits 29/29 | |

What kind of digit error (digital + degraded pages, value comparison):

| Route | Digits | Misread (substituted) | Dropped | Inserted |
|---|---|---|---|---|
| image, digital-pdf | 565 | 35 (6.2%) | 122 | 3 |
| image, degraded | 289 | 23 (8.0%) | 41 | 0 |
| Tesseract, digital-pdf | 565 | 43 (7.6%) | 18 | 50 |
| Tesseract, degraded | 289 | 10 (3.5%) | 7 | 29 |

The image route mostly LEAVES THINGS OUT (letterheads, phone numbers, table rows: its output is on average 89% of
the key's length; `neb-notice-3` and its blurred copy only 68%). Tesseract keeps everything and adds junk digits from
seals and signatures. On the mof page all 9 Tesseract "errors" were inserted junk; every real number was right.

Fields, date right (scans + photos, 16 hand-checked dates): **image 5/16, Tesseract 12/16, hybrid 13/16**. Fields
JSON was valid on every call (grammar-forced). Calendar: on `moics-press29` the image and hybrid routes labelled a BS
date (`२०८३।०७।२९`) as AD.

Speed and tokens (page 1, Mac M5; medians, which the 2 contention outliers do not move):

| Pass | Median s | Mean tokens in / out |
|---|---|---|
| Image transcription | 19.3 | 1,217 / 546 |
| Image fields | 11.9 | 1,299 / 387 |
| Tesseract OCR alone | about 1 | - |
| Tesseract fields (Gemma on OCR text) | 10.8 | 740 / 370 |
| Hybrid fields (image + OCR text) | 12.8 | 1,975 / 367 |
| Text-route fields (digital PDFs) | 18.6 | 1,003 / 491 |

The image always costs about 1,220 tokens whatever the dpi (72 dpi pages included), so resolution is not the lever.
One transcription was cut off: `moald-waaw` looped on one sentence until the 3,000-token cap (92 s).

## Failure patterns, with examples

1. **Digit misreads that look perfectly plausible** (image route). The output reads fluently, so nobody would notice.
   - `mof-press-kartik30`: the rating rose "by `०.१९`"; the model wrote `०.११`. Tesseract read `०.१९`.
   - `ird-public-notice`: "VAT Act, `2052`" (printed `२०५२`) became `२०७२` every time it appears, and the same page
     degraded to 72 dpi did the same. `ird-invoice-notice`: Rules `२०५३` became `२०७३`. Five-to-seven is systematic.
   - `neb-notice-2` (Preeti, clean key): dates `२०८३/०७/१८` and `२०८३/०७/१९` became `०७/१६` and `०७/११`.
   - Dates on scans: `dofe-contract-notice` `२०८३/०७/१८` -> `२०७३/०७/१६`; `police-ration-tender` `२०८३` -> `२०७३`;
     `dotm-whatsapp` `२०८३` -> `२०६३`; `moics-press29` `०७` -> `०३`. Same confusions as the synthetic bill
     (८/७/६, ९/१, ५/७).
2. **Numbers that contradict their own words.** `dop-notice` prints `रु. १,०४,९६,९०९।- (एक करोड चार लाख छ्यानब्बे
   हजार नौ सय नौ रुपियाँ मात्र)`. The image route gave `1,04,16,101` and copied the words; the words say 96,909.
   Tesseract and hybrid gave 10,496,909. A words-vs-figures check would have caught it.
3. **Invented fields from a bad text layer** (Preeti). On `neb-notice-1` the text route was given
   `@)*#÷)^÷@#` (= `२०८३/०६/२३`) and returned the date `२०८०/०५/२८`, which appears nowhere; title and key points
   came back as Preeti gibberish. The image route on the same page scored CER 0.10 and 43/44 digits.
4. **Dropped and "corrected" text.** On `ird-britacof-press` the letterhead phone, URL and address vanished and
   `BRITACOF` became `BRITACF`; on `neb-notice-3` a third of the page is missing. On `moald-waaw` the model repeated
   one sentence until the cap.
5. **Separators.** The danda `।` used as a date separator (`२०८३।०८।०४`) is read by Tesseract as the digit `१`, and the
   hybrid route then trusts it: `ppmo-3139` came back `२०८३/१०/०८`, `moics-press29` `२०८३/१०/२८`. Normalising `।`
   between digits before trusting OCR fixes this class.

## The Preeti finding

- 3 of 11 digital PDFs (NEB x2, NTA) are typed in Preeti / Kantipur / Ganess / Himalli. `pdffonts` names the font;
  the text layer is Latin key codes. Nothing in the old `read_doc.py` noticed: `--source auto` used the gibberish.
- `read_doc.py` now runs a layer check (`legacy-font` by font name, `no-devanagari` for English or junk OCR) and
  prints a warning and logs it; it still uses the layer (see recommendation 1).
- `score.py --preeti-convert` turns a Preeti layer into Unicode (key map plus the two reordering rules: the short
  `ि` typed before its consonant, the reph `र्` typed after its syllable; half-letter + `ा` folds into the full
  letter). On the NEB notice it gives clean text (`नेपाल सरकार / राष्ट्रिय परीक्षा बोर्ड / परीक्षा नियन्त्रण
  कार्यालय ...`) with correct Nepali digits. Known gap: English words typed in an English font inside a Preeti page
  are converted too (`GPA` -> `न्एब्`) because `pdftotext` does not say which font each word used; numbers in an
  English font are kept as they are.
- Converted Preeti is the CLEANEST key in this set: better than the Word-export Unicode layers.

## Recommendations, in order

1. **Route by checking the layer, not by its existence.** Use the PDF's own text only when `layer_check` says `ok`;
   `legacy-font` -> convert (Preeti converter, move it from score.py into a small shared module) and then text route;
   `no-devanagari` on a page that is mostly an image -> treat as a scan. Also detect Word-export breakage (cheap
   tests: `वव` at word start, `र्न` before a vowel sign, `ि` before a space) and send those pages to OCR for the words
   while keeping the layer's digits.
2. **Make OCR the reader and Gemma the organiser.** On these pages Tesseract (`nep+eng`) is more accurate than the
   4B vision model, 20x faster and nearly free. Hybrid gave the best fields (13/16 dates). Keep the image for layout,
   tables and when OCR confidence is low.
3. **Add checks and zoomed re-asks for every number.** Cross-check each date / amount / reference between two readers
   (image vs OCR); amounts against their words (`अक्षरेपी`); dates must be valid BS dates near the publish date;
   totals must add up. On disagreement, crop the number's line at 300 dpi and ask again (Tesseract gives word boxes
   with `tsv` output for the crop). Normalise `।` between digits to `/` before using OCR digits.
4. **Try a dedicated document OCR next**: PaddleOCR-VL (the lead is adding it), and Surya; both read Devanagari and
   give boxes. Run them through this same set: `run_testset.py` and `score.py` are ready.
5. **Bigger vision models on a GPU** (Qwen3-VL 8B+, Gemma 4 larger sizes) only after 1-3; E4B's dropping and
   looping look like capacity limits, not prompt problems (more image tokens did not help on the bill).
6. **Fine-tune only if the above plateaus**, and then on digits and dates first: the failure is narrow (८/७/६, ५/७,
   ९/१) and synthetic pages with known text are easy to make (`make_degraded.py` shows how).
7. **Grow the key, honestly.** Hand-correct 10-20 more pages (start with the Preeti and scanned ones), add multi-page
   documents and tables, and ask the himalaya-ai maintainers for a licence before using their eval set.

## Files

- `ml/docintel/read_doc.py` - `--schema generic`, `--first/--last`, `--max-tokens`, `--out` (route-text.txt,
  route-image-pass1.md, fields.json, run.log), layer check; tesseract / hybrid routes added by the lead.
- `ml/docintel/score.py` - CER, digit accuracy, script changes, `--detect`, Preeti conversion.
- `ml/docintel/testset/run_testset.py` - runs and scores everything; `make_degraded.py` - rebuilds the degraded pages.
- `ml/docintel/testset/<category>/<id>/` - `source.md`, the original file, `results/` (and `answer-key.txt` for
  degraded pages, `answer-key-corrected.txt` for the two hand-checked pages).
- `ml/docintel/testset/results.json` (all scores), `date-key.json` (hand-read dates).
