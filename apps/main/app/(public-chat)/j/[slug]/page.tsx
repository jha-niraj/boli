import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { loadPublicBot, loadPublicBotRow, readVisitorId, restoreConversation, VISITOR_COOKIE } from "@/lib/jawaf/public"
import { BusinessCard } from "@/components/jawaf/public/business-card"
import { JawafCover } from "@/components/jawaf/public/cover"
import { DemoRibbon } from "@/components/jawaf/public/demo-ribbon"
import { PublicChat } from "@/components/jawaf/public/public-chat"
import { JawafThemeRoot } from "@/components/jawaf/public/theme-root"

/**
 * A business's public Jawaf page: app.bolihq.com/j/<slug> (plan/main/jawaf/jawaf-v1.md, task 8). No login, no app shell
 * (its own route group). Live bots and Boli-built demos only; anything else is the Boli 404. The server reads only the
 * bot's PUBLIC fields (lib/jawaf/public.ts) and the visitor's last conversation (HttpOnly cookie, 30 days, this path).
 */

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ src?: string | string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const bot = await loadPublicBotRow(slug)
    if (!bot) return { title: { absolute: "Page not found" }, robots: { index: false, follow: false } }
    const title = `${bot.name} - ask us anything`
    const description = `Ask ${bot.name} your questions in Nepali, Romanized Nepali or English and get an answer at once.`
    return {
        title: { absolute: title },
        description,
        // Demo bots are built from public information for a prospect: never indexed.
        robots: bot.demo ? { index: false, follow: false } : { index: true, follow: true },
        openGraph: { title, description, type: "website", url: `/j/${bot.slug}` },
        twitter: { card: "summary", title, description },
        alternates: { canonical: `/j/${bot.slug}` },
    }
}

export default async function JawafPublicPage({ params, searchParams }: Props) {
    const [{ slug }, sp, jar] = await Promise.all([params, searchParams, cookies()])
    const row = await loadPublicBotRow(slug)
    if (!row) notFound()
    const [bot, restore] = await Promise.all([loadPublicBot(slug), restoreConversation(row, readVisitorId(jar.get(VISITOR_COOKIE)?.value))])
    if (!bot) notFound()
    const src = (Array.isArray(sp.src) ? sp.src[0] : sp.src) === "qr" ? "qr" : "link"

    return (
        <JawafThemeRoot theme={bot.theme} accent={bot.accent} accentInk={bot.accentInk}>
            {bot.demo ? <DemoRibbon slug={bot.slug} /> : null}
            <JawafCover bot={bot} />
            <PublicChat bot={bot} restore={restore} src={src} card={<BusinessCard bot={bot} />} />
        </JawafThemeRoot>
    )
}
