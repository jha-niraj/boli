import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { BoliMark } from "@repo/brand/boli-mark"
import { DISPLAY, serif } from "@repo/brand/type"
import type { JawafPublicBot } from "@/types/jawaf-public"
import { BusinessLogo } from "./logo"
import { JawafQr, jawafShortLink } from "./qr"

/**
 * The printable A5 counter poster for /j/<slug>/poster: a Dhaka border, the business's logo and name, "Ask us anything"
 * in English and Nepali, the QR (-> ?src=qr, so poster conversations are counted as QR), the short link, and a quiet
 * "Powered by Boli" unless the business removed it. Exactly 148 x 210 mm when printed (print CSS in the page).
 */
export function JawafPoster({ bot }: { bot: JawafPublicBot }) {
    return (
        <article
            className="jawaf-poster relative mx-auto flex h-[210mm] w-[148mm] flex-col overflow-hidden bg-white text-neutral-900 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.25)] print:shadow-none"
            aria-label={`Poster for ${bot.name}`}
        >
            <DhakaStrip tone="sky" scale={3} tile="full" />
            {/* Sky side rules join the two Dhaka bands into one frame. */}
            <div className="flex min-h-0 flex-1 border-x-[2.5mm] border-x-boli-sky-soft">
                <div className="flex min-w-0 flex-1 flex-col items-center px-[8mm] pt-[9mm] text-center">
                    <BusinessLogo bot={bot} size={64} />
                    <p className="mt-[4mm] text-[22pt] leading-tight" style={DISPLAY.h3}>
                        {bot.name}
                    </p>
                    <p className="mt-[6mm] text-[26pt] leading-none" style={serif(420, 72, "-0.02em")}>
                        Ask us anything
                    </p>
                    <p className="mt-[2.5mm] text-[17pt] leading-snug text-neutral-800">
                        हामीलाई जे पनि सोध्नुहोस्
                    </p>
                    <div className="mt-[7mm] rounded-[5mm] border-[0.6mm] border-neutral-900 p-[3mm]">
                        <JawafQr slug={bot.slug} className="block size-[62mm]" />
                    </div>
                    <p className="mt-[4mm] text-[10.5pt] text-neutral-700">Scan with your phone camera - type or speak</p>
                    <p className="mt-[1.5mm] font-mono text-[10pt] text-neutral-900">{jawafShortLink(bot.slug)}</p>
                    <div className="mt-auto pb-[5mm]">
                        {bot.brandingRemoved ? null : (
                            <p className="flex items-center gap-1.5 text-[8.5pt] text-neutral-500">
                                <BoliMark px={12} /> Powered by Boli
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <DhakaStrip tone="sky" scale={3} tile="full" />
        </article>
    )
}
