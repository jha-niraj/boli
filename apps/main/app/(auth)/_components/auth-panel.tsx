import { Braces, Coins, MessagesSquare, Wallet } from "lucide-react"
import { PixelHimalaya } from "@/components/brand/pixel-himalaya"
import { BRAND, KURA, WELCOME_CREDITS } from "@/lib/boli"

const ROWS = [
    { icon: MessagesSquare, title: KURA.name, line: "Chat in Nepali, English or both" },
    { icon: Braces, title: "OpenAI-compatible API", line: "Point any OpenAI SDK at Boli with your own key" },
    { icon: Coins, title: `${WELCOME_CREDITS} free credits`, line: "Yours when you confirm your email" },
    { icon: Wallet, title: "Pay in NPR", line: "Top up with eSewa or Khalti" },
] as const

/**
 * The auth pages' left half (Sarvam study 1): the pixel Himalaya edge to edge with one white card on it - the tagline in
 * Instrument Serif and four rows on what Boli gives you. Light on purpose in both themes: it is an illustration.
 */
export function AuthPanel() {
    return (
        <div className="relative h-full w-full bg-boli-sky">
            <PixelHimalaya variant="panel" className="absolute inset-0 h-full w-full" />
            <div className="relative flex h-full items-center justify-center p-10 xl:p-14">
                <div className="w-full max-w-md rounded-3xl bg-white p-8 text-boli-ink shadow-[0_24px_60px_-20px_rgba(20,20,20,0.35)] ring-1 ring-black/5 xl:p-10">
                    <h2 className="font-serif text-4xl leading-[1.1] tracking-tight xl:text-[2.75rem]">{BRAND.tagline}</h2>
                    <ul className="mt-7 space-y-5">
                        {ROWS.map((r) => (
                            <li key={r.title} className="flex items-start gap-3.5">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-boli-ground text-boli-crimson-ink ring-1 ring-boli-line">
                                    <r.icon className="size-4" />
                                </span>
                                <span className="min-w-0 pt-0.5">
                                    <span className="block text-sm font-semibold">{r.title}</span>
                                    <span className="block text-sm text-boli-muted">{r.line}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
