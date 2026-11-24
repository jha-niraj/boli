import type { ReactNode } from "react"
import { MessageCircle, Mic, Send } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { DISPLAY } from "@repo/brand/type"
import { JAWAF_NOT_FOUND, JAWAF_SCRIPT_LABELS } from "@repo/boli/jawaf"
import { PixelIcon } from "@/components/public/pixel-icon"
import { SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { APP_HOST } from "@/lib/app-links"

/*
 * Small, real-looking mock-ups of Jawaf for /jawaf (owner, 2026-11-25: "show, don't tell"). Every one is an EXAMPLE
 * ("Namuna Pasal" is a sample shop, not a customer) and is drawn with divs and spans - nothing here is a control.
 * Server components; the only motion is the page's own data-reveal.
 */

export const SAMPLE_SHOP = "Namuna Pasal"
const SHADOW = "shadow-[0_1px_2px_rgba(20,20,20,0.05),0_18px_40px_-24px_rgba(20,20,20,0.3)]"

/** A customer's message, on the right. */
export function Ask({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("flex justify-end", className)}>
            <p className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-boli-ground px-3 py-1.5 text-[13px] leading-5 text-boli-ink">{children}</p>
        </div>
    )
}

/** Jawaf's reply, on the left, with an optional chip (where it came from). */
export function Reply({ children, chip, action = false }: { children: ReactNode; chip?: string; action?: boolean }) {
    return (
        <div className="grid min-w-0 gap-1.5">
            <p className="max-w-[92%] break-words text-[13px] leading-5 text-boli-ink">{children}</p>
            {chip ? (
                <span
                    className={cn(
                        "inline-flex h-6 w-fit max-w-full items-center truncate rounded-full px-2.5 text-xs",
                        action ? cn(SKY_SOFT_BG, SKY_TEXT) : "border border-boli-line bg-white text-boli-muted",
                    )}
                >
                    {chip}
                </span>
            ) : null}
        </div>
    )
}

/** The shop's avatar: its initial on the sky tint. */
function ShopBadge() {
    return <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-[500]", SKY_SOFT_BG, SKY_TEXT)}>N</span>
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Ways in                                                                                                           */
/* ---------------------------------------------------------------------------------------------------------------- */

/** The link page on a phone: the shop's header, one answer with its source, the type-or-speak bar, the address. */
export function LinkPagePhone() {
    return (
        <div className={cn("mx-auto w-full max-w-[15.5rem] rounded-[2.2rem] border-[7px] border-boli-ink bg-white p-3 font-sans", SHADOW)}>
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-boli-ink/90" />
            <div className="flex items-center gap-2 border-b border-boli-line pb-2.5">
                <ShopBadge />
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-[500] text-boli-ink">{SAMPLE_SHOP}</p>
                    <p className="truncate text-xs text-boli-muted">Ask in Nepali or English</p>
                </div>
            </div>
            <div className="grid gap-2.5 py-3">
                <Ask>Saturday khulla huncha?</Ask>
                <Reply chip="From: Opening hours">Huncha - bihana 10 baje dekhi 4 baje samma.</Reply>
                <Ask>Esewa chalcha?</Ask>
                <Reply chip="From: Your facts">Chalcha - eSewa, Khalti ra cash.</Reply>
            </div>
            <div className="flex h-9 items-center justify-between gap-2 rounded-full border border-boli-line px-3 text-xs text-boli-muted">
                <span className="truncate">Type, or hold to speak</span>
                <span className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full", SKY_SOFT_BG, SKY_TEXT)}>
                    <Mic aria-hidden strokeWidth={1.75} className="size-3.5" />
                </span>
            </div>
            <p className="mt-2.5 truncate text-center font-mono text-[11px] text-boli-muted">{APP_HOST}/j/your-name</p>
        </div>
    )
}

/** A QR-like 21 x 21 pattern: three finder squares and a fixed scatter. Decorative, not a real code. */
function FakeQr({ className }: { className?: string }) {
    const N = 21
    const cells: { x: number; y: number }[] = []
    const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            if (finder(x, y)) {
                const fx = x >= N - 7 ? x - (N - 7) : x
                const fy = y >= N - 7 ? y - (N - 7) : y
                const ring = fx === 0 || fy === 0 || fx === 6 || fy === 6
                const core = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4
                if (ring || core) cells.push({ x, y })
            } else if (x !== 7 && y !== 7 && (x * 7 + y * 13 + x * y) % 5 < 2) {
                cells.push({ x, y })
            }
        }
    }
    return (
        <svg aria-hidden viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges" className={className}>
            {cells.map((c) => (
                <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill="#141414" />
            ))}
        </svg>
    )
}

/** The A5 poster for the counter: a Dhaka top edge, the shop, the ask, the QR and the address. */
export function QrPoster() {
    return (
        <div className={cn("mx-auto w-full max-w-[14.5rem] -rotate-2 overflow-hidden rounded-md bg-white font-sans", SHADOW)} style={{ aspectRatio: "148 / 210" }}>
            <ArtRoot>
                <DhakaStrip tone="sky" scale={1.5} />
            </ArtRoot>
            <div className="flex h-full flex-col items-center px-5 pb-10 pt-4 text-center">
                <p className="text-xs text-boli-muted">{SAMPLE_SHOP}</p>
                <p className="mt-1 text-[24px] leading-[1.05] text-boli-ink" style={DISPLAY.h3}>
                    Sodhnus - <span className={SKY_TEXT}>we answer</span>
                </p>
                <div className="mt-4 w-[62%] rounded-lg bg-white p-1.5 ring-1 ring-boli-line">
                    <FakeQr className="block h-auto w-full" />
                </div>
                <p className="mt-3 text-xs leading-4 text-boli-text">Scan to ask - Nepali, Romanized or English</p>
                <p className="mt-1 truncate font-mono text-[10px] text-boli-muted">{APP_HOST}/j/your-name</p>
            </div>
        </div>
    )
}

/** A website in a browser window, with the chat bubble open in its corner. */
export function WebsiteBubble() {
    return (
        <div className={cn("mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl border border-boli-line bg-white font-sans", SHADOW)}>
            <div className="flex items-center gap-1.5 border-b border-boli-line bg-boli-ground px-3 py-2">
                {[0, 1, 2].map((i) => (
                    <span key={i} className="size-2 rounded-full bg-boli-line" />
                ))}
                <span className="ml-2 h-4 min-w-0 flex-1 truncate rounded-full bg-white px-2 text-[10px] leading-4 text-boli-muted">namunapasal.com.np</span>
            </div>
            <div className="relative h-[16.5rem] p-4">
                <div className="grid gap-2" aria-hidden>
                    <span className="h-3 w-2/5 rounded-full bg-boli-ink/80" />
                    <span className="h-2 w-4/5 rounded-full bg-boli-line" />
                    <span className="h-2 w-3/5 rounded-full bg-boli-line" />
                    <span className="mt-2 h-16 w-1/2 rounded-xl bg-boli-ground" />
                </div>
                <div className="absolute bottom-14 right-3 w-[13.5rem] rounded-2xl border border-boli-line bg-white p-3 shadow-[0_8px_24px_-12px_rgba(20,20,20,0.35)]">
                    <div className="flex items-center gap-2 border-b border-boli-line pb-2">
                        <ShopBadge />
                        <p className="truncate text-xs font-[500] text-boli-ink">{SAMPLE_SHOP}</p>
                    </div>
                    <div className="grid gap-2 pt-2">
                        <Ask>Delivery kati din ma?</Ask>
                        <Reply chip="From: Delivery policy">Valley bhitra 1 din, bahira 2 dekhi 4 din.</Reply>
                    </div>
                </div>
                <span className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-boli-ink text-white">
                    <MessageCircle aria-hidden strokeWidth={1.75} className="size-4" />
                </span>
            </div>
        </div>
    )
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Honesty: the not-found reply and the contact card, in three scripts                                              */
/* ---------------------------------------------------------------------------------------------------------------- */

type HonestScript = "devanagari" | "romanized" | "english"

const HONEST: Record<HonestScript, { q: string; name: string; phone: string; send: string }> = {
    devanagari: { q: "पार्किङ छ?", name: "नाम", phone: "फोन नम्बर", send: "पठाउनुहोस्" },
    romanized: { q: "parking cha?", name: "Naam", phone: "Phone number", send: "Pathaunus" },
    english: { q: "Is there parking?", name: "Name", phone: "Phone number", send: "Send" },
}

export const HONEST_SCRIPTS: readonly HonestScript[] = ["devanagari", "romanized", "english"]

export function NotFoundCard({ script }: { script: HonestScript }) {
    const t = HONEST[script]
    return (
        <div className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border border-boli-line bg-white p-4 font-sans sm:p-5", SHADOW)}>
            <p className={cn("text-xs", SKY_TEXT)}>{JAWAF_SCRIPT_LABELS[script]}</p>
            <Ask>{t.q}</Ask>
            <Reply>{JAWAF_NOT_FOUND[script]}</Reply>
            <div className="mt-auto grid gap-2 rounded-2xl bg-boli-ground p-3">
                <span className="flex h-8 items-center rounded-full bg-white px-3 text-xs text-boli-muted ring-1 ring-boli-line">{t.name}</span>
                <span className="flex h-8 items-center rounded-full bg-white px-3 text-xs text-boli-muted ring-1 ring-boli-line">{t.phone}</span>
                <span className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-boli-ink px-3.5 text-xs text-white">
                    {t.send} <Send aria-hidden strokeWidth={1.75} className="size-3" />
                </span>
            </div>
        </div>
    )
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* The dashboard (coming with the pilot)                                                                            */
/* ---------------------------------------------------------------------------------------------------------------- */

const INBOX: readonly { q: string; via: string; state: "answered" | "number" }[] = [
    { q: "Admission kahile khulcha?", via: "QR code", state: "answered" },
    { q: "parking cha?", via: "Link", state: "number" },
    { q: "Do you deliver to Pokhara?", via: "Website", state: "answered" },
]

const TOP: readonly { label: string; w: string }[] = [
    { label: "Fees", w: "w-[88%]" },
    { label: "Hours", w: "w-[64%]" },
    { label: "Delivery", w: "w-[46%]" },
    { label: "Location", w: "w-[30%]" },
]

/** An illustration of the dashboard: the inbox, a contact left with Jawaf and what people ask most. No real numbers. */
export function DashboardMock() {
    return (
        <div className={cn("overflow-hidden rounded-3xl border border-boli-line bg-white font-sans", SHADOW)}>
            <div className="flex items-center gap-1 overflow-hidden border-b border-boli-line px-3 py-2.5 sm:px-4">
                {(["Conversations", "Contacts", "Insights"] as const).map((t, i) => (
                    <span key={t} className={cn("inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs", i === 0 ? "bg-boli-ink text-white" : "text-boli-muted")}>
                        {t}
                    </span>
                ))}
                <span className="ml-auto hidden text-xs text-boli-muted sm:inline">Example</span>
            </div>
            <div className="grid gap-px bg-boli-line md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>div]:bg-white">
                <div className="min-w-0 divide-y divide-boli-line">
                    {INBOX.map((m) => (
                        <div key={m.q} className="flex min-w-0 items-center gap-3 px-4 py-3">
                            <PixelIcon id={m.state === "number" ? "phone" : "chat"} className="size-5" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] text-boli-ink">{m.q}</p>
                                <p className="truncate text-xs text-boli-muted">via {m.via}</p>
                            </div>
                            <span
                                className={cn(
                                    "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs",
                                    m.state === "number" ? cn(SKY_SOFT_BG, SKY_TEXT) : "border border-boli-line text-boli-muted",
                                )}
                            >
                                {m.state === "number" ? "Left a number" : "Answered"}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="min-w-0 px-4 py-4">
                    <p className="text-xs text-boli-muted">Asked most</p>
                    <div className="mt-3 grid gap-2.5">
                        {TOP.map((b) => (
                            <div key={b.label} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
                                <span className="truncate text-xs text-boli-text">{b.label}</span>
                                <span className="h-2 rounded-full bg-boli-ground">
                                    <span className={cn("block h-2 rounded-full bg-boli-sky", b.w)} />
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
