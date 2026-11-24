"""Score a transcription against a reference text: character error rate (CER) and digit accuracy.

Usage:
  python3 ml/docintel/score.py REF.txt HYP.md                  # JSON on stdout
  python3 ml/docintel/score.py REF.txt HYP.md --preeti         # REF is a Preeti (legacy font) text layer: convert first
  python3 ml/docintel/score.py --detect REF.txt                # is this text layer Unicode, Preeti-style ASCII, or junk?
  python3 ml/docintel/score.py --preeti-convert REF.txt        # print the Unicode conversion of a Preeti text layer

Both texts are normalised the same way: Unicode NFC, Markdown marks dropped (| # * ` and table rules), whitespace
collapsed. CER = edit distance / reference length (it can pass 1.0 when the model invents text). `cer_nospace` ignores
every space and line break, so layout differences (columns, table cells) count less.

Digits: every Devanagari (०-९) and ASCII (0-9) digit, in reading order. `digit_acc` compares VALUES (४ = 4) with an
edit distance on the digit strings; `digit_acc_exact` also counts a script change as wrong. `nep_to_eng` /
`eng_to_nep` count aligned digits whose value is right but whose script was changed.

Standard library only.
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

DEV_DIGITS = "०१२३४५६७८९"

# --- Preeti (legacy font) -> Unicode -------------------------------------------------------------------------------
# Preeti maps Devanagari glyphs onto Latin key codes. This is the common table plus the two reordering rules
# (the short i sign is typed BEFORE its consonant; the reph र् is typed AFTER its syllable). Good enough to score
# against; not a production converter (rare ligatures may come out wrong).
PREETI_MULTI = [
    ("cf}", "औ"), ("cf]", "ओ"), ("cf", "आ"), ("P]", "ऐ"), ("O{", "ई"), ("em", "झ"), ("km", "फ"), ("Qm", "क्त"),
    ("qm", "क्र"), ("Fmf", "ँ"),
]
PREETI = {
    "a": "ब", "b": "द", "c": "अ", "d": "म", "e": "भ", "f": "ा", "g": "न", "h": "ज", "i": "ष्", "j": "व", "k": "प",
    "l": "ि", "m": "ः", "n": "ल", "o": "य", "p": "उ", "q": "त्र", "r": "च", "s": "क", "t": "त", "u": "ग", "v": "ख",
    "w": "ध", "x": "ह", "y": "थ", "z": "श",
    "A": "ब्", "B": "द्य", "C": "ऋ", "D": "म्", "E": "भ्", "F": "ँ", "G": "न्", "H": "ज्", "I": "क्ष्", "J": "व्",
    "K": "प्", "L": "ी", "M": "ः", "N": "ल्", "O": "इ", "P": "ए", "Q": "त्त", "R": "च्", "S": "क्", "T": "त्",
    "U": "ग्", "V": "ख्", "W": "ध्", "X": "ह्", "Y": "थ्", "Z": "श्",
    "0": "ण्", "1": "ज्ञ", "2": "द्द", "3": "घ", "4": "द्ध", "5": "छ", "6": "ट", "7": "ठ", "8": "ड", "9": "ढ",
    ")": "०", "!": "१", "@": "२", "#": "३", "$": "४", "%": "५", "^": "६", "&": "७", "*": "८", "(": "९",
    "`": "ञ्", "~": "ञ्", "-": "(", "_": ")", "=": ".", "+": "ं", "[": "ृ", "]": "े", "}": "ै", "\\": "्",
    "|": "्र", ";": "स", ":": "स्", "'": "ु", '"': "ू", "<": "?", ".": "।", ">": "श्र", "/": "र", "?": "रु",
    "{": "\u0001",  # reph marker, moved below
    "å": "द्व", "«": "्र", "Í": "ङ्क", "ª": "ङ", "¿": "रू", "÷": "/", "\u2013": "-", "ç": "ॐ", "ˆ": "फ्", "Ø": "्य",
    "Ú": "ष्ट", "§": "ट्ट", "°": "ङ्ख", "¶": "ठ्ठ", "Ë": "ङ्ग", "Ì": "न्न", "Î": "ङ्घ", "›": "द्र", "•": "ड्ड",
    "‡": "ट्र", "‰": "झ्", "˜": "ऽ", "Œ": "त्त्", "„": "ध्र", "¡": "ज्ञ्", "£": "घ्", "¤": "झ्", "´": "झ",
    "Ü": "ङ्ग", "Æ": "“", "Å": "हृ", "Ý": "ट्ठ", "Ö": "=", "Ù": ";", "Û": "!", "Ò": "¨", "¥": "र्‍",
}
MATRAS = set("ािीुूृेैोौंःँ")


def is_consonant(ch: str) -> bool:
    return "क" <= ch <= "ह" or ch in "क़ख़ग़ज़ड़ढ़फ़य़"


def preeti_to_unicode(text: str) -> str:
    # Numbers typed in an English font inside a Preeti page ("300,000.00") are kept as they are: in Preeti itself
    # digits are typed with ! @ # ..., and a bare 0-9 key is a letter (5 = छ). Only number-shaped runs are kept.
    parts = re.split(r"(?<![A-Za-z0-9])(\d{1,3}(?:,\d{2,3})+(?:[.=]\d+)?|\d+[.=]\d+|\d{3,})(?![A-Za-z0-9])", text)
    if len(parts) > 1:
        return "".join(p.replace("=", ".") if i % 2 else preeti_to_unicode_run(p) for i, p in enumerate(parts))
    return preeti_to_unicode_run(text)


def preeti_to_unicode_run(text: str) -> str:
    for a, b in PREETI_MULTI:
        text = text.replace(a, b)
    out = "".join(PREETI.get(c, c) for c in text)
    # a half form followed by the aa sign is the full letter (I f = क्ष् + ा = क्ष); aa + e/ai signs are o/au
    out = out.replace("्ा", "").replace("ाे", "ो").replace("ाै", "ौ")
    chars = list(out)
    # short i: typed before the consonant cluster -> move it after the cluster (C + (् C)*)
    i = 0
    while i < len(chars):
        if chars[i] == "ि" and i + 1 < len(chars) and is_consonant(chars[i + 1]):
            j = i + 2
            while j + 1 < len(chars) and chars[j] == "्" and is_consonant(chars[j + 1]):
                j += 2
            chars[i:j] = chars[i + 1:j] + ["ि"]
            i = j
        else:
            i += 1
    # reph: typed after the syllable -> put र् before the syllable's consonant cluster
    i = 0
    while i < len(chars):
        if chars[i] == "\u0001":
            del chars[i]
            k = i - 1
            while k >= 0 and chars[k] in MATRAS:
                k -= 1
            while k - 2 >= 0 and chars[k - 1] == "्" and is_consonant(chars[k - 2]):
                k -= 2
            k = max(k, 0)
            chars[k:k] = ["र", "्"]
            i += 2
        else:
            i += 1
    return "".join(chars)


# --- normalising and distances -------------------------------------------------------------------------------------
def clean(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = re.sub(r"^\s*\|?\s*:?-{3,}:?.*$", " ", text, flags=re.M)  # table rules
    text = re.sub(r"[|#*`>_]", " ", text)
    text = text.replace("‌", "").replace("‍", "")
    return re.sub(r"\s+", " ", text).strip()


def edit_distance(a, b) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def align(a: str, b: str) -> list[tuple[int, int]]:
    """Matched index pairs of an edit-distance alignment (for the short digit strings)."""
    n, m = len(a), len(b)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    pairs, i, j = [], n, m
    while i > 0 and j > 0:
        if d[i][j] == d[i - 1][j - 1] + (a[i - 1] != b[j - 1]):
            if a[i - 1] == b[j - 1]:
                pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif d[i][j] == d[i - 1][j] + 1:
            i -= 1
        else:
            j -= 1
    return pairs[::-1]


def digits(text: str) -> list[tuple[str, str]]:
    """(value, script) for every digit in order. script: 'dev' or 'ascii'."""
    out = []
    for c in text:
        if c in DEV_DIGITS:
            out.append((str(DEV_DIGITS.index(c)), "dev"))
        elif "0" <= c <= "9":
            out.append((c, "ascii"))
    return out


def detect(text: str) -> dict:
    letters = [c for c in text if c.isalpha()]
    dev = sum(1 for c in letters if "ऀ" <= c <= "ॿ")
    asc = sum(1 for c in letters if c.isascii())
    # Preeti text is full of these key codes inside words: ] for े, f for ा, ; for स, / for र, { for reph
    preeti_marks = len(re.findall(r"[a-zA-Z][\];/{}'\"\[]|[\];/{}][a-zA-Z]", text))
    n = len(re.sub(r"\s", "", text))  # ignore layout spaces (pdftotext -layout pads with them)
    words = re.findall(r"[A-Za-z]{3,}", text)
    common = {"the", "and", "for", "of", "to", "in", "on", "be", "with", "this", "that", "date", "notice", "shall", "will", "from", "all", "are", "by", "office"}
    common_share = sum(1 for w in re.findall(r"[A-Za-z]+", text) if w.lower() in common) / max(len(re.findall(r"[A-Za-z]+", text)), 1)
    vowelish = sum(1 for w in words if re.search(r"[aeiou]", w, re.I)) / max(len(words), 1)
    if dev > 0.5 * max(len(letters), 1):
        kind = "unicode-devanagari"
    elif preeti_marks > 0.12 * max(len(letters), 1):  # Preeti ~0.2; scanner junk OCR ~0.05-0.08
        kind = "legacy-preeti"
    elif vowelish < 0.75 or common_share < 0.08 or len(re.findall(r"[{}!<>#@*~^]", text)) > 0.03 * max(n, 1):
        kind = "junk-ocr"
    else:
        kind = "latin"
    return {"kind": kind, "letters": len(letters), "devanagari_letters": dev, "ascii_letters": asc,
            "preeti_marks": preeti_marks, "latin_words_with_vowels": round(vowelish, 2),
            "common_english_share": round(common_share, 3)}


def score(ref: str, hyp: str) -> dict:
    r, h = clean(ref), clean(hyp)
    rn, hn = r.replace(" ", ""), h.replace(" ", "")
    rd, hd = digits(r), digits(h)
    rv, hv = "".join(v for v, _ in rd), "".join(v for v, _ in hd)
    dist_v = edit_distance(rv, hv) if rv or hv else 0
    exact_tokens_r = [v + s for v, s in rd]
    exact_tokens_h = [v + s for v, s in hd]
    dist_e = edit_distance(exact_tokens_r, exact_tokens_h) if rd or hd else 0
    n2e = e2n = 0
    for i, j in align(rv, hv):
        if rd[i][1] == "dev" and hd[j][1] == "ascii":
            n2e += 1
        elif rd[i][1] == "ascii" and hd[j][1] == "dev":
            e2n += 1
    return {
        "ref_chars": len(r), "hyp_chars": len(h), "length_ratio": round(len(h) / max(len(r), 1), 2),
        "cer": round(edit_distance(r, h) / max(len(r), 1), 4),
        "cer_nospace": round(edit_distance(rn, hn) / max(len(rn), 1), 4),
        "ref_digits": len(rd), "hyp_digits": len(hd),
        "digit_errors": dist_v,
        "digit_acc": round(1 - dist_v / len(rd), 4) if rd else None,
        "digit_acc_exact": round(1 - dist_e / len(rd), 4) if rd else None,
        "nep_to_eng": n2e, "eng_to_nep": e2n,
    }


def main() -> None:
    p = argparse.ArgumentParser(description="CER and digit accuracy of a transcription against a reference.")
    p.add_argument("ref", type=Path)
    p.add_argument("hyp", type=Path, nargs="?")
    p.add_argument("--preeti", action="store_true", help="the reference is a Preeti text layer: convert it first")
    p.add_argument("--detect", action="store_true", help="only say what kind of text layer REF is")
    p.add_argument("--preeti-convert", action="store_true", help="print REF converted from Preeti to Unicode")
    a = p.parse_args()
    ref = a.ref.read_text(errors="replace")
    if a.detect:
        print(json.dumps(detect(ref), ensure_ascii=False))
        return
    if a.preeti_convert:
        print(preeti_to_unicode(ref))
        return
    if not a.hyp:
        sys.exit("give a HYP file, or --detect / --preeti-convert")
    if a.preeti:
        ref = preeti_to_unicode(ref)
    print(json.dumps(score(ref, a.hyp.read_text(errors="replace")), ensure_ascii=False))


if __name__ == "__main__":
    main()
