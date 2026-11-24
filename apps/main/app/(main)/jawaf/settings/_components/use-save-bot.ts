"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@repo/ui/components/ui/toast"
import { updateJawafBot } from "@/actions/jawaf/bots.action"
import { JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import type { UpdateJawafBotInput } from "@/schemas/jawaf"

/** Save part of the bot (only what changed). The server checks the Settings level; the screen hides Save without it. */
export function useSaveBot(botId: string) {
    const queryClient = useQueryClient()
    const router = useRouter()
    return useMutation({
        mutationFn: async (patch: Omit<UpdateJawafBotInput, "botId">) => unwrap(await updateJawafBot({ botId, ...patch }), "Your changes could not be saved."),
        onSuccess: async (bot, patch) => {
            queryClient.setQueryData(JAWAF_KEYS.bot(botId), bot)
            toast.success("Saved")
            // The name shows in the sidebar switcher.
            if (patch.name !== undefined) {
                await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.switcher })
                router.refresh()
            }
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Your changes could not be saved."),
    })
}

