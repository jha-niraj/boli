# Lesson 08: write the tests yourself

This lesson flips the usual workflow. `exercise.py` already has a working
looking `clip_filename`, but it has 2 bugs. There is no `test_exercise.py`:
you write the tests.

## Goal

1. Read the docstring of `clip_filename` in `exercise.py`. That is the spec.
2. Add tests to `test_mine.py`, following the comments there:
   - `@pytest.mark.parametrize` over parts 1, 9 and 10
   - `pytest.raises(ValueError)` for a bad condition
   - a custom `ext`
3. Run them. You want exactly the tests that hit the 2 bugs to go red:

   ```bash
   cd ml
   uv run pytest practice/lesson_08 -q
   ```

4. Only now fix `exercise.py`, and watch your tests go green.

Why this order: a test you never saw fail might not be testing anything.
Catching a real bug proves your test works.

When it is green, tell Claude "lesson 08 is green" so it can review both your
tests and the fix.
