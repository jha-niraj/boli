"""Lesson 08: writing your own tests.

This function is already written, and it has 2 bugs. Do not fix it yet.
First write tests in test_mine.py that fail because of the bugs. See README.md.

Run:  uv run pytest practice/lesson_08 -q
"""

CONDITIONS = {"quiet", "noisy", "phone"}


def clip_filename(part: int, speaker: str, condition: str, ext: str = "wav") -> str:
    """Build the file name for a recording.

    `part` is zero-padded to 2 digits. `condition` must be one of CONDITIONS,
    otherwise ValueError.

    Examples:
        clip_filename(1, "s01", "quiet") -> "part01_s01_quiet.wav"
        clip_filename(10, "s03", "phone", ext="flac") -> "part10_s03_phone.flac"
        clip_filename(1, "s01", "windy") -> raises ValueError
    """
    return f"part0{part}_{speaker}_{condition}.{ext}"
