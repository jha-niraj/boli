"""Audio helpers used by the eval harness.

Run on a file:  uv run python -m boli_ml.audio path/to/file.wav
"""

import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AudioInfo:
    sample_rate: int  # samples per second, per channel (e.g. 16000)
    channels: int  # 1 = mono, 2 = stereo
    num_frames: int  # one frame = one sample from every channel
    duration_seconds: float


def audio_info(path: Path) -> AudioInfo:
    """Read the header of an audio file and describe it.

    YOUR TURN (Phase 0, exercise 1). Make `uv run pytest` pass.

    Hints:
    - `import soundfile as sf`, then `sf.info(path)` reads only the header,
      not the samples, so it is fast even for a 1-hour file.
      Look at what attributes the returned object has (try it in a REPL:
      `uv run python`, then `import soundfile as sf; help(sf.info)`).
    - duration = number of frames / sample rate. Why frames and not samples?
      A stereo file has 2 samples per frame.
    - Raise FileNotFoundError if the path does not exist, before calling
      soundfile, so the error message names our path clearly.
    """
    raise NotImplementedError("write me - see the docstring hints")


def resample_to_16k_mono(path_in: Path, path_out: Path) -> AudioInfo:
    """Convert any audio file to 16 kHz mono 16-bit WAV, the format ASR wants.

    CAPSTONE (after practice lesson 09). Make `uv run pytest` pass.
    Needs audio_info to work first, because you return audio_info(path_out).

    Examples:
        44.1 kHz stereo, 1.5 s in -> AudioInfo(16000, 1, 24000, 1.5)
        16 kHz mono in -> same audio out, still 16000 Hz, 1 channel

    Hints:
    - `sf.read(path_in)` returns (data, sample_rate). data is 2D
      (frames, channels) for stereo and 1D for mono - lesson 09's to_mono.
    - Average channels to mono before resampling: half the work, and the
      resampler only needs to handle one channel.
    - `import soxr`, then `soxr.resample(data, sr_in, 16000)`.
    - Write with `sf.write(path_out, data, 16000, subtype="PCM_16")`, then
      return audio_info(path_out) so the caller sees what actually landed.
    """
    raise NotImplementedError("write me - see the docstring hints")


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: python -m boli_ml.audio <audio-file>")
        sys.exit(2)
    info = audio_info(Path(sys.argv[1]))
    print(
        f"{info.sample_rate} Hz, {info.channels} ch, "
        f"{info.num_frames} frames, {info.duration_seconds:.2f} s"
    )


if __name__ == "__main__":
    main()
