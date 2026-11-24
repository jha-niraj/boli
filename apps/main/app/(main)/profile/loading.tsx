import { PageSkeleton } from '@repo/ui/components/ui/page'
import { ProfileSkeleton } from './_components/profile-skeleton'

/** Same header as the page (title, one-line description, four tabs), the Profile tab's card below. */
export default function Loading() {
    return (
        <PageSkeleton title="Profile" description="Your details, password, devices and account." icon={false} tabs={4} width="reading">
            <ProfileSkeleton />
        </PageSkeleton>
    )
}
