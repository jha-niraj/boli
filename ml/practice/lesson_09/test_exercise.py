import math

import numpy as np
import pytest

from practice.lesson_09.exercise import (
    duration_seconds,
    peak_dbfs,
    sine_wave,
    to_mono,
)


def test_sine_wave_shape_and_dtype() -> None:
    wave = sine_wave(440, 1.0)

    assert wave.shape == (16_000,)
    assert wave.dtype == np.float32


def test_sine_wave_amplitude() -> None:
    wave = sine_wave(440, 1.0)

    assert np.abs(wave).max() == pytest.approx(0.5, abs=1e-3)


def test_sine_wave_custom_rate() -> None:
    assert sine_wave(440, 0.5, sample_rate=8_000).shape == (4_000,)


def test_sine_wave_starts_at_zero() -> None:
    assert sine_wave(440, 0.1)[0] == pytest.approx(0.0)


@pytest.mark.parametrize(
    ("shape", "sample_rate", "expected"),
    [
        ((32_000,), 16_000, 2.0),  # mono, what ASR models want
        ((44_100, 2), 44_100, 1.0),  # stereo laptop recording
        ((11_025,), 22_050, 0.5),  # a NepTel-style 22.05 kHz clip
    ],
)
def test_duration_seconds(
    shape: tuple[int, ...], sample_rate: int, expected: float
) -> None:
    samples = np.zeros(shape, dtype=np.float32)

    assert duration_seconds(samples, sample_rate) == pytest.approx(expected)


def test_to_mono_averages_channels() -> None:
    stereo = np.array([[0.2, 0.4], [1.0, 0.0], [-0.5, 0.5]])

    mono = to_mono(stereo)

    assert mono.shape == (3,)
    np.testing.assert_allclose(mono, [0.3, 0.5, 0.0])


def test_to_mono_leaves_mono_alone() -> None:
    mono = np.array([0.1, 0.2, 0.3])

    np.testing.assert_array_equal(to_mono(mono), mono)


def test_peak_dbfs_half_scale() -> None:
    assert peak_dbfs(np.array([0.5, -0.25, 0.1])) == pytest.approx(-6.0206, abs=1e-3)


def test_peak_dbfs_uses_absolute_value() -> None:
    assert peak_dbfs(np.array([0.1, -1.0])) == pytest.approx(0.0)


def test_peak_dbfs_silence() -> None:
    assert peak_dbfs(np.zeros(1_600)) == -math.inf


def test_peak_dbfs_of_sine() -> None:
    assert peak_dbfs(sine_wave(440, 1.0)) == pytest.approx(-6.02, abs=0.01)
