import type { Metadata } from 'next'
import { KURA } from '@/lib/boli'
import { KuraRoute } from './_components/kura-route'

export const metadata: Metadata = { title: KURA.name, description: KURA.subtitle }

/** /kura - a new chat. Where people land after sign-in. */
export default function KuraNewChatPage() {
    return <KuraRoute conversationId={null} />
}
