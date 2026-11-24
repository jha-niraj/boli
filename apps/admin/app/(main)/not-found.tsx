import { Home } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { CurrentPath } from "@repo/brand/status/current-path"
import { BoliStatus } from "@repo/brand/status/status-screen"
import { ROUTES } from "@/lib/navigation"

/** A 404 inside the console: Boli's porter at the fork in the page area. */
export default function ConsoleNotFound() {
    return (
        <BoliStatus
            kind="not-found"
            path={<CurrentPath />}
            actions={(
                <Button asChild className="h-10 cursor-pointer gap-2 px-5">
                    <AppLink href={ROUTES.home}><Home className="h-4 w-4" /> Back to home</AppLink>
                </Button>
            )}
        />
    )
}
