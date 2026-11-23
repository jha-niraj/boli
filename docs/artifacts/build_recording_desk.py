"""Build recording-desk.html from docs/recording/part-*.md.

Re-run after editing any part file:  python3 docs/artifacts/build_recording_desk.py
"""

import json
import re
from pathlib import Path

HERE = Path(__file__).parent
RECORDING = HERE.parent / "recording"
TITLE = re.compile(r"^# Part (\d{2}) - (.+)$")
READ_TIME = re.compile(r"^\*\*Approximate read time:\*\*\s*~?([^(]+)")
SENTENCE = re.compile(r"^- `(\d{2}-\d{3})` (.+)$")


def parse_part(path: Path) -> dict:
    part: dict = {"sentences": []}
    for line in path.read_text(encoding="utf-8").splitlines():
        if m := TITLE.match(line):
            part["num"], part["title"] = m.group(1), m.group(2).strip()
        elif m := READ_TIME.match(line):
            part["readTime"] = "~" + m.group(1).strip()
        elif m := SENTENCE.match(line):
            part["sentences"].append({"id": m.group(1), "text": m.group(2).strip()})
    if "num" not in part or not part["sentences"]:
        raise ValueError(f"{path.name}: no title or no sentences found")
    return part


def main() -> None:
    parts = [parse_part(p) for p in sorted(RECORDING.glob("part-*.md"))]
    template = (HERE / "recording-desk.template.html").read_text(encoding="utf-8")
    data = json.dumps(parts, ensure_ascii=False)
    out = template.replace("/*__PARTS__*/[]", data)
    (HERE / "recording-desk.html").write_text(out, encoding="utf-8")
    total = sum(len(p["sentences"]) for p in parts)
    print(f"{len(parts)} parts, {total} sentences -> recording-desk.html")


if __name__ == "__main__":
    main()
