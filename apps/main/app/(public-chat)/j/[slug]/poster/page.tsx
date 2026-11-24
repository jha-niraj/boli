import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Download } from "lucide-react"
import { PillButton } from "@repo/brand/pill-button"
import { loadPublicBot, loadPublicBotRow } from "@/lib/jawaf/public"
import { JawafPoster } from "@/components/jawaf/public/poster"
import { PrintButton } from "@/components/jawaf/public/print-button"
import { JawafThemeRoot } from "@/components/jawaf/public/theme-root"

/**
 * The printable A5 QR poster for a public bot: /j/<slug>/poster (plan task 8). On screen: the poster on the warm ground
 * with Print and the QR downloads; printed: only the poster, exactly A5, no margins. Never indexed.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const bot = await loadPublicBotRow(slug)
    return { title: { absolute: bot ? `${bot.name} - QR poster` : "Page not found" }, robots: { index: false, follow: false } }
}

export default async function JawafPosterPage({ params }: Props) {
    const { slug } = await params
    const bot = await loadPublicBot(slug)
    if (!bot) notFound()
    return (
        // The poster is always light (it is paper).
        <JawafThemeRoot theme="light" accent={bot.accent} accentInk={bot.accentInk} className="print:min-h-0 print:bg-white">
            <style>{`@page { size: A5 portrait; margin: 0 } @media print { html, body { background: #fff !important } }`}</style>
            <div className="flex flex-col items-center gap-5 px-4 py-8 print:p-0">
                <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
                    <PrintButton />
                    <PillButton asChild variant="secondary" size="md">
                        <a href={`/j/${bot.slug}/api/qr.png?download=1&scale=24`} className="cursor-pointer">
                            <Download aria-hidden strokeWidth={1.75} /> QR as PNG
                        </a>
                    </PillButton>
                    <PillButton asChild variant="secondary" size="md">
                        <a href={`/j/${bot.slug}/api/qr.svg?download=1`} className="cursor-pointer">
                            <Download aria-hidden strokeWidth={1.75} /> QR as SVG
                        </a>
                    </PillButton>
                </div>
                <p className="max-w-md text-center text-xs text-neutral-600 print:hidden">Print on A5 paper (or A4 at 71%) with margins set to none.</p>
                {/* 148 mm is ~560 px: a phone sees it scaled to fit (zoom keeps layout and print untouched). */}
                <div className="max-sm:[zoom:0.64] print:[zoom:1]">
                    <JawafPoster bot={bot} />
                </div>
            </div>
        </JawafThemeRoot>
    )
}
