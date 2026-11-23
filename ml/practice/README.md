# Python practice

Small exercises that build up to the Boli audio pipeline. Each lesson is a
folder with stubs in `exercise.py` and tests in `test_exercise.py`.

## Run one lesson

```bash
cd ml
uv run pytest practice/lesson_01 -q
```

Swap `lesson_01` for the lesson you are on. Plain `uv run pytest` only runs
`ml/tests`, so unfinished practice stubs never break the main test suite.

Useful flags:

- `-x` stops at the first failure, so you can focus on one thing at a time.
- `-k describe_clip` runs only tests whose name matches.

## Red to green

1. Run the lesson. Everything is red - every stub raises
   `NotImplementedError("lesson NN: write me")`.
2. Pick one function. Read its docstring, the examples, and the "Hint:" line.
3. Read the matching test. Tests are the spec: they show exact inputs and
   expected outputs.
4. Replace the `raise NotImplementedError(...)` line with your code.
5. Run the lesson again. Repeat until it is all green.

If you are stuck, try it in a REPL first: `uv run python`, then
`from practice.lesson_01.exercise import describe_clip`.

## When a lesson is green

Tell Claude "lesson NN is green" so it can review your code. Passing tests
mean it works; the review is about making it read like Python rather than
TypeScript written in Python.

## Lessons

| Lesson | Topic |
|---|---|
| 00 | Warm-up: run your first test |
| 01 | Strings and Unicode |
| 02 | Lists, dicts, comprehensions |
| 03 | Functions, defaults, tuples |
| 04 | Control flow and errors (plus `broken.py` to debug) |
| 05 | Files, paths, JSONL |
| 06 | Dataclasses |
| 07 | Modules and packages (`python -m`) |
| 08 | Writing your own pytest tests |
| 09 | numpy for audio |
| Capstone | `resample_to_16k_mono` in `boli_ml/audio.py`, run with `uv run pytest` |
