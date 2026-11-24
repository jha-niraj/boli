"use client"

import { useQuery } from "@tanstack/react-query"
import { Page } from "@repo/ui/components/ui/page"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { getJawafBot } from "@/actions/jawaf/bots.action"
import { JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import type { JawafCan } from "@/lib/jawaf/current-bot"
import type { JawafBot, JawafNotifyPrefs } from "@/types/jawaf"
import { JAWAF_PAGES } from "../../_components/jawaf-pages"
import { BotTab } from "./bot-tab"
import { ContactFieldsTab } from "./contact-fields-tab"
import { DataTab } from "./data-tab"
import { NotificationsTab } from "./notifications-tab"

export const SETTINGS_TABS = [
    { value: "bot", label: "Bot" },
    { value: "contact", label: "Contact fields" },
    { value: "notifications", label: "Notifications" },
    { value: "data", label: "Data" },
] as const
type TabId = (typeof SETTINGS_TABS)[number]["value"]
const TAB_IDS = SETTINGS_TABS.map((t) => t.value)

/** Jawaf Settings: one reading-width column, tabs on the right of the header (a dropdown below xl), synced to ?tab=. */
export function SettingsView({ bot: initialBot, initialNotify, initialTab, can }: {
    bot: JawafBot
    initialNotify: JawafNotifyPrefs
    initialTab: string | string[] | undefined
    can: JawafCan
}) {
    const [tab, setTab] = useUrlTab<TabId>(TAB_IDS, initialTab, "bot")
    const bot = useQuery({
        queryKey: JAWAF_KEYS.bot(initialBot.id),
        queryFn: async () => unwrap(await getJawafBot(initialBot.id)),
        initialData: initialBot,
    }).data ?? initialBot

    const copy = JAWAF_PAGES.settings
    return (
        <Page
            title={copy.title}
            description={copy.description}
            width="reading"
            tabs={SETTINGS_TABS.map((t) => ({ value: t.value, label: t.label }))}
            tab={tab}
            onTabChange={(v) => setTab(v as TabId)}
        >
            <div className="flex min-w-0 flex-col gap-4 pb-8">
                {!can.manage && tab !== "notifications" ? (
                    <p className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                        You can look, not change: these settings need Settings access to Jawaf. Ask the workspace owner.
                    </p>
                ) : null}
                {tab === "bot" ? <BotTab bot={bot} canManage={can.manage} /> : null}
                {tab === "contact" ? <ContactFieldsTab bot={bot} canManage={can.manage} /> : null}
                {tab === "notifications" ? <NotificationsTab botId={bot.id} initial={initialNotify} /> : null}
                {tab === "data" ? <DataTab bot={bot} canManage={can.manage} /> : null}
            </div>
        </Page>
    )
}
