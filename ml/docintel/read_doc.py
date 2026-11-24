"""Read a document (image or PDF) with the local Gemma 4 vision model on llama-server.

Stage 0 of the document intelligence path (docs/artifacts/document-intelligence.html):
  pass 1 - faithful transcription of the page as Markdown (Devanagari kept as Devanagari)
  pass 2 - the same page into fields, forced to a JSON schema (llama.cpp turns the schema into a grammar)

Usage:
  python3 ml/docintel/read_doc.py ml/docintel/samples/bill.pdf
  python3 ml/docintel/read_doc.py ml/docintel/samples/bill.png --pass text
  python3 ml/docintel/read_doc.py ml/docintel/samples/bill.pdf --source text   # use the PDF's own text layer
  python3 ml/docintel/read_doc.py notice.pdf --schema generic --first 1 --last 1 --out results/   # any notice; files

`--schema generic` is for notices, circulars, tenders and forms (title, issuer, date, reference numbers, amounts, key
points); the bill schema stays the default. `--out DIR` also writes route-text.txt, route-image-pass1.md, fields.json
and run.log (timings, tokens, finish reasons, text-layer checks) into DIR.

Two routes. A digital PDF already carries exact Unicode text (pdftotext): the model only has to ORGANISE it, so
digits stay right. A scan or photo has no text layer: the model has to READ the pixels (vision). `--source auto`
(default) uses the text layer when the PDF has one.

Needs llama-server started WITH its image add-on (no --no-mmproj). The key is read from LLAMA_API_KEY or
~/.config/boli/api_key and is never printed. Standard library only, plus `pdftoppm` (poppler) for PDFs.
"""

import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = os.environ.get("LLAMA_BASE_URL", "http://127.0.0.1:8080").rstrip("/")

TEXT_PROMPT = (
    "Transcribe this document page exactly, as Markdown. Keep Nepali in Devanagari exactly as written, keep English "
    "as written, keep Nepali digits as they appear, and keep tables as Markdown tables. Do not translate, summarise "
    "or add anything."
)

FIELDS_PROMPT = (
    "Read this bill and fill the JSON fields. Copy names and text exactly as printed. For money, give the number in "
    "rupees as a plain number (convert Nepali digits to 0-9, drop commas). For dates, copy the printed text and say "
    "whether it is BS (Bikram Sambat) or AD. If a field is not on the page, use null."
)

FIELDS_SCHEMA = {
    "type": "object",
    "properties": {
        "document_type": {"type": "string"},
        "company": {"type": ["string", "null"]},
        "customer_name": {"type": ["string", "null"]},
        "customer_number": {"type": ["string", "null"]},
        "bill_date": {
            "type": "object",
            "properties": {"text": {"type": ["string", "null"]}, "calendar": {"type": "string", "enum": ["BS", "AD", "unknown"]}},
            "required": ["text", "calendar"],
        },
        "due_date": {
            "type": "object",
            "properties": {"text": {"type": ["string", "null"]}, "calendar": {"type": "string", "enum": ["BS", "AD", "unknown"]}},
            "required": ["text", "calendar"],
        },
        "address": {"type": ["string", "null"]},
        "line_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "item": {"type": "string"},
                    "units": {"type": ["number", "null"]},
                    "rate_rs": {"type": ["number", "null"]},
                    "amount_rs": {"type": "number"},
                },
                "required": ["item", "units", "rate_rs", "amount_rs"],
            },
        },
        "total_rs": {"type": ["number", "null"]},
        "languages_seen": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["document_type", "company", "customer_name", "customer_number", "bill_date", "due_date", "address", "line_items", "total_rs", "languages_seen"],
}


GENERIC_PROMPT = (
    "Read this document (a notice, circular, tender, press release or form) and fill the JSON fields. Copy the title, "
    "issuer and reference numbers exactly as printed (keep Devanagari as Devanagari, keep the digits as printed). For "
    "dates, copy the printed text and say whether it is BS (Bikram Sambat) or AD. For amounts of money, copy the printed "
    "text and also give the value in rupees as a plain number (convert Nepali digits to 0-9, drop commas). Key points: "
    "at most five short points in the document's language. If a field is not on the page, use null or an empty list."
)

DATE = {
    "type": "object",
    "properties": {"text": {"type": ["string", "null"]}, "calendar": {"type": "string", "enum": ["BS", "AD", "unknown"]}},
    "required": ["text", "calendar"],
}

GENERIC_SCHEMA = {
    "type": "object",
    "properties": {
        "document_type": {"type": "string"},
        "title": {"type": ["string", "null"]},
        "issuer": {"type": ["string", "null"]},
        "date": DATE,
        "reference_numbers": {"type": "array", "items": {"type": "string"}},
        "amounts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"text": {"type": "string"}, "value_rs": {"type": ["number", "null"]}},
                "required": ["text", "value_rs"],
            },
        },
        "key_points": {"type": "array", "items": {"type": "string"}},
        "languages_seen": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["document_type", "title", "issuer", "date", "reference_numbers", "amounts", "key_points", "languages_seen"],
}

SCHEMAS = {"bill": (FIELDS_PROMPT, FIELDS_SCHEMA), "generic": (GENERIC_PROMPT, GENERIC_SCHEMA)}

# Old Nepali fonts map Devanagari glyphs onto ASCII codes: the text layer reads "g]kfn ;/sf/" for नेपाल सरकार.
LEGACY_FONTS = ("preeti", "kantipur", "sagarmatha", "himalb", "himalli", "ganess", "fontasy", "pcs nepali", "aakriti")


def layer_check(path: Path, text: str) -> str:
    """'ok', 'legacy-font' (Preeti and friends: ASCII gibberish) or 'no-devanagari' (an English page, or a scanner's
    Latin OCR of a Devanagari page). Only a warning: the caller decides."""
    res = subprocess.run(["pdffonts", str(path)], capture_output=True, text=True)
    fonts = res.stdout.lower()
    dev = sum(1 for c in text if "\u0900" <= c <= "\u097f")
    letters = sum(1 for c in text if c.isalpha())
    if any(f in fonts for f in LEGACY_FONTS) and dev < 0.3 * max(letters, 1):
        return "legacy-font"
    if dev < 0.05 * max(letters, 1):
        return "no-devanagari"
    return "ok"


def api_key() -> str:
    key = os.environ.get("LLAMA_API_KEY", "").strip()
    if not key:
        path = Path.home() / ".config" / "boli" / "api_key"
        if path.exists():
            key = path.read_text().strip()
    return key


def page_range(first: int | None, last: int | None) -> list[str]:
    args = []
    if first:
        args += ["-f", str(first)]
    if last:
        args += ["-l", str(last)]
    return args


def page_images(path: Path, dpi: int, first: int | None = None, last: int | None = None) -> list[Path]:
    """A PDF becomes one PNG per page (pdftoppm); an image is used as it is."""
    if path.suffix.lower() != ".pdf":
        return [path]
    out = Path(tempfile.mkdtemp(prefix="boli-docintel-"))
    subprocess.run(["pdftoppm", "-png", "-r", str(dpi), *page_range(first, last), str(path), str(out / "page")], check=True)
    pages = sorted(out.glob("page*.png"))
    if not pages:
        sys.exit(f"pdftoppm made no pages from {path}")
    return pages


def text_layer(path: Path, first: int | None = None, last: int | None = None) -> str:
    """The PDF's own text (exact characters) or '' for an image / a scanned PDF."""
    if path.suffix.lower() != ".pdf":
        return ""
    res = subprocess.run(["pdftotext", "-layout", *page_range(first, last), str(path), "-"], capture_output=True, text=True)
    text = res.stdout.strip()
    return text if len(text) > 40 else ""


def tesseract_text(image: Path) -> str:
    """Classic OCR (Tesseract 5, Nepali + English, page mode 4). Strong on digits, weaker on some words."""
    res = subprocess.run(["tesseract", str(image), "-", "-l", "nep+eng", "--psm", "4"], capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"tesseract failed: {res.stderr.strip()[:300]} (brew install tesseract tesseract-lang)")
    return res.stdout.strip()


HYBRID_NOTE = (
    "You also get the page's OCR text from a separate engine. Trust the OCR text for DIGITS and numbers (it reads "
    "Nepali digits reliably) and keep each number in the script it is printed in; trust the IMAGE for words, names "
    "and layout (the OCR may garble some Nepali words or table borders, e.g. '0000' for an empty cell)."
)


def data_uri(image: Path) -> str:
    mime = "image/jpeg" if image.suffix.lower() in (".jpg", ".jpeg") else "image/png"
    return f"data:{mime};base64,{base64.b64encode(image.read_bytes()).decode()}"


def ask(image: Path | None, prompt: str, schema: dict | None, max_tokens: int, page_text: str = "", ocr_text: str = "") -> tuple[str, dict, float, str]:
    # Vision: the image goes BEFORE the text (Google's guidance for Gemma 4 OCR). Text route: the page text is given
    # as data under the instruction. Thinking off either way: it is a reading task.
    if image is not None:
        text = prompt if not ocr_text else f"{prompt}\n\n{HYBRID_NOTE}\n\nOCR text:\n<<<\n{ocr_text}\n>>>"
        content: list | str = [
            {"type": "image_url", "image_url": {"url": data_uri(image)}},
            {"type": "text", "text": text},
        ]
    else:
        content = f"{prompt}\n\nThe document text:\n<<<\n{page_text}\n>>>"
    body: dict = {
        "messages": [{"role": "user", "content": content}],
        "temperature": 0,
        "max_tokens": max_tokens,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    if schema:
        body["response_format"] = {"type": "json_schema", "json_schema": {"name": "fields", "schema": schema}}
    headers = {"Content-Type": "application/json"}
    key = api_key()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    req = urllib.request.Request(f"{BASE_URL}/v1/chat/completions", data=json.dumps(body).encode(), headers=headers)
    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as res:
            data = json.loads(res.read())
    except urllib.error.HTTPError as err:
        sys.exit(f"HTTP {err.code} from llama-server: {err.read().decode()[:400]}")
    except urllib.error.URLError as err:
        sys.exit(f"Cannot reach llama-server at {BASE_URL}: {err.reason}. Is it running with the image add-on?")
    choice = data["choices"][0]
    return choice["message"]["content"], data.get("usage", {}), time.time() - started, choice.get("finish_reason", "?")


def main() -> None:
    parser = argparse.ArgumentParser(description="Read a document with the local Gemma 4 vision model.")
    parser.add_argument("path", type=Path)
    parser.add_argument("--pass", dest="which", choices=["text", "fields", "both"], default="both")
    parser.add_argument("--dpi", type=int, default=150)
    parser.add_argument("--source", choices=["auto", "image", "text", "tesseract", "hybrid"], default="auto",
                        help="text = the PDF's own text layer; tesseract = Tesseract OCR text, model organises it; hybrid = image + Tesseract text together")
    parser.add_argument("--schema", choices=sorted(SCHEMAS), default="bill", help="bill (default) or generic (notices, tenders, forms)")
    parser.add_argument("--first", type=int, help="first PDF page to read")
    parser.add_argument("--last", type=int, help="last PDF page to read")
    parser.add_argument("--max-tokens", type=int, default=1500, help="output cap for the transcription pass")
    parser.add_argument("--out", type=Path, help="also write result files into this folder")
    args = parser.parse_args()
    if not args.path.exists():
        sys.exit(f"No such file: {args.path}")
    prompt, schema = SCHEMAS[args.schema]
    log: list[str] = [f"file: {args.path.name}", f"source: {args.source}  pass: {args.which}  schema: {args.schema}  dpi: {args.dpi}  pages: {args.first or 1}-{args.last or 'end'}"]
    out = args.out
    if out:
        out.mkdir(parents=True, exist_ok=True)

    layer = text_layer(args.path, args.first, args.last) if args.source in ("auto", "text") else ""
    if layer:
        check = layer_check(args.path, layer)
        log.append(f"text layer: {len(layer)} chars, check: {check}")
        if check != "ok":
            print(f"warning: text layer check = {check} (legacy-font = Preeti-style ASCII; no-devanagari = English page or a scanner's Latin OCR)")
    if args.source == "text" and not layer:
        sys.exit("This file has no text layer (a scan or an image) - use --source image.")
    if layer:
        print("route: TEXT LAYER (the PDF carries exact text; the model only organises it)")
        print("\n--- the PDF's own text ---\n")
        print(layer)
        if out:
            (out / "route-text.txt").write_text(layer + "\n")
        if args.which in ("fields", "both"):
            raw, usage, secs, finish = ask(None, prompt, schema, 1200, page_text=layer)
            log.append(f"text-route fields: {secs:.1f}s, {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out, finish={finish}")
            show_fields(raw, usage, secs, out, log)
        finish_log(out, log)
        return

    if args.source in ("tesseract", "hybrid"):
        # Tesseract reads the pixels (strong on digits); the model organises (tesseract) or reads the image WITH the
        # OCR text beside it, trusting OCR for digits and the image for words (hybrid).
        fields_all = []
        ocr_pages: list[str] = []
        for i, image in enumerate(page_images(args.path, args.dpi, args.first, args.last), start=args.first or 1):
            ocr = tesseract_text(image)
            ocr_pages.append(f"<!-- page {i} -->\n{ocr}")
            print(f"route: {args.source.upper()} (page {i})\n\n--- Tesseract text ---\n\n{ocr}")
            if args.which in ("fields", "both"):
                if args.source == "tesseract":
                    raw, usage, secs, finish = ask(None, prompt, schema, 1200, page_text=ocr)
                else:
                    raw, usage, secs, finish = ask(image, prompt, schema, 1200, ocr_text=ocr)
                log.append(f"page {i} {args.source} fields: {secs:.1f}s, {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out, finish={finish}")
                fields_all.append(show_fields(raw, usage, secs, None, log))
        if out:
            (out / "route-tesseract.txt").write_text("\n\n".join(ocr_pages) + "\n")
            if fields_all:
                data = fields_all[0] if len(fields_all) == 1 else fields_all
                (out / f"fields-{args.source}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        finish_log(out, log)
        return

    print("route: VISION (no text layer - the model reads the pixels)")
    pages_md: list[str] = []
    fields_all: list = []
    for i, image in enumerate(page_images(args.path, args.dpi, args.first, args.last), start=args.first or 1):
        print(f"\n=== page {i}: {image.name} ===")
        if args.which in ("text", "both"):
            text, usage, secs, finish = ask(image, TEXT_PROMPT, None, args.max_tokens)
            print(f"\n--- pass 1: transcription ({secs:.1f}s, {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out) ---\n")
            print(text)
            pages_md.append(f"<!-- page {i} -->\n{text}")
            log.append(f"page {i} pass1: {secs:.1f}s, {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out, finish={finish}")
        if args.which in ("fields", "both"):
            raw, usage, secs, finish = ask(image, prompt, schema, 1200)
            log.append(f"page {i} fields: {secs:.1f}s, {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out, finish={finish}")
            fields_all.append(show_fields(raw, usage, secs, None, log))
    if out and pages_md:
        (out / "route-image-pass1.md").write_text("\n\n".join(pages_md) + "\n")
    if out and fields_all:
        data = fields_all[0] if len(fields_all) == 1 else fields_all
        (out / "fields.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    finish_log(out, log)


def finish_log(out: Path | None, log: list[str]) -> None:
    if out:
        with open(out / "run.log", "a") as f:
            f.write("\n".join(log) + "\n\n")


def show_fields(raw: str, usage: dict, secs: float, out: Path | None = None, log: list[str] | None = None):
    print(f"\n--- fields ({secs:.1f}s, {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out) ---\n")
    try:
        fields = json.loads(raw)
    except json.JSONDecodeError:
        print(raw)
        if log is not None:
            log.append("fields: NOT valid JSON (output cut off?)")
        if out:
            (out / "fields.json").write_text(json.dumps({"invalid_json": raw}, ensure_ascii=False, indent=2) + "\n")
        return {"invalid_json": raw}
    print(json.dumps(fields, ensure_ascii=False, indent=2))
    if out:
        (out / "fields.json").write_text(json.dumps(fields, ensure_ascii=False, indent=2) + "\n")
    items = fields.get("line_items") or []
    total = fields.get("total_rs")
    if items and total is not None:
        added = round(sum(x.get("amount_rs") or 0 for x in items), 2)
        verdict = "OK" if abs(added - total) < 0.01 else "MISMATCH"
        print(f"\ncheck: line items add up to {added}, printed total {total} -> {verdict}")
        if log is not None:
            log.append(f"check: line items {added} vs total {total} -> {verdict}")
    for x in items:
        u, r, a = x.get("units"), x.get("rate_rs"), x.get("amount_rs")
        if u is not None and r is not None and a is not None:
            ok = abs(u * r - a) < 0.51
            print(f"check: {x.get('item')}: {u} x {r} = {round(u * r, 2)} vs {a} -> {'OK' if ok else 'MISMATCH'}")
    return fields

if __name__ == "__main__":
    main()
