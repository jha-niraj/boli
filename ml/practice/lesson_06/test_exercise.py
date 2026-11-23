import dataclasses

import pytest

from practice.lesson_06.exercise import Clip


def test_create_clip() -> None:
    clip = Clip("01-001", "मेरो नाम सीता हो", 4.25)

    assert clip.id == "01-001"
    assert clip.text == "मेरो नाम सीता हो"
    assert clip.seconds == 4.25


@pytest.mark.parametrize("seconds", [0.0, -1.5])
def test_rejects_non_positive_seconds(seconds: float) -> None:
    with pytest.raises(ValueError):
        Clip("01-001", "नमस्ते", seconds)


def test_is_frozen() -> None:
    clip = Clip("01-001", "नमस्ते", 1.5)

    with pytest.raises(dataclasses.FrozenInstanceError):
        clip.seconds = 2.0  # type: ignore[misc]


def test_equality_is_by_value() -> None:
    assert Clip("01-001", "नमस्ते", 1.5) == Clip("01-001", "नमस्ते", 1.5)


def test_words_per_second() -> None:
    clip = Clip("03-027", "आज office जानु छ", 2.0)

    assert clip.words_per_second == pytest.approx(2.0)


def test_words_per_second_fractional() -> None:
    clip = Clip("12-104", "WiFi को password के हो?", 2.5)

    assert clip.words_per_second == pytest.approx(2.0)


def test_from_dict() -> None:
    row = {"id": "03-027", "text": "आज office जानु छ", "seconds": 3.4}

    assert Clip.from_dict(row) == Clip("03-027", "आज office जानु छ", 3.4)


def test_from_dict_ignores_extra_keys_and_converts_seconds() -> None:
    row = {"id": "01-001", "text": "नमस्ते", "seconds": "2", "speaker": "s01"}

    clip = Clip.from_dict(row)

    assert clip == Clip("01-001", "नमस्ते", 2.0)
    assert isinstance(clip.seconds, float)


def test_from_dict_still_validates() -> None:
    with pytest.raises(ValueError):
        Clip.from_dict({"id": "01-001", "text": "नमस्ते", "seconds": 0})
