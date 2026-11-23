# Learning: Python (for Boli's ml/ tooling)

## Profile
- Goal: read and write Python confidently for the eval harness, ONNX export and fine-tuning (Boli Phases 0-6)
- Knows: TypeScript / Node (comparison language)
- Level at start: new to Python
- Project: Boli, a Nepali speech platform (`ml/` folder)
- Time: part-time, about 2 building sessions + 1 solo session per week
- Machine / editor: macOS Apple Silicon / VS Code
- Style: example-first, quizzes honest, getting harder
- Mode from 2026-11-23: READING ONLY. No coding exercises; the rest of the course is condensed into 3 reading artifacts with in-page quizzes. Learner pastes the quiz summary back.
- Target version: Python 3.12 via uv (verified 2026-10-19)

## State
- stage: 3-mentor (reading mode)
- current_part: 1 of 3 (ch 3-4)
- next_step: learner reads Part 1 and pastes the quiz summary; then publish Part 2 (ch 5-8), then Part 3 (ch 9 + capstone read-through), then the inference reading

## Artifacts
- Course (Phase 0 Python): https://claude.ai/artifact/3kMYa1CJus8xH5X1yBcWRz (published under the account signed in on 2026-10-20)
- Project guide: https://claude.ai/artifact/RUjj79GpJjYEh4r7TM8HUM
- From 2026-11-23 a different Claude account is in use; the links above may not open there.
- Part 1 (ch 3-4, reading + 31 quiz questions): https://claude.ai/artifact/JX2J3n8cLzikzW723Qz6LH (source docs/artifacts/python-part-1.html)
- Part 2 (ch 5-8): not published yet
- Part 3 (ch 9 + capstone): not published yet

## Condensed plan (2026-11-23)
| Part | Covers | Status |
|---|---|---|
| 1 | Ch 3 functions + type hints, ch 4 control flow + errors + stack traces, weak-spot review | published, reading |
| 2 | Ch 5 files/paths/JSONL, ch 6 dataclasses, ch 7 modules/imports, ch 8 pytest | - |
| 3 | Ch 9 NumPy audio, reading the real audio_info / resample code | - |

## Chapters
| # | Title | Practice | Status | Quiz |
|---|---|---|---|---|
| 0 | Running Python with uv | ml/practice/lesson_00 (+ extra/) | done, extra 15/15 | 3/4, 3/4, 1/3 |
| 1 | Values, numbers and strings | ml/practice/lesson_01 (+ extra/) | done, 20/20, extra 15/15 | 2/4, 0/4, re-quiz 4/4 |
| 2 | Lists, dicts, tuples and sets | ml/practice/lesson_02 (+ extra/) | done, 11/11, extra 15/15 (code autocompleted, learned via quizzes) | 0/4, lists 1/4 2/4, dicts 0/3 4/4, tuples+sets 2/4 3/4, mixed 3/4 |
| 3 | Functions and type hints | ml/practice/lesson_03 | next | - |
| 4 | Control flow, errors and stack traces | ml/practice/lesson_04 | - | - |
| 5 | Files, paths and with | ml/practice/lesson_05 | - | - |
| 6 | Classes and dataclasses | ml/practice/lesson_06 | - | - |
| 7 | Modules, packages and imports | ml/practice/lesson_07 | - | - |
| 8 | Testing with pytest (you write the tests) | ml/practice/lesson_08 | - | - |
| 9 | NumPy: audio as numbers | ml/practice/lesson_09 | - | - |
| ★ | Capstone: audio_info + resample_to_16k_mono | ml/boli_ml/audio.py | - | - |

## Weak spots
- Running test files: thought `python3 test_file.py` needed input. Correct model: the system Python lacks the packages, and pytest is what runs `test_` functions (2026-10-21)
- f-string prefix: thought `"{name}"` without the `f` raises NameError; it prints the braces literally (2026-10-21)
- `return` ends the function, not the program (2026-10-21)
- Float precision: thought JS gives exact 32160 for 2.01*16000; both use IEEE-754 floats (2026-10-21)
- len() counts code points, not visible letters: len("नमस्ते") is 6 (2026-10-21)
- Strings are immutable: s.upper() returns a new string, s is unchanged (2026-10-21)
- "5" + 5 is a TypeError in Python, not 10 or "55" (2026-10-21)
- round(0.125, 2) is 0.12 (exact tie, to even); thought round leaves it alone (2026-10-21)
- Slicing returns str and [0:1] is one char; part number needs int(clip_id[:2]) (2026-10-21)
- Aliasing: thought b = a copies a list; both names point at the same list (2026-10-21)
- Missing dict key: thought d["x"] returns None; it raises KeyError, use .get() (2026-10-21)
- Sets: thought {"म","छ","म"} keeps duplicates; len is 2 (2026-10-21)
- Sorting strings: compared by character, so "10" < "9"; use key=int or zero-pad (2026-10-21)
- sum([]) is int 0; use sum(xs, 0.0) when the result must be float (2026-10-21)
- Learner used editor autocomplete for lesson 2 code; ask them to keep it off for practice (2026-10-22)
- max(dict) compares KEYS; for the key with the biggest value use max(d, key=d.get) (2026-10-22)
- Types of results: picked an f-string to produce an int; f-strings always return str. Use round() for float->nearest int (2026-10-21)

## Log
- 2026-10-21: Lesson 0 green (greet with an f-string), quiz 3/4. Next: Lesson 1.
- 2026-10-21: Second quiz 3/4 (missed the f prefix). Extra exercises written: practice/lesson_00/extra (4 functions, 14 tests).
- 2026-10-21: Extra 14/14 green. Review: drop commented-out raise lines, trailing spaces, use a frames variable. Bug quiz 1/3 (int truncation found; missed round() vs f-string type, and JS floats). Added 15th test (2.01 s -> 32160).
- 2026-10-21: Extra 15/15 after fixing round(seconds) * rate -> round(seconds * rate). Taught reading pytest failures and banker's rounding. Asked about format specs (:.2f).
- 2026-10-21: Lesson 1 green 20/20, clean one-liners. Review: delete commented raise lines, stale noqa. Quiz round 1 2/4 (missed len code points, ord TypeError), round 2 0/4 (immutability, str+int, round tie, slicing). Wrote practice/lesson_01/extra (5 functions, 15 tests).
- 2026-10-21: Lesson 1 extra 15/15. Re-quiz on immutability, str+int, round ties, slicing: 4/4, weak spots recovered. Habit still open: leaves commented-out stub lines (3rd reminder). Next: Lesson 2.
- 2026-10-21: Lesson 2 green 11/11, stub lines deleted (habit fixed). Review: sum([]) is int, make ValueError explicit, PEP 8 blank lines, final newline. Combined quiz 0/4 (aliasing, KeyError, sets, string sort). Wrote practice/lesson_02/extra (4 functions, 15 tests).
- 2026-10-21: Learner admitted lesson 2 code was mostly autocomplete; switched to concept quizzes. Lists round 1/4, round 1b 2/4 (aliasing trace, in-place methods return None). Dicts round 0/3 (in checks keys, looping gives keys, duplicate keys last wins).
- 2026-10-22: Dicts round 2b 4/4 (write adds/overwrites, in checks keys, items(), get default). Next: tuples and sets round.
- 2026-10-22: Tuples/sets round 3 2/4 (missed: comma makes a tuple; & is intersection not union).
- 2026-10-22: Tuples/sets round 3b 3/4 (comma tuple, unpacking, union fixed; a - b confused with symmetric difference ^).
- 2026-10-22: Mixed round 3/4 (comprehension, float sum, labels with sort all right; max(dict) thought it returns a pair). Lesson 2 closed. Next: Lesson 3.
- 2026-11-23: Switched to reading-only mode at the learner's request. Ch 3-9 condensed into 3 artifacts. Published Part 1 (ch 3-4).
