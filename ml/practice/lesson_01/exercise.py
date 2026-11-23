"""Lesson 01: strings and Unicode.

Run:  uv run pytest practice/lesson_01 -q
"""

import unicodedata  # noqa: F401 - you need it for same_text


def describe_clip(clip_id: str, seconds: float) -> str:
    """Format a clip id and its duration, always with 2 decimals.

    Examples:
        describe_clip("01-001", 4.25) -> "01-001: 4.25 s"
        describe_clip("03-027", 3) -> "03-027: 3.00 s"

    Hint: f-string format specs, e.g. f"{x:.2f}".
    """
    # raise NotImplementedError("lesson 01: write me")
    return f"{clip_id}: {seconds:.2f} s"


def count_words(text: str) -> int:
    """Count words separated by any whitespace (spaces, tabs, newlines).

    Examples:
        count_words("मेरो नाम सीता हो") -> 4
        count_words("  ") -> 0

    Hint: str.split() with no argument splits on runs of whitespace.
    """
    # raise NotImplementedError("lesson 01: write me")
    return len(text.split())


def is_devanagari(ch: str) -> bool:
    """Return True if the single character `ch` is in the Devanagari block.

    The block is U+0900 to U+097F inclusive.

    Examples:
        is_devanagari("क") -> True
        is_devanagari("k") -> False

    Hint: ord() gives a character's code point; Python allows chained
    comparisons like a <= x <= b.
    """
    # raise NotImplementedError("lesson 01: write me")
    return 0x0900 <= ord(ch) <= 0x097F


def same_text(a: str, b: str) -> bool:
    """Return True if `a` and `b` are the same text after NFC normalisation.

    The same visible letter can be stored as different code points. "क़" can be
    one code point (U+0958) or "क" followed by a nukta (U+0915 U+093C).
    Transcripts typed on different keyboards mix both, so plain == lies.

    Examples:
        same_text("\\u0958", "\\u0915\\u093c") -> True
        same_text("कल", "काल") -> False

    Hint: unicodedata.normalize("NFC", s) on both sides before comparing.
    """
    # raise NotImplementedError("lesson 01: write me")
    return unicodedata.normalize("NFC", a) == unicodedata.normalize("NFC", b)
