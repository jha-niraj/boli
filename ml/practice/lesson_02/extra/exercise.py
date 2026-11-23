"""Lesson 02 extra: the four things the combined quiz caught.

Run:  uv run pytest practice/lesson_02/extra -x
Before writing each one, try the trap in `uv run python` and watch it happen.
"""


def with_clip(clip_ids: list[str], clip_id: str) -> list[str]:
    """Return a NEW list with `clip_id` added at the end. Do not touch the input.

    Examples:
        with_clip(["01-001"], "01-002") -> ["01-001", "01-002"]

    Trap: `new = clip_ids` does not copy. Both names point at the same list,
    so new.append(...) changes the caller's list too. Make a real copy:
    clip_ids + [clip_id], or list(clip_ids) then append.
    """

    return clip_ids + [clip_id]


def duration_or_zero(clips: dict[str, float], clip_id: str) -> float:
    """Return the duration of `clip_id`, or 0.0 if it is not in `clips`.

    Examples:
        duration_or_zero({"01-001": 4.2}, "01-001") -> 4.2
        duration_or_zero({"01-001": 4.2}, "09-999") -> 0.0

    Trap: clips["09-999"] raises KeyError. It never returns None.
    """
    
    return clips.get(clip_id, 0.0)


def speaker_count(speakers: list[str]) -> int:
    """Return how many DIFFERENT speakers appear in the list.

    Examples:
        speaker_count(["sita", "ram", "sita"]) -> 2

    Hint: a set keeps one copy of each value.
    """

    return len(set(speakers))

def sort_numerically(numbers: list[str]) -> list[str]:
    """Sort number-strings by their numeric value, keeping them as strings.

    Examples:
        sort_numerically(["10", "9", "02"]) -> ["02", "9", "10"]

    Trap: sorted() on strings compares character by character, so "10"
    comes before "9" (because "1" < "9"). sorted() takes key=, like max().
    Which built-in turns "10" into 10?
    """

    return sorted(numbers, key=int)