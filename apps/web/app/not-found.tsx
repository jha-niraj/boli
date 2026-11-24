import { ArrowLeft, Mail } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { CurrentPath } from "@repo/brand/status/current-path"
import { BoliStatus } from "@repo/brand/status/status-screen"
import { ROUTES } from "@/lib/routes"

/** The site's 404 (St1a): the porter at the fork, the asked-for path, Go home and Contact us. */
export default function NotFound() {
    return (
        <BoliStatus
            kind="not-found"
            fullScreen
            path={<CurrentPath />}
            actions={(
                <>
                    <Button asChild className="h-10 cursor-pointer gap-2 px-5">
                        <AppLink href={ROUTES.landing}><ArrowLeft className="h-4 w-4" /> Go home</AppLink>
                    </Button>
                    <Button asChild variant="outline" className="h-10 cursor-pointer gap-2 px-5">
                        <AppLink href={ROUTES.contact}><Mail className="h-4 w-4" /> Contact us</AppLink>
                    </Button>
                </>
            )}
        />
    )
}
