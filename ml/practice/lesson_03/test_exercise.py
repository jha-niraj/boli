import pytest

from practice.lesson_03.exercise import (
    frames_to_seconds,
    real_time_factor,
    split_clip_id,
)


def test_frames_to_seconds_default_rate() -> None:
    assert frames_to_seconds(32_000) == pytest.approx(2.0)


@pytest.mark.parametrize(
    ("frames", "sample_rate", "expected"),
    [
        (44_100, 44_100, 1.0),
        (11_025, 22_050, 0.5),
        (68_000, 16_000, 4.25),
    ],
)
def test_frames_to_seconds_custom_rate(
    frames: int, sample_rate: int, expected: float
) -> None:
    assert frames_to_seconds(frames, sample_rate) == pytest.approx(expected)


def test_frames_to_seconds_keyword() -> None:
    assert frames_to_seconds(frames=8_000, sample_rate=8_000) == pytest.approx(1.0)


def test_frames_to_seconds_returns_float() -> None:
    assert isinstance(frames_to_seconds(16_000), float)


def test_real_time_factor() -> None:
    assert real_time_factor(1.0, 4.0) == pytest.approx(0.25)
    assert real_time_factor(6.0, 3.0) == pytest.approx(2.0)


@pytest.mark.parametrize("audio_seconds", [0.0, -2.5])
def test_real_time_factor_rejects_bad_audio(audio_seconds: float) -> None:
    with pytest.raises(ValueError):
        real_time_factor(1.0, audio_seconds)


@pytest.mark.parametrize(
    ("clip_id", "expected"),
    [
        ("03-027", (3, 27)),
        ("01-001", (1, 1)),
        ("12-104", (12, 104)),
    ],
)
def test_split_clip_id(clip_id: str, expected: tuple[int, int]) -> None:
    assert split_clip_id(clip_id) == expected
