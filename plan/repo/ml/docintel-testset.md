# Document intelligence Stage 0: a real Nepali test set

| | |
|---|---|
| **App / module** | `repo/ml` (ml/docintel) |
| **Status** | Done |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Files** | ml/docintel/read_doc.py, ml/docintel/score.py, ml/docintel/testset/** (run_testset.py, make_degraded.py, REPORT.md, results.json, date-key.json) |

## What was asked

Build a small honest test set (25-40) of REAL, PUBLIC Nepali documents (no personal data), run the local reader
(Gemma 4 E4B on llama-server) on each with the right routes, score the image route against the text layer (CER and
digit accuracy), and write ml/docintel/testset/REPORT.md with numbers, failure patterns, the Preeti finding and next
steps. Add `--schema generic` to read_doc.py (bill stays default). No git.

## What "done" looks like

- testset/<category>/<id>/ each with source.md (URL, publisher, fetched date, licence note, why no personal data), the
  original file, results/ (route-text.txt, route-image-pass1.md, fields.json, run.log).
- score.py (stdlib) prints CER + digit accuracy.
- REPORT.md with collection table, per-doc table, aggregates, 3-5 failure examples, Preeti, recommendations.

---

## Tasks

- [x] **1. read_doc.py: `--schema generic`, `--out` result files**
  - Acceptance: bill schema still default; generic writes fields.json.
  - Verified: `read_doc.py samples/bill.pdf --source text --pass fields --out ...` printed every field and
    "check: line items add up to 1699.0, printed total 1699.0 -> OK"; run.log written. Generic schema produced valid
    JSON on all 39 documents (results/*/fields*.json). Also added --first/--last, --max-tokens, layer_check warning.
- [x] **2. score.py** (CER, digit accuracy, script-conversion count, Preeti detection + conversion)
  - Verified: toy case `क१२३ 4५` vs `क1२३ 45 x` printed digit_acc 1.0, digit_acc_exact 0.6, nep_to_eng 2;
    `--detect` labels all 20 text layers correctly (3 legacy-preeti, 7 junk-ocr, 1 latin, 9 unicode);
    `--preeti-convert` on neb-notice-1 printed "नेपाल सरकार / राष्ट्रिय परीक्षा बोर्ड".
- [x] **3. Collect 25-40 public documents with source.md**
  - Verified: 32 originals (11 digital, 16 scanned, 5 image) + 7 degraded = 39 folders, each with source.md;
    page-1 images of every scan/photo viewed for personal data; 7 candidates dropped for names/plates/symbol numbers.
    HF eval set not used: no licence stated.
- [x] **4. Synthetic-degraded pages from digital PDFs**
  - Verified: make_degraded variants printed sizes (e.g. ird-public-notice-dpi72 (612, 792)); answer-key.txt per page.
- [x] **5. Run every document, save results**
  - Verified: run_testset.py finished 39/39 (EXIT 0), no ERROR lines in any run.log after the rerun; image,
    tesseract and hybrid routes (the last two added by the lead mid-run) on every scan/photo/degraded page.
- [x] **6. REPORT.md**
  - Verified: ml/docintel/testset/REPORT.md written (278 lines), no en/em dashes (grep count 0).

## Notes / decisions

- First full run crashed at neb-notice-3 because read_doc.py was mid-edit by the lead (NameError ocr_text); rerun
  from scratch after the fix, with the lead's tesseract/hybrid routes added to the runner.
- Layer detection first used raw `-layout` text (spaces diluted ratios): nta-charter was called junk and dohs-rate
  latin. Fixed in score.py (ignore whitespace, Preeti threshold 0.12 of letters, common-English-word share) and the
  two documents rescored without new model calls.
- Word-export Unicode text layers are broken (24% / 15% CER vs hand keys); CER vs those keys is inflated, digit
  accuracy is not. Two hand-corrected keys added.
- Recommended (not done, to avoid colliding with the lead's read_doc.py edits): make `--source auto` fall back to OCR
  when layer_check is not ok.
