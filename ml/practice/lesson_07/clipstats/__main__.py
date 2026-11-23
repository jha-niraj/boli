"""Command line entry point.

Run from ml/:  uv run python -m practice.lesson_07.clipstats 1.5 2 3

`python -m package` runs this file, like the "bin" entry in package.json.
"""

import sys

from practice.lesson_07.clipstats.stats import summarise  # noqa: F401 - use it in main


def main(argv: list[str]) -> str:
    """Parse durations from `argv` and return a one-line summary.

    `argv` is the arguments after the program name, all strings.

    Examples:
        main(["4.25", "3", "2.75", "5"])
            -> "4 clips, 15.00 s total, mean 3.75 s, longest 5.00 s"
        main([]) -> "0 clips, 0.00 s total, mean 0.00 s, longest 0.00 s"

    Hint: a list comprehension with float(), then summarise(), then an
    f-string with :.2f for seconds; wrap count in int() so it prints "4", not "4.0".
    """
    raise NotImplementedError("lesson 07: write me")


if __name__ == "__main__":
    print(main(sys.argv[1:]))
