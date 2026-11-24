// @repo/webdata - a small robots.txt reader: fetch a site's rules for `User-agent: *` (or a named agent) and check a
// path against them (longest match wins, Allow beats Disallow on a tie; `*` and `$` supported). Fails OPEN: a missing,
// unreachable or broken robots.txt allows everything, like every well-behaved crawler.

export interface RobotsRules {
    allow: string[]
    disallow: string[]
    /** The file was found and parsed. */
    found: boolean
}

const EMPTY: RobotsRules = { allow: [], disallow: [], found: false }

/** Parse a robots.txt body for `agent` (falls back to the `*` group). */
export function parseRobots(body: string, agent = '*'): RobotsRules {
    const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = []
    let current: { agents: string[]; allow: string[]; disallow: string[] } | null = null
    let lastWasAgent = false
    for (const raw of body.split(/\r?\n/)) {
        const line = raw.replace(/#.*$/, '').trim()
        if (!line) continue
        const idx = line.indexOf(':')
        if (idx === -1) continue
        const field = line.slice(0, idx).trim().toLowerCase()
        const value = line.slice(idx + 1).trim()
        if (field === 'user-agent') {
            if (!current || !lastWasAgent) {
                current = { agents: [], allow: [], disallow: [] }
                groups.push(current)
            }
            current.agents.push(value.toLowerCase())
            lastWasAgent = true
            continue
        }
        lastWasAgent = false
        if (!current) continue
        if (field === 'allow' && value) current.allow.push(value)
        if (field === 'disallow' && value) current.disallow.push(value)
    }
    const a = agent.toLowerCase()
    const named = groups.filter((g) => g.agents.some((x) => x !== '*' && a.includes(x)))
    const pick = named.length ? named : groups.filter((g) => g.agents.includes('*'))
    return { allow: pick.flatMap((g) => g.allow), disallow: pick.flatMap((g) => g.disallow), found: true }
}

function patternMatch(pattern: string, path: string): number {
    const anchored = pattern.endsWith('$')
    const body = anchored ? pattern.slice(0, -1) : pattern
    const re = new RegExp('^' + body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''))
    return re.test(path) ? pattern.length : -1
}

/** Whether `pathWithQuery` (`/fees?x=1`) may be fetched under `rules`. */
export function robotsAllows(rules: RobotsRules, pathWithQuery: string): boolean {
    let best = -1
    let allowed = true
    for (const p of rules.disallow) {
        const n = patternMatch(p, pathWithQuery)
        if (n > best) { best = n; allowed = false }
    }
    for (const p of rules.allow) {
        const n = patternMatch(p, pathWithQuery)
        if (n >= best && n >= 0) { best = n; allowed = true }
    }
    return allowed
}

/** Fetch and parse `<origin>/robots.txt` (5 s timeout). Never throws: no file = no rules. */
export async function fetchRobots(siteUrl: string, agent = '*'): Promise<RobotsRules> {
    try {
        const origin = new URL(siteUrl).origin
        const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000), redirect: 'follow' })
        if (!res.ok) return EMPTY
        const type = res.headers.get('content-type') ?? ''
        if (type && !type.includes('text/plain') && !type.includes('text/')) return EMPTY
        return parseRobots((await res.text()).slice(0, 500_000), agent)
    } catch {
        return EMPTY
    }
}
