import type { Metadata } from 'next'
import { KURA } from '@/lib/boli'
import { KuraRoute } from '../_components/kura-route'

export const metadata: Metadata = { title: KURA.name }

/** /kura/<id> - one saved chat, with its settings. */
export default async function KuraConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
    const { conversationId } = await params
    return <KuraRoute conversationId={conversationId} />
}
