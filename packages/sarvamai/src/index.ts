/**
 * @repo/sarvamai - Sarvam AI over fetch (no `sarvamai` npm SDK; Workers-safe).
 *
 * Owns: speech to text (saaras), text to speech (bulbul), translation (sarvam-translate), language detection (text-lid),
 * document OCR (doc-ai digitise jobs), and the language list.
 *
 * - Key: SARVAM_API_KEY, read at call time; every call also takes `{ apiKey }` (a Worker env binding). Check
 *   `isSarvamConfigured()` before offering a voice / OCR feature.
 * - Errors: every call THROWS an `AppError` from @repo/errors (validation / ratelimit / quota / network) whose message
 *   is safe to show; the upstream body goes to `cause` only. Wrap in `try { ok(await ...) } catch (e) { return fail(e) }`.
 * - Never log the key, the text or the audio that passes through here.
 * - `digitiseDocument` polls for up to minutes: run it from a long job (Workflow), never inline.
 *
 *   const { transcript } = await speechToText({ audio: file, mode: 'transcribe' })
 *   const { audio } = await textToSpeech({ text: 'Namaste', languageCode: 'hi-IN' })
 *   const { text } = await translate({ text: 'Hello', targetLanguage: 'hi-IN' })
 */
export { isSarvamConfigured, base64ToBytes, bytesToBase64, type SarvamAuth } from './shared'
export {
    SARVAM_LANGUAGES, TRANSLATE_ONLY_LANGUAGES, TRANSLATE_LANGUAGES, TTS_LANGUAGES,
    normaliseLanguage, languageName, hasDevanagari, type SarvamLanguage,
} from './languages'
export {
    speechToText, textToSpeech, truncateAtSentence, STT_MODEL, TTS_MODEL, STT_MAX_SECONDS, TTS_MAX_CHARS,
    type SpeechToTextMode, type SpeechToTextInput, type SpeechToTextResult, type TextToSpeechInput, type TextToSpeechResult,
} from './speech'
export {
    translate, detectLanguage, TRANSLATE_MODEL, TRANSLATE_MAX_CHARS,
    type TranslateInput, type TranslateResult, type DetectLanguageResult,
} from './translate'
export {
    digitiseDocument, submitDigitise, digitiseStatus, digitiseOutput, docxToText, sniffDocKind, docHtmlToText, DOC_MAX_PAGES, DOC_MAX_BYTES,
    type DigitiseInput, type DigitiseSubmitInput, type DigitiseJobStatus, type DigitiseResult, type DigitiseFile, type DocKind, type DocOutputFormat, type DocContentType,
} from './documents'
