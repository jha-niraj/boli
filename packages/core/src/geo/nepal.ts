/**
 * Nepal's places as plain constants: the 7 provinces, all 77 districts (each with its province) and the main cities
 * and municipalities (each with its district). Browser- and server-safe; no React. The pickers build their options
 * from here (`nepalCityOptions`, `nepalDistrictOptions`), so a spelling is fixed in one place.
 *
 * Spellings follow the names in official use (the Local Level Restructuring, 2017, and later renames: Koshi, Madhesh,
 * Gandaki, Lumbini, Karnali and Sudurpashchim provinces). The two halves of old Nawalparasi are listed by their short
 * names: Nawalpur (Nawalparasi Bardaghat Susta East, Gandaki) and Parasi (Nawalparasi Bardaghat Susta West, Lumbini);
 * the long names are search keywords. Old Rukum is Rukum East (Lumbini) and Rukum West (Karnali).
 *
 * Nepali names are given for the provinces only; district and city names in Devanagari are left out rather than
 * guessed. Note: `@repo/ui/components/ui/location-selector` still holds its own older district map (its stored values
 * read "Nawalparasi (East)" and "Eastern Rukum"); it is left as is because rows may already store those strings.
 */

export const NEPAL_PROVINCES = [
    { id: "koshi", name: "Koshi", nameNe: "कोशी" },
    { id: "madhesh", name: "Madhesh", nameNe: "मधेश" },
    { id: "bagmati", name: "Bagmati", nameNe: "बागमती" },
    { id: "gandaki", name: "Gandaki", nameNe: "गण्डकी" },
    { id: "lumbini", name: "Lumbini", nameNe: "लुम्बिनी" },
    { id: "karnali", name: "Karnali", nameNe: "कर्णाली" },
    { id: "sudurpashchim", name: "Sudurpashchim", nameNe: "सुदूरपश्चिम" },
] as const

export type NepalProvinceId = (typeof NEPAL_PROVINCES)[number]["id"]

export interface NepalDistrict {
    name: string
    province: NepalProvinceId
    /** Other names people search by. */
    aliases?: readonly string[]
}

const d = (province: NepalProvinceId, names: readonly string[]): NepalDistrict[] => names.map((name) => ({ name, province }))

/** All 77 districts, by province, alphabetical within each. */
export const NEPAL_DISTRICTS: readonly NepalDistrict[] = [
    ...d("koshi", ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"]),
    ...d("madhesh", ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"]),
    ...d("bagmati", ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"]),
    ...d("gandaki", ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi"]),
    { name: "Nawalpur", province: "gandaki", aliases: ["Nawalparasi East", "Nawalparasi (Bardaghat Susta East)"] },
    ...d("gandaki", ["Parbat", "Syangja", "Tanahun"]),
    ...d("lumbini", ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Palpa"]),
    { name: "Parasi", province: "lumbini", aliases: ["Nawalparasi West", "Nawalparasi (Bardaghat Susta West)"] },
    ...d("lumbini", ["Pyuthan", "Rolpa"]),
    { name: "Rukum East", province: "lumbini", aliases: ["Eastern Rukum"] },
    ...d("lumbini", ["Rupandehi"]),
    ...d("karnali", ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu"]),
    { name: "Rukum West", province: "karnali", aliases: ["Western Rukum"] },
    ...d("karnali", ["Salyan", "Surkhet"]),
    ...d("sudurpashchim", ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"]),
]

export type NepalCityKind = "metropolitan" | "sub-metropolitan" | "municipality"

export interface NepalCity {
    name: string
    /** One of NEPAL_DISTRICTS' names. */
    district: string
    kind: NepalCityKind
    /** Other names people search by (an old name, the bazaar the municipality is known by). */
    aliases?: readonly string[]
}

const m = (name: string, district: string, aliases?: readonly string[]): NepalCity => ({ name, district, kind: "municipality", aliases })

/**
 * The 6 metropolitan and 11 sub-metropolitan cities, then the well-known municipalities (district headquarters and
 * the towns businesses are in). Not every one of the 276 municipalities: a place not listed is typed with "Other".
 */
export const NEPAL_CITIES: readonly NepalCity[] = [
    // Metropolitan cities
    { name: "Kathmandu", district: "Kathmandu", kind: "metropolitan" },
    { name: "Lalitpur", district: "Lalitpur", kind: "metropolitan", aliases: ["Patan"] },
    { name: "Pokhara", district: "Kaski", kind: "metropolitan" },
    { name: "Bharatpur", district: "Chitwan", kind: "metropolitan", aliases: ["Narayangadh", "Narayanghat"] },
    { name: "Biratnagar", district: "Morang", kind: "metropolitan" },
    { name: "Birgunj", district: "Parsa", kind: "metropolitan" },
    // Sub-metropolitan cities
    { name: "Dharan", district: "Sunsari", kind: "sub-metropolitan" },
    { name: "Itahari", district: "Sunsari", kind: "sub-metropolitan" },
    { name: "Janakpur", district: "Dhanusha", kind: "sub-metropolitan", aliases: ["Janakpurdham"] },
    { name: "Kalaiya", district: "Bara", kind: "sub-metropolitan" },
    { name: "Jitpur Simara", district: "Bara", kind: "sub-metropolitan", aliases: ["Simara"] },
    { name: "Hetauda", district: "Makwanpur", kind: "sub-metropolitan" },
    { name: "Butwal", district: "Rupandehi", kind: "sub-metropolitan" },
    { name: "Ghorahi", district: "Dang", kind: "sub-metropolitan" },
    { name: "Tulsipur", district: "Dang", kind: "sub-metropolitan" },
    { name: "Nepalgunj", district: "Banke", kind: "sub-metropolitan" },
    { name: "Dhangadhi", district: "Kailali", kind: "sub-metropolitan" },
    // Koshi
    m("Mechinagar", "Jhapa", ["Kakarbhitta"]),
    m("Birtamod", "Jhapa"),
    m("Damak", "Jhapa"),
    m("Bhadrapur", "Jhapa"),
    m("Kankai", "Jhapa", ["Surunga"]),
    m("Ilam", "Ilam"),
    m("Phidim", "Panchthar"),
    m("Dhankuta", "Dhankuta"),
    m("Inaruwa", "Sunsari"),
    m("Belbari", "Morang"),
    m("Urlabari", "Morang"),
    m("Triyuga", "Udayapur", ["Gaighat"]),
    m("Khandbari", "Sankhuwasabha"),
    m("Bhojpur", "Bhojpur"),
    // Madhesh
    m("Rajbiraj", "Saptari"),
    m("Lahan", "Siraha"),
    m("Siraha", "Siraha"),
    m("Jaleshwar", "Mahottari"),
    m("Bardibas", "Mahottari"),
    m("Malangwa", "Sarlahi"),
    m("Lalbandi", "Sarlahi"),
    m("Gaur", "Rautahat"),
    m("Chandrapur", "Rautahat"),
    // Bagmati
    m("Bhaktapur", "Bhaktapur"),
    m("Madhyapur Thimi", "Bhaktapur", ["Thimi"]),
    m("Suryabinayak", "Bhaktapur"),
    m("Kirtipur", "Kathmandu"),
    m("Budhanilkantha", "Kathmandu"),
    m("Tokha", "Kathmandu"),
    m("Chandragiri", "Kathmandu"),
    m("Tarakeshwar", "Kathmandu"),
    m("Kageshwori Manohara", "Kathmandu"),
    m("Gokarneshwar", "Kathmandu"),
    m("Mahalaxmi", "Lalitpur"),
    m("Banepa", "Kavrepalanchok"),
    m("Dhulikhel", "Kavrepalanchok"),
    m("Panauti", "Kavrepalanchok"),
    m("Ratnanagar", "Chitwan", ["Tandi", "Sauraha"]),
    m("Bidur", "Nuwakot", ["Battar"]),
    m("Nilkantha", "Dhading", ["Dhading Besi"]),
    m("Kamalamai", "Sindhuli", ["Sindhulimadi"]),
    m("Bhimeshwar", "Dolakha", ["Charikot"]),
    m("Manthali", "Ramechhap"),
    // Gandaki
    m("Gorkha", "Gorkha"),
    m("Besisahar", "Lamjung"),
    m("Byas", "Tanahun", ["Damauli"]),
    m("Putalibazar", "Syangja"),
    m("Waling", "Syangja"),
    m("Kushma", "Parbat"),
    m("Baglung", "Baglung"),
    m("Beni", "Myagdi"),
    m("Gaindakot", "Nawalpur"),
    m("Kawasoti", "Nawalpur"),
    // Lumbini
    m("Siddharthanagar", "Rupandehi", ["Bhairahawa"]),
    m("Tilottama", "Rupandehi"),
    m("Devdaha", "Rupandehi"),
    m("Lumbini Sanskritik", "Rupandehi", ["Lumbini"]),
    m("Kapilvastu", "Kapilvastu", ["Taulihawa"]),
    m("Tansen", "Palpa"),
    m("Ramgram", "Parasi"),
    m("Sunwal", "Parasi"),
    m("Bardaghat", "Parasi"),
    m("Lamahi", "Dang"),
    m("Kohalpur", "Banke"),
    m("Gulariya", "Bardiya"),
    m("Resunga", "Gulmi", ["Tamghas"]),
    m("Sandhikharka", "Arghakhanchi"),
    // Karnali
    m("Birendranagar", "Surkhet"),
    m("Bheriganga", "Surkhet"),
    m("Narayan", "Dailekh"),
    m("Chandannath", "Jumla"),
    m("Musikot", "Rukum West"),
    // Sudurpashchim
    m("Bhimdatta", "Kanchanpur", ["Mahendranagar"]),
    m("Tikapur", "Kailali"),
    m("Lamki Chuha", "Kailali"),
    m("Godawari", "Kailali"),
    m("Amargadhi", "Dadeldhura"),
    m("Dipayal Silgadhi", "Doti"),
    m("Mangalsen", "Achham"),
    m("Dasharathchand", "Baitadi"),
    m("Mahakali", "Darchula"),
]

const PROVINCE_BY_DISTRICT = new Map(NEPAL_DISTRICTS.map((x) => [x.name, x.province]))
const PROVINCE_NAME = new Map<NepalProvinceId, string>(NEPAL_PROVINCES.map((p) => [p.id, p.name]))

/** The province a district is in, or null for a name not in the list. */
export function nepalProvinceOf(district: string): NepalProvinceId | null {
    return PROVINCE_BY_DISTRICT.get(district) ?? null
}

/** "Bagmati Province", the heading the pickers group by. */
export function nepalProvinceLabel(id: NepalProvinceId): string {
    return `${PROVINCE_NAME.get(id) ?? id} Province`
}

/** The district of a listed city ("Pokhara" -> "Kaski"), or null for a typed one. */
export function nepalDistrictOfCity(city: string): string | null {
    const c = city.trim().toLowerCase()
    return NEPAL_CITIES.find((x) => x.name.toLowerCase() === c)?.district ?? null
}

/** A typed city in its listed spelling ("kathmandu " -> "Kathmandu", "Bhairahawa" -> "Siddharthanagar"); anything else trimmed. */
export function canonicalNepalCity(city: string): string {
    const c = city.trim().toLowerCase()
    if (!c) return ""
    const hit = NEPAL_CITIES.find((x) => x.name.toLowerCase() === c || x.aliases?.some((a) => a.toLowerCase() === c))
    return hit ? hit.name : city.trim()
}

/** The shape `ComboSelect` (`@repo/ui/components/ui/combo-select`) takes. Structural, so this package needs no UI. */
export interface PlaceOption {
    value: string
    label: string
    group: string
    hint?: string
    keywords?: readonly string[]
}

const provinceOrder = (id: NepalProvinceId) => NEPAL_PROVINCES.findIndex((p) => p.id === id)
const kindOrder: Record<NepalCityKind, number> = { metropolitan: 0, "sub-metropolitan": 1, municipality: 2 }

/**
 * City options grouped by province (provinces in their official order; within one, metropolitan first, then
 * sub-metropolitan, then municipalities, alphabetical). The value is the city name; the hint is its district.
 */
export function nepalCityOptions(): PlaceOption[] {
    return NEPAL_CITIES
        .map((c) => ({ c, province: nepalProvinceOf(c.district) ?? "bagmati" }))
        .sort((a, b) => provinceOrder(a.province) - provinceOrder(b.province) || kindOrder[a.c.kind] - kindOrder[b.c.kind] || a.c.name.localeCompare(b.c.name))
        .map(({ c, province }) => ({
            value: c.name,
            label: c.name,
            group: nepalProvinceLabel(province),
            hint: c.district,
            keywords: [...(c.aliases ?? []), c.kind],
        }))
}

/** District options grouped by province; the value is the district name. */
export function nepalDistrictOptions(): PlaceOption[] {
    return NEPAL_DISTRICTS
        .slice()
        .sort((a, b) => provinceOrder(a.province) - provinceOrder(b.province) || a.name.localeCompare(b.name))
        .map((x) => ({ value: x.name, label: x.name, group: nepalProvinceLabel(x.province), keywords: x.aliases }))
}
