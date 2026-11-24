"""Run the Stage 0 reader over every document in this test set and score it.

  python3 ml/docintel/testset/run_testset.py              # all documents (page 1 of each)
  python3 ml/docintel/testset/run_testset.py neb-notice-1 # only the ids given

Per document it writes results/: route-text.txt (the PDF's own text layer, when it has one), route-image-pass1.md
(the vision transcription), fields.json (generic schema), run.log (timings, tokens, finish reasons, layer check,
scores) and score.json. Then testset/results.json gathers every score. Needs llama-server running (see read_doc.py).

Routes per category:
  digital-pdf         text route -> fields; image route -> transcription; scored against the page-1 text layer
                      (a Preeti layer is converted to Unicode first)
                      plus Tesseract (nep+eng) on the rendered page, scored against the same key
  scanned-pdf, image  image route -> transcription + fields (a scan's own OCR layer, if any, is saved and checked,
                      never used as truth); tesseract route -> fields; hybrid route -> fields
  synthetic-degraded  image route -> transcription; tesseract + hybrid fields; image and Tesseract text scored
                      against answer-key.txt
"""

import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
READ = HERE.parent / "read_doc.py"
SCORE = HERE.parent / "score.py"
CATS = ["digital-pdf", "scanned-pdf", "image", "synthetic-degraded"]


def run(args: list[str], out: Path) -> None:
    res = subprocess.run([sys.executable, str(READ), *args, "--out", str(out)], capture_output=True, text=True)
    if res.returncode != 0:
        with open(out / "run.log", "a") as f:
            f.write(f"ERROR: {res.stderr.strip()[-400:]}\n\n")
        if "Cannot reach llama-server" in res.stderr:
            sys.exit("llama-server is down - stopping.")


def score(ref: Path, hyp: Path, preeti: bool) -> dict:
    args = [sys.executable, str(SCORE), str(ref), str(hyp)] + (["--preeti"] if preeti else [])
    res = subprocess.run(args, capture_output=True, text=True)
    return json.loads(res.stdout) if res.returncode == 0 else {"error": (res.stderr.strip() or "no output")[-200:]}


def ocr_routes(src: Path, out: Path, rec: dict, key: Path | None, preeti: bool) -> None:
    """Tesseract (OCR text -> model organises) and hybrid (image + OCR text) fields; Tesseract text scored if a key exists."""
    pages = ["--first", "1", "--last", "1"] if src.suffix.lower() == ".pdf" else []
    run([str(src), "--source", "tesseract", "--pass", "fields", "--schema", "generic", *pages], out)
    run([str(src), "--source", "hybrid", "--pass", "fields", "--schema", "generic", *pages], out)
    if key and (out / "route-tesseract.txt").exists():
        rec["score_tesseract"] = score(key, out / "route-tesseract.txt", preeti)


def detect(path: Path) -> str:
    out = subprocess.run([sys.executable, str(SCORE), "--detect", str(path)], capture_output=True, text=True).stdout
    return json.loads(out)["kind"]


def main() -> None:
    only = set(sys.argv[1:])
    summary_path = HERE / "results.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else {}
    for cat in CATS:
        for d in sorted(p for p in (HERE / cat).iterdir() if p.is_dir()):
            if only and d.name not in only:
                continue
            out = d / "results"
            shutil.rmtree(out, ignore_errors=True)
            out.mkdir()
            files = [p for p in d.iterdir() if p.suffix.lower() in (".pdf", ".jpg", ".png")]
            started = time.time()
            rec: dict = {"category": cat}
            if cat == "synthetic-degraded":
                img = next(p for p in files if p.suffix.lower() in (".jpg", ".png"))
                run([str(img), "--source", "image", "--pass", "text", "--max-tokens", "3000"], out)
                rec["score"] = score(d / "answer-key.txt", out / "route-image-pass1.md", False)
                rec["key"] = "answer-key.txt"
                ocr_routes(img, out, rec, d / "answer-key.txt", False)
            elif cat == "digital-pdf":
                pdf = files[0]
                run([str(pdf), "--source", "text", "--pass", "fields", "--schema", "generic", "--first", "1", "--last", "1"], out)
                run([str(pdf), "--source", "image", "--pass", "text", "--first", "1", "--last", "1", "--max-tokens", "3000"], out)
                kind = detect(out / "route-text.txt")
                rec["layer"] = kind
                rec["score"] = score(out / "route-text.txt", out / "route-image-pass1.md", kind == "legacy-preeti")
                rec["key"] = "text layer" + (" (Preeti converted)" if kind == "legacy-preeti" else "")
                # Tesseract on the rendered page too (no model call): scored against the same key
                run([str(pdf), "--source", "tesseract", "--pass", "text", "--first", "1", "--last", "1"], out)
                rec["score_tesseract"] = score(out / "route-text.txt", out / "route-tesseract.txt", kind == "legacy-preeti")
            else:
                src = files[0]
                layer = ""
                if src.suffix.lower() == ".pdf":
                    layer = subprocess.run(["pdftotext", "-l", "1", str(src), "-"], capture_output=True, text=True).stdout
                if len(layer.strip()) > 40:
                    # the scan's own layer: saved and checked only (no model call on this pass)
                    run([str(src), "--source", "auto", "--pass", "text", "--first", "1", "--last", "1"], out)
                    if (out / "route-text.txt").exists():
                        rec["layer"] = detect(out / "route-text.txt")
                    (out / "fields.json").unlink(missing_ok=True)
                run([str(src), "--source", "image", "--pass", "both", "--schema", "generic", "--first", "1", "--last", "1", "--max-tokens", "3000"], out)
                ocr_routes(src, out, rec, None, False)
                if rec.get("layer") in ("unicode-devanagari", "latin"):
                    # agreement with the scanner's OCR layer - NOT ground truth
                    rec["vs_ocr_layer"] = score(out / "route-text.txt", out / "route-image-pass1.md", False)
            rec["wall_s"] = round(time.time() - started, 1)
            log = (out / "run.log").read_text() if (out / "run.log").exists() else ""
            rec["log"] = [l for l in log.splitlines() if l.startswith(("page", "text-route", "text layer", "check", "ERROR", "fields", "source"))]
            with open(out / "run.log", "a") as f:
                f.write(f"score: {json.dumps(rec.get('score') or rec.get('vs_ocr_layer'), ensure_ascii=False)}\nwall: {rec['wall_s']}s\n")
            (out / "score.json").write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
            summary[d.name] = rec
            summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
            print(cat, d.name, rec.get("layer", ""), json.dumps(rec.get("score") or rec.get("vs_ocr_layer") or {}), rec["wall_s"], flush=True)


if __name__ == "__main__":
    main()
