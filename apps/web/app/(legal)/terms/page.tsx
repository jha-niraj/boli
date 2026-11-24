import type { Metadata } from 'next'
import { pageMeta } from "@/lib/seo"
import { listLegalDocuments } from '@repo/legal/documents'
import { LegalDocumentPage } from '../_components/legal-document'

const meta = listLegalDocuments().find((d) => d.slug === 'terms')

export const metadata: Metadata = pageMeta({
    title: meta?.title ?? 'Terms of Service',
    description: meta?.summary ?? 'Terms of Service for Boli.',
    path: '/terms',
})

export default function TermsPage() {
    return <LegalDocumentPage slug="terms" />
}
