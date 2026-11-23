"""Lesson 00 extra: return, f-strings, default arguments, number formatting.

Run:  uv run pytest practice/lesson_00/extra -q
Start with greet_formal and work down. Each one is a few lines.
"""


def greet_formal(name: str, honorific: str = "जी") -> str:
    """Return a polite Nepali greeting.

    Examples:
        greet_formal("Sita") -> "नमस्ते, Sita जी!"
        greet_formal("Ram", "दाइ") -> "नमस्ते, Ram दाइ!"

    Hint: same as greet, with a second value in the f-string. The default
    "जी" is used when the caller passes only a name.
    """
    # raise NotImplementedError("lesson 00 extra: write me")
    return f"नमस्ते, {name} {honorific}!"


def clip_label(part: int, sentence: int) -> str:
    """Return the recording-desk ID for a sentence: 2-digit part, 3-digit sentence.

    Examples:
        clip_label(3, 27) -> "03-027"
        clip_label(10, 5) -> "10-005"

    Hint: inside an f-string, {part:02d} means "an int, at least 2 digits,
    padded with zeros". Work out what to write for 3 digits.
    """
    # raise NotImplementedError("lesson 00 extra: write me")
    return f"{part:02d}-{sentence:03d}"


def seconds_to_frames(seconds: float, sample_rate: int = 16_000) -> int:
    """Return how many frames `seconds` of audio contains.

    Examples:
        seconds_to_frames(2.5) -> 40000
        seconds_to_frames(0.5, 22_050) -> 11025

    Hint: frames = seconds x sample rate. The answer must be an int, not
    40000.0. Which built-in turns a float into an int?
    """
    # raise NotImplementedError("lesson 00 extra: write me")
    return round(seconds * sample_rate)


def describe_audio(sample_rate: int, seconds: float) -> str:
    """Return a one-line summary of an audio clip.

    Examples:
        describe_audio(16000, 2.5) -> "16000 Hz, 2.50 s, 40000 frames"
        describe_audio(22050, 0.5) -> "22050 Hz, 0.50 s, 11025 frames"

    Hint: call seconds_to_frames instead of repeating the maths.
    {seconds:.2f} shows exactly 2 decimals.
    """
    # raise NotImplementedError("lesson 00 extra: write me")
    return f"{sample_rate} Hz, {seconds:.2f} s, {seconds_to_frames(seconds, sample_rate)} frames"