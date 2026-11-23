"""Lesson 04, part 2: debugging.

Run:  uv run pytest practice/lesson_04/test_broken.py -q
"""


def average_duration(durations: list[float]) -> float:
    """Return the mean duration in seconds. An empty list gives 0.0.

    This function has 2 bugs. Run the tests, read the stack trace, fix it.

    Examples:
        average_duration([2.0, 4.0, 6.0]) -> 4.0
        average_duration([]) -> 0.0
    """
    total = 0.0
    for i in range(1, len(durations)):
        total += durations[i]
    return total / len(durations)
