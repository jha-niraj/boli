"""Lesson 06: dataclasses.

A dataclass is like a TypeScript type plus a constructor, written for you.
`frozen=True` makes instances read-only, like `Readonly<T>`.

Run:  uv run pytest practice/lesson_06 -q
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Clip:
    id: str
    text: str
    seconds: float

    def __post_init__(self) -> None:
        """Validate right after the generated __init__ runs.

        Raise ValueError if `seconds` is zero or negative.

        Note: until you write this, every Clip(...) call raises
        NotImplementedError, so all tests in this lesson fail. Start here.
        Frozen only blocks assignment; reading self.seconds to validate is fine.

        Examples:
            Clip("01-001", "नमस्ते", 1.5) -> ok
            Clip("01-001", "नमस्ते", 0) -> raises ValueError

        Hint: an `if` and `raise ValueError(...)`; return None otherwise.
        """
        raise NotImplementedError("lesson 06: write me")

    @property
    def words_per_second(self) -> float:
        """Number of whitespace-separated words in `text` divided by `seconds`.

        Examples:
            Clip("03-027", "आज office जानु छ", 2.0).words_per_second -> 2.0

        Hint: @property lets callers write clip.words_per_second without ();
        len(self.text.split()) counts words.
        """
        raise NotImplementedError("lesson 06: write me")

    @classmethod
    def from_dict(cls, d: dict) -> "Clip":
        """Build a Clip from a manifest row like lesson 05 reads.

        Extra keys in `d` are ignored. `seconds` may arrive as an int or a
        string, so convert it to float.

        Examples:
            Clip.from_dict({"id": "01-001", "text": "नमस्ते", "seconds": 2})
                -> Clip(id="01-001", text="नमस्ते", seconds=2.0)

        Hint: a classmethod gets the class as `cls`, so return cls(...)
        like a TypeScript static factory method.
        """
        raise NotImplementedError("lesson 06: write me")
