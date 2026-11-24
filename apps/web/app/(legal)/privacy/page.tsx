import type { Metadata } from 'next'
import { pageMeta } from "@/lib/seo"
import { listLegalDocuments } from '@repo/legal/documents'
import { LegalDocumentPage } from '../_components/legal-document'

const meta = listLegalDocuments().find((d) => d.slug === 'privacy')

export const metadata: Metadata = pageMeta({
    title: meta?.title ?? 'Privacy Policy',
    description: meta?.summary ?? 'Privacy Policy for Boli.',
    path: '/privacy',
})

export default function PrivacyPage() {
    return <LegalDocumentPage slug="privacy" />
}
