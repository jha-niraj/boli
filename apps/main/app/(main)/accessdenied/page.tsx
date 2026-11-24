import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { BoliStatus } from "@repo/brand/status/status-screen"
import { SwitchAccountButton } from "@/components/status/switch-account-button"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: "No access" }

/** The 403 screen (St3, the pasal shutter): where a page guard sends someone without the access it needs. */
export default function AccessDeniedPage() {
    return (
        <BoliStatus
            kind="forbidden"
            actions={(
                <>
                    <SwitchAccountButton />
                    <Button asChild variant="outline" className="h-10 cursor-pointer gap-2 px-5">
                        <AppLink href={ROUTES.home}><ArrowLeft className="h-4 w-4" /> Go home</AppLink>
                    </Button>
                </>
            )}
        />
    )
}
