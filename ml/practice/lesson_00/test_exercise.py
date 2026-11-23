import pytest

from practice.lesson_00.exercise import greet


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Sita", "नमस्ते, Sita!"),
        ("राम", "नमस्ते, राम!"),
    ],
)
def test_greet(name: str, expected: str) -> None:
    assert greet(name) == expected
