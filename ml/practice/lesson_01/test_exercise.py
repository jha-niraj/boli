import pytest

from practice.lesson_01.exercise import (
    count_words,
    describe_clip,
    is_devanagari,
    same_text,
)


@pytest.mark.parametrize(
    ("clip_id", "seconds", "expected"),
    [
        ("01-001", 4.25, "01-001: 4.25 s"),
        ("03-027", 3, "03-027: 3.00 s"),
        ("12-104", 7.456, "12-104: 7.46 s"),
    ],
)
def test_describe_clip(clip_id: str, seconds: float, expected: str) -> None:
    assert describe_clip(clip_id, seconds) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("मेरो नाम सीता हो", 4),
        ("आज meeting छ", 3),  # code-mixed English counts as words too
        ("  नमस्ते\tसाथी\n", 2),
        ("", 0),
        ("   ", 0),
    ],
)
def test_count_words(text: str, expected: int) -> None:
    assert count_words(text) == expected


@pytest.mark.parametrize(
    ("ch", "expected"),
    [
        ("क", True),
        ("ा", True),  # vowel signs live in the block too
        ("।", True),  # danda, U+0964
        ("ऀ", True),  # first code point in the block
        ("ॿ", True),  # last code point in the block
        ("ঀ", False),  # Bengali, just past the end
        ("k", False),
        ("5", False),
        (" ", False),
    ],
)
def test_is_devanagari(ch: str, expected: bool) -> None:
    assert is_devanagari(ch) is expected


def test_same_text_nukta_forms_match() -> None:
    precomposed = "क़"  # क़ as one code point
    decomposed = "क़"  # क + nukta
    assert precomposed != decomposed  # proof that == alone is not enough
    assert same_text(precomposed, decomposed)


def test_same_text_inside_a_sentence() -> None:
    assert same_text("क़लम ले लेख", "क़लम ले लेख")


def test_same_text_different_words() -> None:
    assert not same_text("कल", "काल")
