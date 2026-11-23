from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from boli_ml.audio import AudioInfo, audio_info, resample_to_16k_mono


def write_tone(path: Path, sample_rate: int, seconds: float, channels: int) -> Path:
    # A 440 Hz sine wave; the content doesn't matter, only the header does.
    t = np.arange(int(sample_rate * seconds)) / sample_rate
    mono = 0.1 * np.sin(2 * np.pi * 440 * t)
    data = np.stack([mono] * channels, axis=1) if channels > 1 else mono
    sf.write(path, data, sample_rate, subtype="PCM_16")
    return path


@pytest.mark.parametrize(
    ("sample_rate", "seconds", "channels"),
    [
        (16_000, 2.0, 1),  # what ASR models want
        (44_100, 1.5, 2),  # typical music / laptop recording
        (22_050, 0.5, 1),  # what the NepTel files actually are
    ],
)
def test_audio_info_reads_header(
    tmp_path: Path, sample_rate: int, seconds: float, channels: int
) -> None:
    path = write_tone(tmp_path / "tone.wav", sample_rate, seconds, channels)

    info = audio_info(path)

    assert isinstance(info, AudioInfo)
    assert info.sample_rate == sample_rate
    assert info.channels == channels
    assert info.num_frames == int(sample_rate * seconds)
    assert info.duration_seconds == pytest.approx(seconds)


def test_audio_info_missing_file(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        audio_info(tmp_path / "nope.wav")


@pytest.mark.parametrize(
    ("sample_rate", "seconds", "channels"),
    [
        (44_100, 1.5, 2),  # stereo laptop recording
        (22_050, 0.5, 1),  # NepTel-style mono
        (16_000, 2.0, 1),  # already right; must survive a no-op pass
    ],
)
def test_resample_to_16k_mono(
    tmp_path: Path, sample_rate: int, seconds: float, channels: int
) -> None:
    path_in = write_tone(tmp_path / "in.wav", sample_rate, seconds, channels)
    path_out = tmp_path / "out.wav"

    info = resample_to_16k_mono(path_in, path_out)

    assert path_out.exists()
    assert info.sample_rate == 16_000
    assert info.channels == 1
    assert info.duration_seconds == pytest.approx(seconds, abs=0.01)
    # Check the file itself too, not just what the function claims.
    on_disk = sf.info(path_out)
    assert on_disk.samplerate == 16_000
    assert on_disk.channels == 1
    assert on_disk.subtype == "PCM_16"
