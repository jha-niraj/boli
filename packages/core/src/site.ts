/**
 * THE brand config - the one place a product's name appears. Every page title, metadata block, landing page, email
 * footer and status screen reads `SITE`, so renaming a clone is one edit here (plus the env URL).
 *
 * Framework-free: safe in a server layout, a client component, a Worker and a script. `NEXT_PUBLIC_SITE_URL` is
 * inlined into browser bundles at build; on the server it is read at module load.
 */
function siteUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
    // No fallback to a live domain (AGENTS.md section 4): a missing URL on staging must not send people to production.
    // Local dev only: localhost:3100.
    return (raw || 'http://localhost:3100').replace(/\/+$/, '');
}

export const SITE = {
    name: 'Boli',
    tagline: 'Open AI for Nepal',
    description: 'Boli runs open AI models for Nepal: chat in English, Romanized Nepali or both, and an OpenAI-compatible API with 100 free credits.',
    url: siteUrl(),
} as const;

export type Site = typeof SITE;
