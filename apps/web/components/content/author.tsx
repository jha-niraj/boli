import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { TeamPortrait } from "@repo/brand/art/team/team"
import { BoliAvatar } from "@repo/brand/boli-mark"
import { DISPLAY } from "@repo/brand/type"
import { getAuthor, type Author } from "@/content/authors"

/** An author's face: the Boli mark for the team, a pixel portrait, or initials on a sky disc. */
export function AuthorAvatar({ author, size = 48, className }: { author: Author; size?: number; className?: string }) {
    const a = author.avatar
    if (a.kind === "mark") return <BoliAvatar size={size} className={cn("ring-boli-line", className)} />
    if (a.kind === "portrait") {
        return (
            <ArtRoot as="span" className={cn("block shrink-0 overflow-hidden rounded-full border border-boli-line bg-white", className)} style={{ width: size, height: size }}>
                <TeamPortrait role={a.role} className="block h-full w-full" />
            </ArtRoot>
        )
    }
    return (
        <span
            aria-hidden
            className={cn("flex shrink-0 items-center justify-center rounded-full bg-boli-sky-soft text-sm font-semibold text-boli-sky-ink", className)}
            style={{ width: size, height: size }}
        >
            {a.text.slice(0, 2)}
        </span>
    )
}

/** "Written by": avatar, name, role and the short bio, after the article (gurukulhq's author block, Boli's look). */
export function AuthorBlock({ authorId, className }: { authorId: string; className?: string }) {
    const author = getAuthor(authorId)
    return (
        <section aria-label="About the author" className={cn("flex gap-4 border-t border-boli-line pt-8", className)}>
            <AuthorAvatar author={author} size={52} />
            <div className="min-w-0">
                <p className="text-xs text-boli-muted">Written by</p>
                <p className="mt-1 font-serif text-xl leading-tight text-boli-ink" style={DISPLAY.card}>
                    {author.name}
                </p>
                <p className="mt-0.5 text-xs font-[450] text-boli-sky-ink">{author.role}</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-boli-text">{author.bio}</p>
                {author.links.length ? (
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {author.links.map((l) => (
                            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer me" className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                                {l.label}
                            </a>
                        ))}
                    </p>
                ) : null}
            </div>
        </section>
    )
}
