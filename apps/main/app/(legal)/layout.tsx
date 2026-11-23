import type { ReactNode } from "react"
import { PublicShell } from "@/components/public/public-shell"

/** Terms and Privacy share the public nav and footer with the landing, About and Docs. */
export default function LegalLayout({ children }: { children: ReactNode }) {
    return <PublicShell>{children}</PublicShell>
}
