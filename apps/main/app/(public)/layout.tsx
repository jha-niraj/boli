import type { ReactNode } from "react"
import { PublicShell } from "@/components/public/public-shell"

/** About and Docs: the landing's nav and footer around the page. Public (middleware lists /about and /docs). */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return <PublicShell>{children}</PublicShell>
}
