import { redirect } from "next/navigation"
import { BoliLogo } from "@/components/brand/boli-logo"
import { getSession } from "@/lib/session"
import { ROUTES } from "@/lib/navigation"

/**
 * The first-run flow sits outside (main): no rail, no tab bar, one card centred on the warm ground with the Boli mark
 * above it. Outside the group also means the (main) layout's "not onboarded -> /welcome" redirect can never loop. The
 * middleware already requires the session cookie here; this checks the session itself.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1`)
    return (
        <div className="flex min-h-dvh w-full flex-col items-center bg-background px-4 py-8 sm:py-12">
            <div className="mb-8 flex w-full max-w-xl justify-center sm:mb-10">
                <BoliLogo className="text-lg dark:text-white" />
            </div>
            <div className="w-full max-w-xl">{children}</div>
        </div>
    )
}
