import subprocess
import sys
from pathlib import Path

import pytest

from practice.lesson_07.clipstats import summarise
from practice.lesson_07.clipstats.__main__ import main

ML_DIR = Path(__file__).resolve().parents[2]


def test_package_reexports_summarise() -> None:
    from practice.lesson_07.clipstats import stats

    assert summarise is stats.summarise


def test_summarise() -> None:
    result = summarise([1.5, 2.0, 3.0])

    assert result["count"] == 3
    assert result["total"] == pytest.approx(6.5)
    assert result["mean"] == pytest.approx(6.5 / 3)
    assert result["longest"] == pytest.approx(3.0)


def test_summarise_has_exactly_these_keys() -> None:
    assert set(summarise([4.25])) == {"count", "total", "mean", "longest"}


def test_summarise_empty_is_all_zeros() -> None:
    assert summarise([]) == {"count": 0, "total": 0.0, "mean": 0.0, "longest": 0.0}


def test_main() -> None:
    line = main(["4.25", "3", "2.75", "5"])

    assert line == "4 clips, 15.00 s total, mean 3.75 s, longest 5.00 s"


def test_main_no_args() -> None:
    assert main([]) == "0 clips, 0.00 s total, mean 0.00 s, longest 0.00 s"


def test_run_as_module() -> None:
    # Runs the real command line, so it also checks the __name__ == "__main__" block.
    result = subprocess.run(
        [sys.executable, "-m", "practice.lesson_07.clipstats", "1.5", "2", "3"],
        cwd=ML_DIR,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "3 clips, 6.50 s total, mean 2.17 s, longest 3.00 s"
