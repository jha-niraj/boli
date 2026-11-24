import { ROUTES } from "@/lib/navigation"

/**
 * Jawaf's pages while Wave 1 lays the shell (plan/main/jawaf/jawaf-v1.md): each is a real page with its final title and
 * description, and a "Coming in this build" card saying what it will do. Wave 2 (tasks 7, 10) replaces the card.
 */
export type JawafPageId = "home" | "playground" | "knowledge" | "conversations" | "contacts" | "share" | "insights" | "settings" | "setup" | "data"

export interface JawafPageCopy {
    title: string
    description: string
    href: string
    /** The card's headline and line: what this page will do. */
    headline: string
    what: string
}

export const JAWAF_PAGES: Record<JawafPageId, JawafPageCopy> = {
    home: {
        title: "Jawaf",
        description: "Your business answers its customers in Nepali and English, day and night.",
        href: ROUTES.jawaf,
        headline: "Set up your answer bot",
        what: "Pick your business type, point Jawaf at your website and files, check the facts it found, then share a link, a QR code or a widget.",
    },
    playground: {
        title: "Playground",
        description: "Ask your bot questions and fix its answers.",
        href: ROUTES.jawafPlayground,
        headline: "Try your bot as a visitor",
        what: "Ask in Romanized Nepali, Devanagari or English, see the sources behind every reply, and fix an answer in one step.",
    },
    knowledge: {
        title: "Knowledge",
        description: "What your bot knows: website pages, files, facts and Q&A.",
        href: ROUTES.jawafKnowledge,
        headline: "Teach your bot your business",
        what: "Read your website, add files, Q&A and notes, and review the fact sheet drafted for you. Your facts always win over pages.",
    },
    conversations: {
        title: "Conversations",
        description: "Every conversation visitors have with your bot.",
        href: ROUTES.jawafConversations,
        headline: "Read every conversation",
        what: "An inbox of conversations on the left and the full transcript on the right, with the sources each answer used.",
    },
    contacts: {
        title: "Contacts",
        description: "People who left their name and number.",
        href: ROUTES.jawafContacts,
        headline: "Follow up on every lead",
        what: "Visitors who asked for a call back or a question your bot could not answer - with status, notes and a follow-up date.",
    },
    share: {
        title: "Share",
        description: "Your public chat page, QR code and website widget.",
        href: ROUTES.jawafShare,
        headline: "Put your bot where customers are",
        what: "A no-login chat page with your own link, a QR poster to print and one script tag for your website.",
    },
    insights: {
        title: "Insights",
        description: "What visitors ask and how well your bot answers.",
        href: ROUTES.jawafInsights,
        headline: "See what customers ask",
        what: "Top questions, questions your bot could not answer and how answers are rated, over time.",
    },
    setup: {
        title: "Set up Jawaf",
        description: "A few details, your website, then check what it found.",
        href: ROUTES.jawafSetup,
        headline: "Set up your answer bot",
        what: "Business details, the pages to read, then the facts Jawaf found for you to approve.",
    },
    data: {
        title: "Your data",
        description: "Where your bot's data lives and who reads it.",
        href: ROUTES.jawafData,
        headline: "Plain answers about your data",
        what: "Your knowledge and conversations live in Boli's database in Neon and files in Cloudflare R2. Answers come from Boli's own open models; Sarvam reads uploaded files and voice until our own models do. Deleting a bot deletes everything under it.",
    },
    settings: {
        title: "Settings",
        description: "Your bot's name, tone and contact fields.",
        href: ROUTES.jawafSettings,
        headline: "Make it sound like you",
        what: "Name, business type, tone and length of answers, the contact fields to ask for, and the look of your chat page.",
    },
}
