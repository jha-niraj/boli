import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { listMembers } from "@/actions/workspace.action"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { WORKSPACE_ROUTES } from "@/lib/workspace-routes"
import { MembersView } from "./_components/members-view"

export const metadata: Metadata = { title: "Members" }

/**
 * Account level (not inside a product): the CURRENT workspace's members and pending invitations. Any member may look;
 * only the owner invites, changes access and removes (the actions check it again).
 */
export default async function MembersPage() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${WORKSPACE_ROUTES.members}`)
    const res = await listMembers()
    if (!res.success) throw new Error(res.error ?? "The members could not be loaded.")
    return <MembersView initialData={res.data} />
}
