# Artifact brief - for a future Claude session

Point a Claude Code session at this file and say: "Read docs/ARTIFACT-BRIEF.md and build the artifacts it describes." Build them as private claude.ai Artifacts (HTML), one per section below. Do not change any other repo file.

Read these first:
- `docs/00-PROJECT-BRIEF.md` §4, §5 (hard rules, sovereignty wording)
- `docs/PLAN-phase-0-1.md` (approved plan + decisions)
- `docs/recording/` (protocol, consent form, `part-01.md` to `part-10.md`, `manifest-template.csv`)
- `docs/02-LEARNING-ROADMAP.md` Phase 0 and Phase 1
- the latest file in `docs/journal/` for current progress

## Hard rules that apply to the artifacts
- No calls to any external AI service (no speech APIs, no hosted models, no Workers AI). The pages are static tools.
- Recorded audio must **never** be uploaded anywhere: it stays in the browser and is only offered as a download. Recordings are a consented test set, see `docs/recording/CONSENT.md`.
- Use hyphens, never em-dashes, in all copy.
- Don't claim "data stays in Nepal" anywhere (brief §5).

## Artifact 1 - Recording studio

Purpose: the owner and a few speakers record the own eval set from the scripts in `docs/recording/part-NN.md`.

- Embed the sentences from all 10 parts as data in the page, each with its ID (`NN-MMM`) and part theme. Re-read the part files at build time, because the owner may have edited sentences.
- Setup screen: speaker ID, condition (`quiet` / `noisy` / `phone`), and optional metadata from the recording README (age band, home district/region, first language). Show a short consent reminder and a link-free summary of `CONSENT.md`; recording is blocked until the speaker ticks "I have signed the consent form".
- Studio screen: one sentence at a time in large Devanagari text (use a font that renders Devanagari well, e.g. Noto Sans Devanagari from Google Fonts), with its ID, position in the part and the next sentence previewed.
  - Record / stop / re-record per sentence with the browser mic (`MediaRecorder`; capture mono, keep the browser's native rate and note it).
  - Playback of the take, a level meter, and keyboard shortcuts (space = record/stop, right arrow = next, R = redo).
  - Mark a sentence as skipped with a note (e.g. "sentence sounds unnatural").
- Export per part:
  - one audio file per sentence named `partNN_<speakerID>_<condition>_<utteranceID>.<ext>`, delivered as a zip if a client-side zip library is used (e.g. JSZip from cdnjs), otherwise individual downloads
  - a CSV matching `docs/recording/manifest-template.csv` (`utterance_id,part,text,speaker_id,condition,audio_file,start_s,end_s,notes`)
- Progress per part survives a page reload (browser storage for progress and metadata only, never the audio itself if that is impractical; say so in the UI).
- Tell the user where the files go next: `ml/eval/datasets/own/raw/` (git-ignored).

## Artifact 2 - Plan and learning tracker

Purpose: one page for the owner to see where Phase 0 and Phase 1 stand and what to learn next.

- Checklist from `docs/PLAN-phase-0-1.md`, grouped by phase, with the 🎓 owner learning tasks visually distinct. Tick state is remembered (a runtime capability for shared state is preferred over browser storage; load the `artifact-capabilities` skill to decide).
- Pre-tick items that the latest journal shows as done.
- A "Decisions" panel (the decisions table) and a "Risks" panel (the five risks from the first planning session: contaminated or tiny eval sets, licenses narrowing the model list, the unproven TypeScript/ONNX serving path with CPU-only sherpa-onnx-node, real-world WER of about 35-40%, macOS/Python toolchain friction).
- A "Learning" panel per phase: concepts, the functions the owner writes, resources with links, and the "you know it when" check from the roadmap.
- A "Model and license" table from the 2026-10-19 verification (once `LICENSES.md` exists, read it instead): model, type, license, commercial verdict, status (candidate / reference-only / excluded).

## Already built (2026-10-20)
Both artifacts exist. Update them in place by passing the URL as `url`; read each one first.
- Boli Field Guide (Artifact 2 plus flowcharts, glossary, datasets): https://claude.ai/artifact/RUjj79GpJjYEh4r7TM8HUM. Source: `docs/artifacts/field-guide.html`. Checklist ticks are in its db, at `checklist/phase-0-1`.
- Boli Recording Desk (Artifact 1, teleprompter only, because artifacts get no microphone access): https://claude.ai/artifact/WDJj7WHKXWAK46KsoUpj73. Rebuild with `python3 docs/artifacts/build_recording_desk.py` after editing part files. Its db collections are `progress`, `speakers` and `flags`; read `flags` to fix the scripts.
- Boli Python Course (Phase 0 lessons, quizzes and practice): https://claude.ai/artifact/3kMYa1CJus8xH5X1yBcWRz. Source: `docs/artifacts/python-course.html`. Practice files are in `ml/practice/`. Lesson progress is in its db at `progress/phase-0`.

## Status when this brief was written (2026-10-19)
- Recording scripts in `docs/recording/` were being drafted; check they exist and that the owner has reviewed them before building Artifact 1.
- Owner is on Phase 0 exercise 1 (`ml/boli_ml/audio.py`, `audio_info`).
