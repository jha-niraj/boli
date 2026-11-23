import pytest

from practice.lesson_01.extra.exercise import (
    clean_label,
    clips_message,
    hours,
    part_of,
    sentence_of,
)


@pytest.mark.parametrize(
    ("label", "expected"),
    [
        ("  spk-a ", "SPK-A"),
        ("spk-b", "SPK-B"),
        ("\tniraj\n", "NIRAJ"),
    ],
)
def test_clean_label(label: str, expected: str) -> None:
    assert clean_label(label) == expected


def test_clean_label_leaves_the_original_alone() -> None:
    original = "  spk-a "
    clean_label(original)
    assert original == "  spk-a "


@pytest.mark.parametrize(
    ("count", "expected"),
    [(5, "Recorded 5 clips"), (0, "Recorded 0 clips"), (600, "Recorded 600 clips")],
)
def test_clips_message(count: int, expected: str) -> None:
    assert clips_message(count) == expected


@pytest.mark.parametrize(
    ("clip_id", "part", "sentence"),
    [("03-027", 3, 27), ("10-005", 10, 5), ("01-060", 1, 60)],
)
def test_part_and_sentence(clip_id: str, part: int, sentence: int) -> None:
    assert part_of(clip_id) == part
    assert sentence_of(clip_id) == sentence


def test_part_and_sentence_are_ints() -> None:
    assert type(part_of("03-027")) is int
    assert type(sentence_of("03-027")) is int


@pytest.mark.parametrize(
    ("seconds", "expected"),
    [
        (7200, 2.0),
        (5400, 1.5),
        # 450 / 3600 == 0.125 exactly: a true tie, so round-half-to-even gives 0.12
        (450, 0.12),
        # 1350 / 3600 == 0.375 exactly: tie again, 8 is even, so 0.38
        (1350, 0.38),
    ],
)
def test_hours(seconds: float, expected: float) -> None:
    assert hours(seconds) == expected
