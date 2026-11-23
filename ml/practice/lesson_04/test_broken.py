import pytest

from practice.lesson_04.broken import average_duration


def test_average_duration() -> None:
    assert average_duration([2.0, 4.0, 6.0]) == pytest.approx(4.0)


def test_average_duration_counts_first_clip() -> None:
    # The first clip is much longer, so skipping it changes the answer a lot.
    assert average_duration([10.0, 1.0]) == pytest.approx(5.5)


def test_average_duration_single() -> None:
    assert average_duration([4.25]) == pytest.approx(4.25)


def test_average_duration_empty() -> None:
    assert average_duration([]) == 0.0
