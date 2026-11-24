import { ArrowLeft } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { CurrentPath } from "@repo/brand/status/current-path"
import { BoliStatus } from "@repo/brand/status/status-screen"
import { ROUTES } from "@/lib/navigation"

/** A 404 outside the console (no session needed): Boli's porter at the fork, the asked-for path, back to sign in. */
export default function NotFound() {
    return (
        <BoliStatus
            kind="not-found"
            fullScreen
            path={<CurrentPath />}
            actions={(
                <Button asChild className="h-10 cursor-pointer gap-2 px-5">
                    <AppLink href={ROUTES.signIn}><ArrowLeft className="h-4 w-4" /> Back to sign in</AppLink>
                </Button>
            )}
        />
    )
}
