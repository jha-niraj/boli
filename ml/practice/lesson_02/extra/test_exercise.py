import pytest

from practice.lesson_02.extra.exercise import (
    duration_or_zero,
    sort_numerically,
    speaker_count,
    with_clip,
)


def test_with_clip_adds_at_the_end() -> None:
    assert with_clip(["01-001"], "01-002") == ["01-001", "01-002"]
    assert with_clip([], "01-001") == ["01-001"]


def test_with_clip_leaves_the_input_alone() -> None:
    original = ["01-001"]
    with_clip(original, "01-002")
    assert original == ["01-001"]


def test_with_clip_returns_a_different_list() -> None:
    original = ["01-001"]
    assert with_clip(original, "01-002") is not original


CLIPS: dict[str, float] = {"01-001": 4.2, "01-002": 6.8}


@pytest.mark.parametrize(
    ("clip_id", "expected"),
    [("01-001", 4.2), ("01-002", 6.8), ("09-999", 0.0)],
)
def test_duration_or_zero(clip_id: str, expected: float) -> None:
    assert duration_or_zero(CLIPS, clip_id) == expected


def test_duration_or_zero_does_not_add_the_key() -> None:
    clips = {"01-001": 4.2}
    duration_or_zero(clips, "09-999")
    assert clips == {"01-001": 4.2}


@pytest.mark.parametrize(
    ("speakers", "expected"),
    [
        (["sita", "ram", "sita"], 2),
        (["सीता", "सीता", "सीता"], 1),
        (["a", "b", "c"], 3),
        ([], 0),
    ],
)
def test_speaker_count(speakers: list[str], expected: int) -> None:
    assert speaker_count(speakers) == expected


@pytest.mark.parametrize(
    ("numbers", "expected"),
    [
        (["10", "9", "02"], ["02", "9", "10"]),
        (["100", "20", "3"], ["3", "20", "100"]),
        ([], []),
    ],
)
def test_sort_numerically(numbers: list[str], expected: list[str]) -> None:
    assert sort_numerically(numbers) == expected


def test_sort_numerically_keeps_strings() -> None:
    assert sort_numerically(["10", "9"]) == ["9", "10"]
    assert all(type(n) is str for n in sort_numerically(["10", "9"]))
