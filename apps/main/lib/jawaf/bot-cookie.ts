/**
 * The current Jawaf bot, per browser: a plain cookie holding the bot id (plan/main/jawaf/jawaf-v1.md task 7). Written by
 * the sidebar's bot switcher and by onboarding when a bot is created; read by every Jawaf page on the server
 * (lib/jawaf/current-bot.ts). Not httpOnly on purpose: the switcher writes it, then refreshes the page, so switching
 * keeps you on the same Jawaf page. It is only a hint - the server checks the id belongs to the current workspace and
 * falls back to the workspace's first bot.
 *
 * Browser-safe (no server imports).
 */
export const JAWAF_BOT_COOKIE = "boli_jawaf_bot"

/** Remember `botId` as the current bot (a year). `null` clears it. */
export function setCurrentJawafBot(botId: string | null): void {
    try {
        document.cookie = botId
            ? `${JAWAF_BOT_COOKIE}=${encodeURIComponent(botId)}; path=/; max-age=31536000; samesite=lax`
            : `${JAWAF_BOT_COOKIE}=; path=/; max-age=0; samesite=lax`
    } catch { /* cookies blocked: the server falls back to the first bot */ }
}
