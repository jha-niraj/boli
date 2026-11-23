from pathlib import Path

from practice.lesson_05.exercise import read_manifest, write_manifest

ROWS: list[dict] = [
    {"id": "01-001", "text": "मेरो नाम सीता हो", "seconds": 4.25},
    {"id": "03-027", "text": "आज office जानु छ", "seconds": 3.4},
    {"id": "12-104", "text": "WiFi को password के हो?", "seconds": 2.1},
]


def test_read_manifest_skips_blank_lines(tmp_path: Path) -> None:
    path = tmp_path / "manifest.jsonl"
    path.write_text(
        '{"id": "01-001", "text": "नमस्ते", "seconds": 1.5}\n'
        "\n"
        '{"id": "01-002", "text": "धन्यवाद", "seconds": 2.0}\n'
        "   \n",
        encoding="utf-8",
    )

    rows = read_manifest(path)

    assert rows == [
        {"id": "01-001", "text": "नमस्ते", "seconds": 1.5},
        {"id": "01-002", "text": "धन्यवाद", "seconds": 2.0},
    ]


def test_read_manifest_empty_file(tmp_path: Path) -> None:
    path = tmp_path / "empty.jsonl"
    path.write_text("", encoding="utf-8")

    assert read_manifest(path) == []


def test_write_manifest_one_line_per_row(tmp_path: Path) -> None:
    path = tmp_path / "out.jsonl"

    write_manifest(ROWS, path)

    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == len(ROWS)


def test_write_manifest_keeps_devanagari_readable(tmp_path: Path) -> None:
    path = tmp_path / "out.jsonl"

    write_manifest(ROWS, path)

    raw = path.read_text(encoding="utf-8")
    assert "मेरो नाम सीता हो" in raw
    assert "\\u" not in raw


def test_round_trip(tmp_path: Path) -> None:
    path = tmp_path / "data" / "manifest.jsonl"
    path.parent.mkdir()

    write_manifest(ROWS, path)

    assert read_manifest(path) == ROWS
