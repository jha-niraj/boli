/**
 * Which script a visitor wrote in, and a rough Romanized -> Devanagari transliteration for a second retrieval pass.
 * Pure functions, no I/O.
 *
 * Detection: Devanagari letters vs Latin letters; Latin text is Romanized Nepali when enough of its words are on a list
 * of common Romanized Nepali words (question words, verbs, particles, postpositions). Mixed = both scripts present in
 * strength, or Romanized Nepali with many English content words.
 *
 * Transliteration: a greedy rule table (ITRANS-like, tuned for how people actually type Nepali: "chha"/"xa" = छ,
 * "garnu" = गर्नु). It is NOT a model (IndicXlit is PyTorch, not practical in a Worker): it gets common words right
 * and the rest close enough for trigram / embedding matching. Used only as an extra query, never shown to anyone.
 */
import type { JawafScript } from "@repo/boli/jawaf"

/** Common Romanized Nepali words (lower case). Several spellings of the same word on purpose. */
const ROMANIZED_NEPALI = new Set([
    // question words
    "k", "ke", "key", "kun", "kuna", "kaha", "kahan", "kata", "kati", "kasari", "kasto", "kina", "kahile", "kaile", "ko", "kosle", "kasle",
    // copulas and auxiliaries
    "cha", "chha", "xa", "chaina", "chhaina", "xaina", "ho", "hoina", "hun", "hunchha", "huncha", "hunxa", "hudaina", "hunna", "thiyo", "thyo",
    "bhayo", "vayo", "bhaye", "vaye", "hola", "holaa", "parcha", "parchha", "parxa", "paryo", "milcha", "milchha", "milxa", "mildaina", "sakincha",
    "sakinchha", "sakinxa", "sakchu", "sakchha", "sakinna", "garnu", "garna", "garne", "garchha", "garcha", "garxa", "gareko", "garnuhos", "garnus",
    "garnuhuncha", "dinu", "dinus", "dinuhos", "dine", "dincha", "dinchha", "dinxa", "linu", "line", "lincha", "jaanu", "janu", "jane", "jancha",
    "aaunu", "aune", "aucha", "auxa", "bhanu", "bhanne", "bhannu", "bujhna", "bujhaunu", "padhna", "padhne", "padhnu", "khulcha", "khulchha",
    "khulxa", "khulne", "banda", "lagcha", "lagchha", "lagxa", "lagne", "laagcha", "rakhnu", "rakhne", "pauna", "paune", "paincha", "painchha",
    // pronouns and honorifics
    "ma", "mero", "malai", "hami", "hamro", "hamilai", "tapai", "tapain", "tapaai", "tapaiko", "tapailai", "hajur", "hajurko", "timi", "timro", "u",
    "uni", "unko", "yo", "yaha", "yahan", "tyo", "tyaha", "yesko", "esko", "tesko", "yeslai", "eslai", "aba", "ahile", "aile", "pani", "ni", "ta",
    // postpositions and particles
    "ma", "maa", "lai", "le", "ko", "ka", "ki", "bata", "dekhi", "samma", "sanga", "sang", "ra", "ani", "tara", "ki", "re", "ra", "nai", "matra",
    "bhanda", "pachi", "pahila", "agadi", "bhitra", "bahira", "lagi", "laagi", "jasto", "anusar",
    // everyday nouns and words
    "paisa", "rupaiya", "shulka", "sulka", "bhharna", "bharna", "vharna", "din", "hapta", "mahina", "barsa", "samay", "bela", "bihana", "beluka",
    "ghar", "thau", "thaun", "thaau", "kaam", "kam", "naam", "nam", "sabai", "dherai", "thorai", "ali", "ekdam", "ramro", "naramro", "sasto",
    "mahango", "nikai", "chito", "dhilo", "aaja", "aja", "bholi", "hijo", "namaste", "dhanyabad", "dhanyabaad", "huss", "hunchha", "hajur",
    "kitab", "kakshya", "kaksha", "bidyarthi", "vidyarthi", "shikshak", "sikshak", "parikshya", "pariksha", "bibaran", "jankari", "sodhnu",
    "sodhna", "milne", "ekai", "kunai", "kehi", "kei", "sabai", "arko", "ek", "dui", "tin", "char", "paanch", "panch",
])

/** English function words: their presence alongside Romanized Nepali makes a message "mixed". */
const ENGLISH_COMMON = new Set([
    "the", "is", "are", "what", "how", "where", "when", "which", "who", "why", "do", "does", "can", "could", "you", "your", "i", "we", "my",
    "of", "for", "to", "in", "on", "and", "or", "a", "an", "it", "this", "that", "have", "has", "will", "would", "please", "there", "with",
])

export interface ScriptInfo {
    script: JawafScript
    devanagariShare: number
    /** Share of Latin words that are known Romanized Nepali. */
    romanizedShare: number
}

export function detectScript(text: string): ScriptInfo {
    let deva = 0
    let latin = 0
    for (const ch of text) {
        const c = ch.codePointAt(0) ?? 0
        if (c >= 0x0900 && c <= 0x097f) deva++
        else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++
    }
    const letters = deva + latin
    if (letters === 0) return { script: "english", devanagariShare: 0, romanizedShare: 0 }
    const devaShare = deva / letters
    const words = (text.toLowerCase().match(/[a-z]+/g) ?? [])
    const nep = words.filter((w) => ROMANIZED_NEPALI.has(w)).length
    const eng = words.filter((w) => ENGLISH_COMMON.has(w)).length
    const romShare = words.length ? nep / words.length : 0
    if (devaShare >= 0.85) return { script: "devanagari", devanagariShare: devaShare, romanizedShare: romShare }
    if (devaShare >= 0.2) return { script: "mixed", devanagariShare: devaShare, romanizedShare: romShare }
    // Latin only. Romanized Nepali when Nepali function words carry the sentence.
    if (nep >= 1 && (romShare >= 0.25 || (nep >= 2 && nep >= eng))) {
        return { script: eng >= 2 && eng >= nep ? "mixed" : "romanized", devanagariShare: devaShare, romanizedShare: romShare }
    }
    return { script: "english", devanagariShare: devaShare, romanizedShare: romShare }
}

/** Plain-language instruction for the model's reply script. */
export function scriptInstruction(script: JawafScript): string {
    switch (script) {
        case "devanagari":
            return "Write the reply in Nepali using Devanagari script (नेपाली)."
        case "romanized":
            return "Write the reply in Romanized Nepali: Nepali words typed in English letters (like \"Hamro office Kathmandu ma cha\"). Do not use Devanagari script. Do not reply in English."
        case "mixed":
            return "Reply the way the visitor wrote: a natural mix of Nepali and English in Latin letters."
        default:
            return "Write the reply in English."
    }
}

/** Whether `text` is in the expected script (used by the eval and as a post-check). */
export function scriptMatches(expected: JawafScript, text: string): boolean {
    const got = detectScript(text)
    if (expected === "devanagari") return got.devanagariShare >= 0.5
    if (expected === "english") return got.devanagariShare < 0.2 && got.script !== "romanized"
    if (expected === "romanized") return got.devanagariShare < 0.2 && (got.script === "romanized" || got.script === "mixed" || got.romanizedShare >= 0.1)
    return got.devanagariShare < 0.5
}

// ---------------------------------------------------------------------------------------------------------------------
// Romanized -> Devanagari (rough)
// ---------------------------------------------------------------------------------------------------------------------

const CONSONANTS: [string, string][] = [
    ["chh", "छ"], ["ksh", "क्ष"], ["gya", "ज्ञ"], ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"],
    ["bh", "भ"], ["sh", "श"], ["ng", "ङ"], ["k", "क"], ["g", "ग"], ["c", "क"], ["x", "छ"], ["j", "ज"], ["z", "ज"], ["t", "त"], ["d", "द"],
    ["n", "न"], ["p", "प"], ["f", "फ"], ["b", "ब"], ["m", "म"], ["y", "य"], ["r", "र"], ["l", "ल"], ["w", "व"], ["v", "व"], ["s", "स"],
    ["h", "ह"], ["q", "क"],
]
const VOWELS: [string, string, string][] = [
    // [latin, independent, matra]
    ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
    ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"],
]
const VIRAMA = "्"

/** Common words whose rule output is wrong; checked first. */
const WORDS: Record<string, string> = {
    cha: "छ", chha: "छ", xa: "छ", chaina: "छैन", chhaina: "छैन", xaina: "छैन", ho: "हो", hoina: "होइन", k: "के", ke: "के", kati: "कति",
    kaha: "कहाँ", kahan: "कहाँ", kahile: "कहिले", kaile: "कहिले", kasari: "कसरी", kina: "किन", tapai: "तपाईं", tapain: "तपाईं", hajur: "हजुर",
    hamro: "हाम्रो", mero: "मेरो", malai: "मलाई", lai: "लाई", ma: "मा", ko: "को", ra: "र", pani: "पनि", fee: "शुल्क", fees: "शुल्क",
    shulka: "शुल्क", sulka: "शुल्क", bharna: "भर्ना", vharna: "भर्ना", namaste: "नमस्ते", huncha: "हुन्छ", hunchha: "हुन्छ", hunxa: "हुन्छ",
    milcha: "मिल्छ", milchha: "मिल्छ", milxa: "मिल्छ", parcha: "पर्छ", parchha: "पर्छ", parxa: "पर्छ", garnu: "गर्नु", garna: "गर्न",
    kun: "कुन", kasto: "कस्तो", school: "विद्यालय", office: "कार्यालय", phone: "फोन", number: "नम्बर",
}

function translitWord(word: string): string {
    const w = word.toLowerCase()
    if (WORDS[w]) return WORDS[w]
    let out = ""
    let i = 0
    let prevConsonant = false
    while (i < w.length) {
        const c = CONSONANTS.find(([l]) => w.startsWith(l, i))
        if (c) {
            if (prevConsonant) out += VIRAMA
            out += c[1]
            i += c[0].length
            prevConsonant = true
            continue
        }
        const v = VOWELS.find(([l]) => w.startsWith(l, i))
        if (v) {
            out += prevConsonant ? v[2] : v[1]
            i += v[0].length
            prevConsonant = false
            continue
        }
        out += w[i]
        i++
        prevConsonant = false
    }
    return out
}

/** "fee kati ho" -> "शुल्क कति हो". Latin words only; everything else is kept. */
export function romanizedToDevanagari(text: string): string {
    return text.replace(/[A-Za-z]+/g, (m) => translitWord(m))
}
