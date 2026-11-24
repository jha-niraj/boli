import type { ReactNode } from "react"
import { PublicShell } from "@/components/public/public-shell"

/** About, Contact and Docs: the landing's nav and footer around the page. */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return <PublicShell>{children}</PublicShell>
}
