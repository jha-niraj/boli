import { Suspense, type ReactNode } from "react"
import { Clock, ExternalLink, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { BoliMark } from "@repo/brand/boli-mark"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { geocode, osmEmbedUrl, osmLink } from "@/lib/jawaf/geocode"
import { WEB } from "@/lib/web-links"
import type { JawafPublicBot, JawafPublicSection } from "@/types/jawaf-public"

/**
 * The business card beside the chat (right column on desktop, the About sheet on a phone). Server component: built from
 * the APPROVED fact sections and the owner's custom sections (lib/jawaf/public.ts), so nothing unreviewed shows. The
 * map is its own Suspense block (it geocodes the public address) so it never holds the page.
 *
 * Rich text is sanitised on the server (lib/jawaf/public-html.ts allowlist) and rendered with `rte-output`.
 */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/** The rte-output look, scoped here (the class has no global rules in this app). */
export const RTE = "rte-output text-sm leading-6 text-neutral-700 dark:text-neutral-300 [&_a]:text-boli-sky-ink [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h4]:mt-2 [&_h4]:font-semibold [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-semibold [&_table]:w-full [&_td]:border-t [&_td]:border-neutral-200 [&_td]:py-1 [&_td]:pr-2 [&_th]:py-1 [&_th]:pr-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 dark:[&_td]:border-neutral-800"

function Block({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
    return (
        <section className="flex min-w-0 flex-col gap-2 border-t border-neutral-200 px-5 py-4 first:border-t-0 dark:border-neutral-800">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {icon}
                {title}
            </h2>
            {children}
        </section>
    )
}

function Row({ href, icon, children, external }: { href: string; icon: ReactNode; children: ReactNode; external?: boolean }) {
    return (
        <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl py-1 text-sm text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
        >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-boli-sand text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{icon}</span>
            <span className="min-w-0 truncate">{children}</span>
        </a>
    )
}

async function MapFrame({ query, name }: { query: string; name: string }) {
    const point = await geocode(query)
    return (
        <div className="flex flex-col gap-2">
            {point ? (
                <iframe
                    title={`Map showing ${name}`}
                    src={osmEmbedUrl(point)}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    className="aspect-[4/3] w-full rounded-xl border border-neutral-200 bg-boli-sand dark:border-neutral-800 dark:bg-neutral-900"
                />
            ) : null}
            <a href={osmLink(query, point)} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs text-boli-sky-ink hover:underline">
                Open in map <ExternalLink aria-hidden className="size-3" />
            </a>
        </div>
    )
}

function MapBlock({ query, name }: { query: string; name: string }) {
    return (
        <Suspense fallback={<Skeleton className="aspect-[4/3] w-full rounded-xl" />}>
            <MapFrame query={query} name={name} />
        </Suspense>
    )
}

function Section({ s, name }: { s: JawafPublicSection; name: string }) {
    if (s.type === "rich_text") {
        return (
            <Block title={s.title || "More"}>
                <div className={RTE} dangerouslySetInnerHTML={{ __html: s.html }} />
            </Block>
        )
    }
    if (s.type === "gallery") {
        return (
            <Block title={s.title || "Photos"}>
                <div className="grid grid-cols-3 gap-1.5">
                    {s.images.map((src, i) => (
                        <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block cursor-pointer overflow-hidden rounded-lg bg-boli-sand dark:bg-neutral-800">
                            {/* eslint-disable-next-line @next/next/no-img-element -- owner uploads on R2 */}
                            <img src={src} alt={`${s.title || "Photo"} ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover" />
                        </a>
                    ))}
                </div>
            </Block>
        )
    }
    if (s.type === "links") {
        return (
            <Block title={s.title || "Links"}>
                <div className="flex flex-wrap gap-2">
                    {s.links.map((l) => (
                        <a
                            key={l.url}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 text-sm text-neutral-800 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                        >
                            <span className="truncate">{l.label}</span>
                            <ExternalLink aria-hidden className="size-3.5 shrink-0 text-neutral-500" />
                        </a>
                    ))}
                </div>
            </Block>
        )
    }
    return (
        <Block title={s.title || "Hours and map"} icon={<Clock aria-hidden className="size-3.5" />}>
            {s.hours.length ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {s.hours.map((h) => (
                        <div key={h.day} className="contents">
                            <dt className="text-neutral-600 dark:text-neutral-400">{DAYS[h.day]}</dt>
                            <dd className="text-right text-neutral-900 tabular-nums dark:text-neutral-100">{h.closed || !h.open || !h.close ? "Closed" : `${h.open} - ${h.close}`}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
            {s.mapQuery ? <MapBlock query={s.mapQuery} name={name} /> : null}
        </Block>
    )
}

export function PoweredByBoli() {
    return (
        <a href={WEB.home} target="_blank" rel="noopener" className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300">
            <BoliMark px={14} />
            Powered by Boli
        </a>
    )
}

export function BusinessCard({ bot }: { bot: JawafPublicBot }) {
    const c = bot.card
    const hasContact = c.phones.length || c.emails.length || c.website || c.whatsapp
    const nothing = !c.aboutHtml && !c.hoursHtml && !c.address && !hasContact && !c.socials.length && !bot.sections.length
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                {nothing ? (
                    <p className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">Ask in the chat - {bot.name} answers from its own information.</p>
                ) : null}
                {c.aboutHtml ? (
                    <Block title={`About ${bot.name}`}>
                        <div className={RTE} dangerouslySetInnerHTML={{ __html: c.aboutHtml }} />
                    </Block>
                ) : null}
                {hasContact ? (
                    <Block title="Contact">
                        <div className="flex flex-col">
                            {c.phones.map((p) => (
                                <Row key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} icon={<Phone aria-hidden className="size-3.5" />}>{p}</Row>
                            ))}
                            {c.whatsapp ? <Row href={`https://wa.me/${c.whatsapp}`} external icon={<MessageCircle aria-hidden className="size-3.5" />}>WhatsApp</Row> : null}
                            {c.emails.map((e) => (
                                <Row key={e} href={`mailto:${e}`} icon={<Mail aria-hidden className="size-3.5" />}>{e}</Row>
                            ))}
                            {c.website ? (
                                <Row href={c.website} external icon={<Globe aria-hidden className="size-3.5" />}>{c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</Row>
                            ) : null}
                        </div>
                        {c.socials.length ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {c.socials.map((s) => (
                                    <a
                                        key={s.url}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-8 cursor-pointer items-center rounded-full border border-neutral-200 px-3 text-xs text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
                                    >
                                        {s.label}
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </Block>
                ) : null}
                {c.hoursHtml ? (
                    <Block title="Hours" icon={<Clock aria-hidden className="size-3.5" />}>
                        <div className={RTE} dangerouslySetInnerHTML={{ __html: c.hoursHtml }} />
                    </Block>
                ) : null}
                {c.address ? (
                    <Block title="Address" icon={<MapPin aria-hidden className="size-3.5" />}>
                        <p className="text-sm text-neutral-800 dark:text-neutral-200">{c.address}</p>
                        {c.mapQuery ? <MapBlock query={c.mapQuery} name={bot.name} /> : null}
                    </Block>
                ) : null}
                {bot.sections.map((s) => (
                    <Section key={s.id} s={s} name={bot.name} />
                ))}
            </div>
            {bot.brandingRemoved ? null : (
                <div className="flex justify-center py-1">
                    <PoweredByBoli />
                </div>
            )}
        </div>
    )
}
