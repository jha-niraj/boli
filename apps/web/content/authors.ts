import type { TeamRole } from "@repo/brand/art/team/portraits"

/*
 * Authors (learned from gurukulhq's content/authors.ts): who wrote a post or a guide. Frontmatter names an id
 * (`author: boli-team`) and scripts/build-content.ts rejects an id that is not here. Framework-free apart from a type
 * import (the build script imports this file).
 *
 * The page shows the byline and a "Written by" block from this registry, and the article's JSON-LD `author` is built
 * from it (lib/schema.ts `authorSchema`): an Organization author points at the site's Organization node; a Person
 * carries jobTitle, description, knowsAbout and sameAs - the E-E-A-T signals answer engines read.
 *
 * Real people only. Never an invented name, role or profile link: a made-up author is a fabricated expertise claim.
 *
 * TODO(owner): add the real people who write here (name, role, a two-line bio, a portrait or initials, their public
 * profile links), then move posts they wrote from `boli-team` to them.
 */

export type AuthorAvatar =
    /** The Boli mark (the team, the company). */
    | { kind: "mark" }
    /** A pixel portrait from @repo/brand/art/team (one per role). */
    | { kind: "portrait"; role: TeamRole }
    /** Up to two letters on a sky disc. */
    | { kind: "initials"; text: string }

export type Author = {
    name: string
    role: string
    /** One or two sentences, facts only. */
    bio: string
    /** Organization = the team writing as the company; Person = a named human. */
    kind: "Organization" | "Person"
    avatar: AuthorAvatar
    /** Public profiles (a Person's sameAs). Absolute URLs. */
    links: readonly { label: string; href: string }[]
    /** Topics this author can speak to (a Person's knowsAbout). */
    knowsAbout: readonly string[]
}

export const AUTHORS = {
    "boli-team": {
        name: "The Boli team",
        role: "Boli, open AI for Nepal",
        bio: "The people who build Boli: we pick and test the open models, run the API and Kura, and write here about what we ship and what we measure.",
        kind: "Organization",
        avatar: { kind: "mark" },
        links: [],
        knowsAbout: ["Open language models", "Romanized Nepali", "Nepali language technology", "OpenAI-compatible APIs"],
    },
} as const satisfies Record<string, Author>

export type AuthorId = keyof typeof AUTHORS

export const AUTHOR_IDS = Object.keys(AUTHORS) as AuthorId[]

export const DEFAULT_AUTHOR: AuthorId = "boli-team"

export function isAuthorId(v: string): v is AuthorId {
    return Object.prototype.hasOwnProperty.call(AUTHORS, v)
}

/** The author for an id. Unknown ids (never, the build script checks) fall back to the team. */
export function getAuthor(id: string): Author {
    return isAuthorId(id) ? AUTHORS[id] : AUTHORS[DEFAULT_AUTHOR]
}
