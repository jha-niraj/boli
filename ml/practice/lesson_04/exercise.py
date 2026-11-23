"""Lesson 04: control flow and errors.

Run:  uv run pytest practice/lesson_04 -q

This lesson also has broken.py: a finished function with 2 bugs to fix.
"""


def parse_duration(text: str) -> float:
    """Parse a duration typed by a human into seconds.

    Accept surrounding spaces and an optional trailing "s" (with or without
    a space before it). Raise ValueError for text that is not a number and
    for negative values.

    Examples:
        parse_duration("4.2") -> 4.2
        parse_duration(" 4.2 s ") -> 4.2
        parse_duration("abc") -> raises ValueError
        parse_duration("-1") -> raises ValueError

    Hint: str.strip() and str.removesuffix("s"); float() already raises
    ValueError on junk, so you only need to raise for negatives yourself.
    """
    raise NotImplementedError("lesson 04: write me")


def parse_all(items: list[str]) -> tuple[list[float], list[str]]:
    """Parse every item; return (parsed values, items that failed).

    Both lists keep the input order. Failed items are returned unchanged.

    Examples:
        parse_all(["4.2", "abc", "3 s"]) -> ([4.2, 3.0], ["abc"])
        parse_all([]) -> ([], [])

    Hint: a for loop with try / except ValueError around parse_duration.
    """
    raise NotImplementedError("lesson 04: write me")
