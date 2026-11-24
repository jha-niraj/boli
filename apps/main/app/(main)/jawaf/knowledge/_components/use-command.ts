"use client"

import * as React from "react"
import type { KnowledgeCommand } from "./knowledge-view"

/**
 * Run `handler` when the page header sends this tab a command it handles. A command that was already there when the
 * tab mounted (pressed on another tab, or before a tab switch) is ignored, so switching tabs never reopens a sheet.
 */
export function useCommand(command: KnowledgeCommand, kinds: NonNullable<KnowledgeCommand>["kind"][], handler: (kind: NonNullable<KnowledgeCommand>["kind"]) => void) {
    const seen = React.useRef(command?.n ?? 0)
    const ref = React.useRef(handler)
    React.useEffect(() => { ref.current = handler })
    React.useEffect(() => {
        if (!command || command.n === seen.current) return
        seen.current = command.n
        if (kinds.includes(command.kind)) ref.current(command.kind)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command?.n])
}
