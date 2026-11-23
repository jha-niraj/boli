"""Lesson 01 extra: the four things round 2 of the quiz caught.

Run:  uv run pytest practice/lesson_01/extra -x
Before running each test, predict the answer in your head. Then check.
"""


def clean_label(label: str) -> str:
    """Strip surrounding whitespace and upper-case a speaker label.

    Examples:
        clean_label("  spk-a ") -> "SPK-A"

    Trap: strings never change in place. label.strip() on its own line
    does nothing to `label`; it returns a NEW string you must keep.
    """
    return label.strip().upper()


def clips_message(count: int) -> str:
    """Return "Recorded N clips".

    Examples:
        clips_message(5) -> "Recorded 5 clips"
        clips_message(0) -> "Recorded 0 clips"

    Trap: "Recorded " + count is a TypeError in Python (JS would allow it).
    Use an f-string or str(count).
    """
    return f"Recorded {count} clips"


def part_of(clip_id: str) -> int:
    """Return the part number from a clip id, as an int.

    Examples:
        part_of("03-027") -> 3
        part_of("10-005") -> 10

    Hint: clip_id[:2] is the first two characters. They are still a str.
    """
    return int(clip_id[:2])


def sentence_of(clip_id: str) -> int:
    """Return the sentence number from a clip id, as an int.

    Examples:
        sentence_of("03-027") -> 27

    Hint: negative indexes count from the end. clip_id[-3:] is the last 3.
    """
    return int(clip_id[-3:])


def hours(seconds: float) -> float:
    """Convert seconds to hours, rounded to 2 decimals with round().

    Examples:
        hours(7200) -> 2.0
        hours(450) -> ?   450 / 3600 is exactly 0.125. Predict first!

    One line. The test file has the answer, but guess before you look.
    """
    return round(seconds / 3600, 2)
