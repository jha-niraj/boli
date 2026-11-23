import pytest

from practice.lesson_04.exercise import parse_all, parse_duration


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("4.2", 4.2),
        ("4.2s", 4.2),
        (" 4.2 s ", 4.2),
        ("3", 3.0),
        ("0", 0.0),
        ("12.75 s", 12.75),
    ],
)
def test_parse_duration(text: str, expected: float) -> None:
    assert parse_duration(text) == pytest.approx(expected)


@pytest.mark.parametrize("text", ["abc", "", "s", "चार", "-1", "-0.5 s"])
def test_parse_duration_rejects(text: str) -> None:
    with pytest.raises(ValueError):
        parse_duration(text)


def test_parse_all_splits_good_and_bad() -> None:
    items = ["4.2", "abc", " 3 s ", "-2", "6.8s"]

    values, failed = parse_all(items)

    assert values == pytest.approx([4.2, 3.0, 6.8])
    assert failed == ["abc", "-2"]


def test_parse_all_empty() -> None:
    assert parse_all([]) == ([], [])
