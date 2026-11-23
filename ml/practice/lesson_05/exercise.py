"""Lesson 05: files, paths, JSONL.

A manifest is a JSONL file: one JSON object per line, e.g.
    {"id": "03-027", "text": "आज office जानु छ", "seconds": 3.4}

Run:  uv run pytest practice/lesson_05 -q
"""

import json  # noqa: F401 - you need it in both functions
from pathlib import Path


def read_manifest(path: Path) -> list[dict]:
    """Read a JSONL manifest into a list of dicts, skipping blank lines.

    Always open as UTF-8: the default encoding differs between machines and
    would garble Devanagari on some of them.

    Examples:
        a file with 2 rows and a trailing blank line -> list of 2 dicts
        an empty file -> []

    Hint: `with path.open(encoding="utf-8") as f:` then loop over lines;
    json.loads() parses one line; line.strip() tells you if it is blank.
    """
    raise NotImplementedError("lesson 05: write me")


def write_manifest(rows: list[dict], path: Path) -> None:
    """Write `rows` to `path` as JSONL, one object per line, UTF-8.

    Devanagari must stay readable in the file ("नमस्ते", not "\\u0928...").

    Examples:
        write_manifest([{"id": "01-001", "text": "नमस्ते"}], path)
            -> file contains: {"id": "01-001", "text": "नमस्ते"}\\n

    Hint: json.dumps(row, ensure_ascii=False) plus "\\n" for each row, written
    with `path.open("w", encoding="utf-8")`.
    """
    raise NotImplementedError("lesson 05: write me")
