import pytest

from practice.lesson_02.exercise import (
    clips_longer_than,
    longest_clip,
    total_duration,
    word_counts,
)

CLIPS: dict[str, float] = {
    "01-002": 6.8,
    "01-001": 4.2,
    "03-027": 2.5,
    "02-014": 9.1,
}


def test_total_duration() -> None:
    assert total_duration([4.25, 3.0, 2.75]) == pytest.approx(10.0)


def test_total_duration_empty() -> None:
    assert total_duration([]) == 0.0


def test_longest_clip() -> None:
    assert longest_clip(CLIPS) == "02-014"


def test_longest_clip_single() -> None:
    assert longest_clip({"03-027": 2.5}) == "03-027"


def test_longest_clip_empty() -> None:
    with pytest.raises(ValueError):
        longest_clip({})


def test_clips_longer_than_sorted() -> None:
    assert clips_longer_than(CLIPS, 4.0) == ["01-001", "01-002", "02-014"]


def test_clips_longer_than_is_strict() -> None:
    assert clips_longer_than(CLIPS, 6.8) == ["02-014"]


def test_clips_longer_than_none() -> None:
    assert clips_longer_than(CLIPS, 30.0) == []


def test_word_counts() -> None:
    assert word_counts("म ठीक छु म") == {"म": 2, "ठीक": 1, "छु": 1}


def test_word_counts_code_mixed() -> None:
    text = "आज office जानु छ, office मा meeting छ"
    assert word_counts(text) == {
        "आज": 1,
        "office": 2,
        "जानु": 1,
        "छ,": 1,
        "मा": 1,
        "meeting": 1,
        "छ": 1,
    }


def test_word_counts_empty() -> None:
    assert word_counts("") == {}
