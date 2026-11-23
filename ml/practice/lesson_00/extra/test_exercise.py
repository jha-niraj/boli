import pytest

from practice.lesson_00.extra.exercise import (
    clip_label,
    describe_audio,
    greet_formal,
    seconds_to_frames,
)


def test_greet_formal_uses_default_honorific() -> None:
    assert greet_formal("Sita") == "नमस्ते, Sita जी!"


def test_greet_formal_with_custom_honorific() -> None:
    assert greet_formal("Ram", "दाइ") == "नमस्ते, Ram दाइ!"
    assert greet_formal("Gita", honorific="दिदी") == "नमस्ते, Gita दिदी!"


@pytest.mark.parametrize(
    ("part", "sentence", "expected"),
    [
        (3, 27, "03-027"),
        (10, 5, "10-005"),
        (1, 1, "01-001"),
        (10, 60, "10-060"),
    ],
)
def test_clip_label(part: int, sentence: int, expected: str) -> None:
    assert clip_label(part, sentence) == expected


@pytest.mark.parametrize(
    ("seconds", "sample_rate", "expected"),
    [
        (2.5, 16_000, 40_000),
        (0.5, 22_050, 11_025),
        (1.0, 44_100, 44_100),
        (0.0, 16_000, 0),
        # 2.01 * 16000 == 32159.999999999996 in floating point
        (2.01, 16_000, 32_160),
    ],
)
def test_seconds_to_frames(seconds: float, sample_rate: int, expected: int) -> None:
    assert seconds_to_frames(seconds, sample_rate) == expected


def test_seconds_to_frames_default_rate_and_type() -> None:
    frames = seconds_to_frames(2.5)
    assert frames == 40_000
    # 40000.0 == 40000 is True in Python, so check the type explicitly.
    assert type(frames) is int


@pytest.mark.parametrize(
    ("sample_rate", "seconds", "expected"),
    [
        (16_000, 2.5, "16000 Hz, 2.50 s, 40000 frames"),
        (22_050, 0.5, "22050 Hz, 0.50 s, 11025 frames"),
        (16_000, 1.234, "16000 Hz, 1.23 s, 19744 frames"),
    ],
)
def test_describe_audio(sample_rate: int, seconds: float, expected: str) -> None:
    assert describe_audio(sample_rate, seconds) == expected
