"""Lesson 07: modules and packages.

Run:  uv run pytest practice/lesson_07 -q
"""


def summarise(durations: list[float]) -> dict[str, float]:
    """Summarise clip durations as count, total, mean and longest.

    An empty list gives zeros for every key, so callers never divide by zero.

    Examples:
        summarise([1.5, 2.0, 3.0])
            -> {"count": 3, "total": 6.5, "mean": 2.1666..., "longest": 3.0}
        summarise([]) -> {"count": 0, "total": 0.0, "mean": 0.0, "longest": 0.0}

    Hint: len(), sum() and max() cover it; check for the empty list first.
    """
    raise NotImplementedError("lesson 07: write me")
