"""Lesson 02: lists, dicts, comprehensions.

Run:  uv run pytest practice/lesson_02 -q
"""


def total_duration(durations: list[float]) -> float:
    """Return the sum of all durations in seconds. An empty list gives 0.0.

    Examples:
        total_duration([4.25, 3.0, 2.75]) -> 10.0
        total_duration([]) -> 0.0

    Hint: the built-in sum().
    """

    return sum(durations)

def longest_clip(clips: dict[str, float]) -> str:
    """Return the id of the longest clip in a {clip_id: seconds} dict.

    Raise ValueError if `clips` is empty.

    Examples:
        longest_clip({"01-001": 4.2, "01-002": 6.8}) -> "01-002"
        longest_clip({}) -> raises ValueError

    Hint: max() takes a key= function; clips.get is one. An empty dict is falsy.
    """

    return max(clips, key=clips.get)

def clips_longer_than(clips: dict[str, float], threshold: float) -> list[str]:
    """Return ids of clips strictly longer than `threshold`, sorted ascending.

    Examples:
        clips_longer_than({"01-002": 6.8, "01-001": 4.2, "02-001": 9.1}, 5.0)
            -> ["01-002", "02-001"]
        clips_longer_than({"01-001": 4.2}, 10.0) -> []

    Hint: a list comprehension over clips.items(), then sorted().
    """

    return sorted([clip_id for clip_id, duration in clips.items() if duration > threshold])

def word_counts(text: str) -> dict[str, int]:
    """Count how often each whitespace-separated word appears in `text`.

    Words are compared exactly (no lowercasing, no punctuation stripping).

    Examples:
        word_counts("म ठीक छु म") -> {"म": 2, "ठीक": 1, "छु": 1}
        word_counts("") -> {}

    Hint: dict.get(word, 0) + 1 in a loop, or collections.Counter.
    """

    counts = {}
    for word in text.split():
        counts[word] = counts.get(word, 0) + 1
    return counts