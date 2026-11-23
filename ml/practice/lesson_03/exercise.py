"""Lesson 03: functions, default arguments, tuples.

Run:  uv run pytest practice/lesson_03 -q
"""


def frames_to_seconds(frames: int, sample_rate: int = 16_000) -> float:
    """Convert a frame count to seconds. Most ASR models want 16 kHz.

    Examples:
        frames_to_seconds(32_000) -> 2.0
        frames_to_seconds(44_100, sample_rate=44_100) -> 1.0

    Hint: a default argument works like TypeScript's `sampleRate = 16000`;
    `/` always returns a float in Python 3.
    """
    raise NotImplementedError("lesson 03: write me")


def real_time_factor(processing_seconds: float, audio_seconds: float) -> float:
    """Return processing time divided by audio length (RTF).

    RTF below 1.0 means the model is faster than real time.
    Raise ValueError if `audio_seconds` is zero or negative.

    Examples:
        real_time_factor(1.0, 4.0) -> 0.25
        real_time_factor(1.0, 0.0) -> raises ValueError

    Hint: guard first with `if ...: raise ValueError(...)`, then divide.
    """
    raise NotImplementedError("lesson 03: write me")


def split_clip_id(clip_id: str) -> tuple[int, int]:
    """Split a "PP-NNN" clip id into (part, number) as ints.

    Examples:
        split_clip_id("03-027") -> (3, 27)
        split_clip_id("12-104") -> (12, 104)

    Hint: str.split("-") plus tuple unpacking: `a, b = ...`; int("027") is 27.
    """
    raise NotImplementedError("lesson 03: write me")
