import { KURA } from '@/lib/boli'
import { KuraPageSkeleton } from '@/components/kura/kura-skeleton'

/** Painted the moment navigation to /kura starts: the real title, the transcript at the transcript's width. */
export default function KuraLoading() {
    return <KuraPageSkeleton title={KURA.name} />
}
