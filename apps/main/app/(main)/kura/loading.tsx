import { KURA } from '@repo/boli'
import { KuraPageSkeleton } from '@/components/kura/kura-skeleton'

/**
 * Painted the moment navigation to /kura starts: a NEW chat, so the welcome's shape (not a transcript) with Kura's
 * namaste bubble (F4) where the scene will sit, the real title, the composer and the side column.
 */
export default function KuraLoading() {
    return <KuraPageSkeleton title={KURA.name} variant="welcome" />
}
