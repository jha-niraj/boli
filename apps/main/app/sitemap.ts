import { SITE } from '@repo/core/site'
import type { MetadataRoute } from 'next'
import { DOCS_PAGES, ROUTES } from '@/lib/navigation'

/** Public pages only (the landing, About, Docs, legal, sign-up and sign-in). */
export default function sitemap(): MetadataRoute.Sitemap {
    const siteUrl = SITE.url
    const now = new Date()
    const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly'): MetadataRoute.Sitemap[number] => ({
        url: path === '/' ? siteUrl : `${siteUrl}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
    })

    return [
        page(ROUTES.landing, 1, 'weekly'),
        page(ROUTES.about, 0.8, 'monthly'),
        page(ROUTES.contact, 0.6, 'monthly'),
        page(ROUTES.docs, 0.8, 'weekly'),
        ...DOCS_PAGES.map((d) => page(ROUTES.doc(d.slug), 0.8, 'weekly')),
        page(ROUTES.signUp, 0.7, 'monthly'),
        page(ROUTES.signIn, 0.5, 'monthly'),
        page(ROUTES.terms, 0.3, 'yearly'),
        page(ROUTES.privacy, 0.3, 'yearly'),
    ]
}
