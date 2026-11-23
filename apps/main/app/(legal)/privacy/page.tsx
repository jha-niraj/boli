import type { Metadata } from 'next'
import { listLegalDocuments } from '@repo/legal/documents'
import { LegalDocumentPage } from '../_components/legal-document'

const meta = listLegalDocuments().find((d) => d.slug === 'privacy')

export const metadata: Metadata = {
    title: meta?.title ?? 'Privacy Policy',
    alternates: { canonical: '/privacy' },
    description: meta?.summary,
}

export default function PrivacyPage() {
    return <LegalDocumentPage slug="privacy" />
}
