"""Lesson 00: warm-up. Make one test go green.

Run:  uv run pytest practice/lesson_00 -q
"""


def greet(name: str) -> str:
    """Return a Nepali greeting for `name`.

    Examples:
        greet("Sita") -> "नमस्ते, Sita!"
        greet("Ram") -> "नमस्ते, Ram!"

    Hint: an f-string, like a JS template literal: f"...{name}...".
    """
    return f"नमस्ते, {name}!"