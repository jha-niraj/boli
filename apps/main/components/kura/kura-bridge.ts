'use client'

import { useEffect } from 'react'

/**
 * The link between Kura's SIDEBAR (in the shell, main-shell.tsx) and Kura's PAGE (kura-page.tsx). The sidebar's rows
 * are real links (/kura/<id>, so a middle-click opens a tab); while the Kura page is mounted, a plain click opens the
 * chat IN PLACE instead (the page's own `openConversation`, no route render), exactly as the history tab used to.
 * Off Kura, nothing is registered and the link navigates.
 */
export interface KuraBridgeHandlers {
    open: (id: string) => void
    newChat: () => void
}

let current: KuraBridgeHandlers | null = null

/** Kura's page registers its handlers while it is mounted. Pass a stable object (useMemo). */
export function useKuraBridge(handlers: KuraBridgeHandlers) {
    useEffect(() => {
        current = handlers
        return () => { if (current === handlers) current = null }
    }, [handlers])
}

/** Open a chat in the mounted Kura page. False when no Kura page is mounted (the caller navigates instead). */
export function kuraOpenInPlace(id: string): boolean {
    if (!current) return false
    current.open(id)
    return true
}

/** Start a new chat in the mounted Kura page. False when no Kura page is mounted. */
export function kuraNewInPlace(): boolean {
    if (!current) return false
    current.newChat()
    return true
}
