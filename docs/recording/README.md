# Boli - Nepali speech evaluation set: recording protocol

We are recording about 1 hour of original Nepali speech to build a test set that no existing open speech model has seen in training. Every sentence in `part-01.md` to `part-10.md` was written fresh for this project. Please do not swap in sentences from FLEURS, OpenSLR, Common Voice, IndicVoices, Wikipedia, news sites or any other public source. If a sentence sounds wrong, rewrite it in your own words.

Before recording anyone, read and sign `CONSENT.md`.

## Equipment and conditions

- A phone or laptop microphone is fine. No studio gear needed.
- Most sessions: a quiet room. Turn off fans and the TV, close windows, and keep the mic about 20-30 cm from your mouth.
- A few sessions should be deliberately "real world": mild background noise such as a kitchen, a cafe, street sounds through a window, or a fan. Keep it mild so the speech is still clear. Label these sessions `noisy`.
- Optional: record a few sentences over a phone call (one person reads, the other records the call on their side). Label these `phone`.

Condition labels: `quiet`, `noisy`, `phone`.

## Format

- WAV is best (16-bit, 16 kHz or higher, mono if possible).
- If your phone only records m4a, that is fine. We convert everything later.
- Do not apply noise reduction, filters or "enhance" features.

## How to read

- Read naturally, at your normal speed. Do not over-enunciate or slow down for the machine.
- Before each sentence, say its number in Nepali (only the last three digits, e.g. for `03-027` say "सत्ताईस"), pause briefly, then read the sentence.
- Leave about 1 second of silence between sentences. This lets us segment the file later.
- If you stumble, just say the number and the sentence again. Do not stop or restart the file. We keep the last clean take.
- Read numbers, dates and English words the way you would naturally say them in conversation.
- One part takes about 5-8 minutes. Take a break between parts.

## Files

- One file per part per speaker.
- Naming: `partNN_speakerID_condition.wav`
  - `part01_s01_quiet.wav`
  - `part07_s03_noisy.m4a`
  - `part09_s02_phone.wav`
- Speaker IDs are `s01`, `s02`, `s03`, and so on. Never put real names in file names.

## Speaker metadata

Keep a small note (or a row in a shared sheet) for each speaker:

| Field | Example | Notes |
|---|---|---|
| speaker_id | s01 | |
| gender | F / M / other / prefer not to say | optional |
| age_band | 18-25, 26-35, 36-50, 51+ | |
| home district / region | Jhapa, Kaski, Kailali, Kathmandu... | dialect affects WER, so this matters |
| first language | Nepali, Maithili, Newar, Tamang, Bhojpuri... | |
| device | iPhone 13, Redmi laptop mic... | |

Do not record full names, phone numbers or addresses in the metadata.

## Where files go

- Send your files to the owner directly (shared drive folder, USB stick, or a direct file transfer). Do not post them in group chats or on social media.
- The owner keeps all raw audio locally in `ml/eval/datasets/own/raw/`.
- Audio is never committed to git. Suggested `.gitignore` lines:

```gitignore
ml/eval/datasets/own/raw/
*.wav
*.m4a
```

## After recording

The owner fills `manifest-template.csv` with one row per sentence: utterance ID (e.g. `01-001`), the text as actually spoken, speaker, condition, audio file and start/end times. If a speaker changed a word while reading, update the `text` column to match what they said, and add a note.

## Files in this folder

- `CONSENT.md` - consent form (English and Nepali)
- `part-01.md` to `part-10.md` - sentence scripts, about 60 sentences each
- `manifest-template.csv` - manifest header with one example row
