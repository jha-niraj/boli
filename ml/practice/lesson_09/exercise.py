"""Lesson 09: numpy for audio.

Audio in numpy is an array of samples. Mono is 1D, shape (frames,).
Multi-channel is 2D, shape (frames, channels), which is what soundfile returns.

Run:  uv run pytest practice/lesson_09 -q
"""

import numpy as np


def sine_wave(freq_hz: float, seconds: float, sample_rate: int = 16_000) -> np.ndarray:
    """Generate a mono sine tone as float32 with amplitude 0.5.

    The result has int(seconds * sample_rate) samples.

    Examples:
        sine_wave(440, 1.0) -> shape (16000,), dtype float32, max about 0.5
        sine_wave(440, 0.5, sample_rate=8_000) -> shape (4000,)

    Hint: np.arange(n) / sample_rate gives time in seconds; then
    0.5 * np.sin(2 * np.pi * freq_hz * t), and .astype(np.float32).
    """
    raise NotImplementedError("lesson 09: write me")


def duration_seconds(samples: np.ndarray, sample_rate: int) -> float:
    """Return the duration of mono (1D) or multi-channel (2D) audio.

    Examples:
        duration_seconds(np.zeros(32_000), 16_000) -> 2.0
        duration_seconds(np.zeros((44_100, 2)), 44_100) -> 1.0

    Hint: samples.shape[0] is the frame count for both 1D and 2D arrays.
    """
    raise NotImplementedError("lesson 09: write me")


def to_mono(samples: np.ndarray) -> np.ndarray:
    """Average channels into mono. 1D input is already mono: return it as is.

    Examples:
        to_mono(np.array([[0.2, 0.4], [1.0, 0.0]])) -> array([0.3, 0.5])
        to_mono(np.array([0.1, 0.2])) -> array([0.1, 0.2])

    Hint: samples.ndim tells 1D from 2D; .mean(axis=1) averages across
    channels within each frame.
    """
    raise NotImplementedError("lesson 09: write me")


def peak_dbfs(samples: np.ndarray) -> float:
    """Return the peak level in dBFS: 20 * log10(max absolute sample).

    0 dBFS is full scale (1.0). Silence has no peak, so return -inf.

    Examples:
        peak_dbfs(np.array([0.5, -0.25])) -> about -6.02
        peak_dbfs(np.zeros(100)) -> float("-inf")

    Hint: np.abs(samples).max(), then np.log10; check for 0 before the log,
    because log10(0) only warns and you want an explicit -inf.
    """
    raise NotImplementedError("lesson 09: write me")
