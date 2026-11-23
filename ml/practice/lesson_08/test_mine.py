from practice.lesson_08.exercise import clip_filename


def test_part_one_quiet() -> None:
    assert clip_filename(1, "s01", "quiet") == "part01_s01_quiet.wav"


# YOUR TURN. Add tests below until two of them fail, then fix exercise.py.
#
# 1. Use @pytest.mark.parametrize to check parts 1, 9 and 10 in one test.
#    You will need `import pytest` at the top of this file.
#    Expected names: "part01_...", "part09_...", "part10_...".
#
# 2. Use `with pytest.raises(ValueError):` to check that a condition outside
#    {"quiet", "noisy", "phone"} (say "windy") is rejected.
#
# 3. Check a custom extension, e.g. ext="flac" gives a name ending ".flac".
