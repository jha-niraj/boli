import { notFound } from "next/navigation"
import { ArtSection } from "./_art/art-section"
import { DesignTabs } from "./_components/design-tabs"
import { isDesignTab, type DesignTab } from "./_components/tabs-config"
import { FinalSection } from "./_parts/final-section"
import { ScreensSection } from "./_parts/screens-section"

/** Localhost-only brand review. Tabs: Final (default, the decided system), Art, Screens (`?tab=`). */
export default async function DesignPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
    if (process.env.NODE_ENV !== "development") notFound()
    const { tab } = await searchParams
    const first = Array.isArray(tab) ? tab[0] : tab
    const initialTab: DesignTab = isDesignTab(first) ? first : "final"

    return (
        <DesignTabs
            initialTab={initialTab}
            panels={{
                final: <FinalSection />,
                art: <ArtSection />,
                screens: <ScreensSection />,
            }}
        />
    )
}
