import { KURA } from '@/lib/boli'
import { KuraPageSkeleton } from '@/components/kura/kura-skeleton'

/** A saved chat loading - same skeleton as /kura (the chat title is data, so the product name stands in). */
export default function KuraConversationLoading() {
    return <KuraPageSkeleton title={KURA.name} />
}
